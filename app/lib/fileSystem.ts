import { UserConfig, JournalEntry, JournalEntryWithBody } from '@/app/types';

// ---------------------------------------------------------------------------
// Platform detection
// ---------------------------------------------------------------------------

/**
 * Returns true if the browser supports the desktop File System Access API
 * (showDirectoryPicker). This is Chrome/Edge on desktop.
 */
export function isFileSystemAccessSupported(): boolean {
  return typeof window !== 'undefined' && 'showDirectoryPicker' in window;
}

/**
 * Returns true if we're running on a mobile device (Android or iOS).
 * On mobile we use OPFS (Origin Private File System) instead of the
 * directory picker, since showDirectoryPicker UX is unreliable on mobile.
 */
export function isMobile(): boolean {
  return (
    typeof navigator !== 'undefined' &&
    /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)
  );
}

/**
 * Returns true if the app can run at all — either via the desktop FSA API
 * or via OPFS on mobile. Use this instead of isFileSystemAccessSupported()
 * for the "browser not supported" gate in page.tsx.
 */
export function isAppSupported(): boolean {
  if (typeof window === 'undefined') return false;
  // Desktop: needs showDirectoryPicker
  if (isFileSystemAccessSupported()) return true;
  // Mobile: needs OPFS (navigator.storage.getDirectory)
  return (
    'storage' in navigator &&
    typeof (navigator.storage as { getDirectory?: unknown }).getDirectory === 'function'
  );
}

// ---------------------------------------------------------------------------
// Folder / storage initialisation
// ---------------------------------------------------------------------------

/**
 * On desktop: opens the OS directory picker and returns the chosen handle.
 * On mobile:  returns the OPFS root — no picker, storage is automatic and
 *             persistent across sessions.
 *
 * The returned FileSystemDirectoryHandle has an identical API surface in both
 * cases, so all read/write helpers below work unchanged.
 */
