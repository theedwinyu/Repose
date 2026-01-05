import { UserConfig, JournalEntry, JournalEntryWithBody } from '@/app/types';

export function isFileSystemAccessSupported(): boolean {
  return typeof window !== 'undefined' && 'showDirectoryPicker' in window;
}

export async function openJournalFolder(): Promise<FileSystemDirectoryHandle | null> {
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