export async function openJournalFolder(): Promise<FileSystemDirectoryHandle | null> {
  if (isMobile()) {
    try {
      // OPFS — sandboxed, private, persistent, same FileSystemDirectoryHandle API
      const root = await navigator.storage.getDirectory();
      return root;
    } catch (error) {
      console.error('Error opening OPFS storage:', error);
      return null;
    }
  }

  // Desktop path — unchanged
  try {
    const handle = await window.showDirectoryPicker({
      mode: 'readwrite',
    });
    return handle;
  } catch (error) {
    console.error('Error opening folder:', error);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Config helpers — unchanged, work against both FSA and OPFS handles
// ---------------------------------------------------------------------------

export async function readConfig(handle: FileSystemDirectoryHandle): Promise<UserConfig | null> {
  try {
    const fileHandle = await handle.getFileHandle('config.json');
    const file = await fileHandle.getFile();
    const text = await file.text();
    return JSON.parse(text) as UserConfig;
  } catch {
    return null;
  }
}

export async function writeConfig(handle: FileSystemDirectoryHandle, config: UserConfig): Promise<void> {
  const fileHandle = await handle.getFileHandle('config.json', { create: true });
  const writable = await fileHandle.createWritable();
  await writable.write(JSON.stringify(config, null, 2));
  await writable.close();
}

// ---------------------------------------------------------------------------
// Entry helpers — unchanged
// ---------------------------------------------------------------------------

export async function readEntry(
  handle: FileSystemDirectoryHandle,
  date: string
): Promise<JournalEntryWithBody | null> {
  try {
    // Read metadata
    const metaHandle = await handle.getFileHandle(`${date}.json`);
    const metaFile = await metaHandle.getFile();
    const metaText = await metaFile.text();
    const metadata = JSON.parse(metaText) as JournalEntry;

    // Read body
    const bodyHandle = await handle.getFileHandle(`${date}.html`);
    const bodyFile = await bodyHandle.getFile();
    const body = await bodyFile.text();

    return {
      ...metadata,
      body,
    };
  } catch {
    return null;
  }
}

export async function writeEntry(
  handle: FileSystemDirectoryHandle,
  date: string,
  entry: JournalEntry,
  htmlBody: string
): Promise<void> {
  // Write metadata
  const metaHandle = await handle.getFileHandle(`${date}.json`, { create: true });
  const metaWritable = await metaHandle.createWritable();
  await metaWritable.write(JSON.stringify(entry, null, 2));
  await metaWritable.close();

  // Write body
  const bodyHandle = await handle.getFileHandle(`${date}.html`, { create: true });
  const bodyWritable = await bodyHandle.createWritable();
  await bodyWritable.write(htmlBody);
  await bodyWritable.close();
}

export async function deleteEntry(handle: FileSystemDirectoryHandle, date: string): Promise<void> {
  try {
    await handle.removeEntry(`${date}.json`);
  } catch (error) {
    console.error('Error deleting metadata:', error);
  }

  try {
    await handle.removeEntry(`${date}.html`);
  } catch (error) {
    console.error('Error deleting body:', error);
  }
}

export async function listEntries(
  handle: FileSystemDirectoryHandle
): Promise<Map<string, JournalEntry>> {
  const entries = new Map<string, JournalEntry>();

  for await (const entry of handle.values()) {
    if (entry.kind === 'file' && entry.name.endsWith('.json') && entry.name !== 'config.json') {
      try {
        const fileHandle = await handle.getFileHandle(entry.name);
        const file = await fileHandle.getFile();
        const text = await file.text();
        const metadata = JSON.parse(text) as JournalEntry;
        const date = entry.name.replace('.json', '');
        entries.set(date, metadata);
      } catch (error) {
        console.error(`Error reading entry ${entry.name}:`, error);
      }
    }
  }

  return entries;
}

// ---------------------------------------------------------------------------
// Export — mobile only
// ---------------------------------------------------------------------------

/**
 * Builds an in-memory zip containing the full journal:
 *   config.json
 *   YYYY-MM-DD.json  (metadata) for every entry
 *   YYYY-MM-DD.html  (body)     for every entry
 *
 * Returns a Blob that the caller can trigger a download for.
 * JSZip is loaded dynamically so it doesn't affect the initial bundle.
 */
export async function exportJournalAsZip(
  handle: FileSystemDirectoryHandle,
  entries: Map<string, JournalEntry>
): Promise<Blob> {
  // Dynamic import — only loaded when the user actually taps Export
  const JSZip = (await import('jszip')).default;
  const zip = new JSZip();

  // --- config.json ---
  try {
    const configHandle = await handle.getFileHandle('config.json');
    const configFile = await configHandle.getFile();
    zip.file('config.json', await configFile.text());
  } catch {
    // config may not exist yet for a brand-new journal — skip silently
  }

  // --- entry files ---
  // Process entries sequentially to avoid overwhelming OPFS on low-end phones
  for (const dateStr of entries.keys()) {
    try {
      const jsonHandle = await handle.getFileHandle(`${dateStr}.json`);
      const jsonFile = await jsonHandle.getFile();
      zip.file(`${dateStr}.json`, await jsonFile.text());
    } catch {
      console.warn(`Could not read ${dateStr}.json for export`);
    }

    try {
      const htmlHandle = await handle.getFileHandle(`${dateStr}.html`);
      const htmlFile = await htmlHandle.getFile();
      zip.file(`${dateStr}.html`, await htmlFile.text());
    } catch {
      console.warn(`Could not read ${dateStr}.html for export`);
    }
  }

  return zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } });
}

/**
 * Triggers a browser download of the provided Blob.
 * Creates a temporary <a> element, clicks it, then cleans up.
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  // Clean up after a short delay to let the download initiate
  setTimeout(() => {
    URL.revokeObjectURL(url);
    document.body.removeChild(a);
  }, 100);
}