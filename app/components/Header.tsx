'use client';

import { useRouter } from 'next/navigation';
import { useState, useRef, useEffect, useCallback } from 'react';
import { useFolderContext } from '../context/FolderContext';
import { writeConfig, isMobile, exportJournalAsZip, downloadBlob } from '../lib/fileSystem';

interface HeaderProps {
  title: string;
  showBackButton?: boolean;
  onBack?: () => void;
}

type ExportStatus = 'idle' | 'exporting' | 'done' | 'error';

export default function Header({ title, showBackButton = false, onBack }: HeaderProps) {
  const router = useRouter();
  const { folderHandle, userConfig, setUserConfig, entries } = useFolderContext();
  const [showSettings, setShowSettings] = useState(false);

  // Change-name modal state
  const [showNameModal, setShowNameModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [nameError, setNameError] = useState('');

  // Export state (mobile only)
  const [exportStatus, setExportStatus] = useState<ExportStatus>('idle');
  const [exportError, setExportError] = useState('');
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Resolved client-side only — avoids SSR poisoning the value as false
  const [onMobile, setOnMobile] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Resolve mobile after mount so SSR always starts with false and hydration matches
  useEffect(() => { setOnMobile(isMobile()); }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowSettings(false);
      }
    }
    if (showSettings) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showSettings]);

  // Clean up toast timer on unmount
  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, []);

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      router.back();
    }
  };

  // ---------------------------------------------------------------------------
  // Change Name
  // ---------------------------------------------------------------------------
  const handleChangeName = () => {
    setNewName(userConfig?.name || '');
    setShowNameModal(true);
    setShowSettings(false);
    setNameError('');
  };

  const handleSaveName = async () => {
    if (!newName.trim()) {
      setNameError('Please enter your name');
      return;
    }
    if (!folderHandle) {
      setNameError('No storage found');
      return;
    }
    setIsSaving(true);
    setNameError('');
    try {
      const config = { name: newName.trim() };
      await writeConfig(folderHandle, config);
      setUserConfig(config);
      setShowNameModal(false);
    } catch (err) {
      setNameError('Failed to save name');
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Export Journal (mobile only)
  // ---------------------------------------------------------------------------
  const handleExport = useCallback(async () => {
    if (!folderHandle || exportStatus === 'exporting') return;

    setShowSettings(false);
    setExportStatus('exporting');
    setExportError('');

    try {
      const zip = await exportJournalAsZip(folderHandle, entries);

      // Build a dated filename: repose-journal-2026-02-18.zip
      const dateStamp = new Date().toISOString().slice(0, 10);
      const filename = `repose-journal-${dateStamp}.zip`;

      downloadBlob(zip, filename);

      setExportStatus('done');

      // Auto-reset toast after 4 seconds
      toastTimerRef.current = setTimeout(() => {
        setExportStatus('idle');
      }, 4000);
    } catch (err) {
      console.error('Export failed:', err);
      setExportError('Export failed. Please try again.');
      setExportStatus('error');

      toastTimerRef.current = setTimeout(() => {
        setExportStatus('idle');
        setExportError('');
      }, 4000);
    }
  }, [folderHandle, entries, exportStatus]);

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <>
      <header className="bg-soft-white/90 backdrop-blur-md border-b border-sage/10 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between gap-4">

            {/* Left: Back button + Title */}
            <div className="flex items-center gap-4">
              {showBackButton && (
                <button
                  onClick={handleBack}
                  className="p-2 hover:bg-sage-light/30 rounded-lg transition-colors text-charcoal"
                  aria-label="Go back"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
              )}
              <h1
                className="text-xl font-semibold text-charcoal tracking-tight"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                {title}
              </h1>
            </div>

            {/* Right: Settings gear + dropdown */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setShowSettings(!showSettings)}
                className="p-2 hover:bg-sage-light/30 rounded-lg transition-colors text-warm-gray hover:text-charcoal"
                aria-label="Settings"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>

              {/* ── Dropdown Menu ── */}
              {showSettings && (
                <div className="absolute right-0 mt-2 w-60 serene-card rounded-xl shadow-serene-lg border border-sage/10 py-2 animate-scale-in">

                  {/* Account section */}
                  <div className="px-4 py-2 border-b border-sage/10">
                    <p className="text-xs text-warm-gray uppercase tracking-wider">Account</p>
                    {userConfig && (
                      <p className="text-sm font-medium text-charcoal mt-1">{userConfig.name}</p>
                    )}
                  </div>

                  <button
                    onClick={handleChangeName}
                    className="w-full text-left px-4 py-2 text-sm text-charcoal hover:bg-sage-light/20 transition-colors flex items-center gap-2"
                  >
                    <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                    Change Name
                  </button>

                  {/* ── Data section — mobile only ── */}
                  {onMobile && (
                    <>
                      <div className="px-4 py-2 border-t border-b border-sage/10 mt-1">
                        <p className="text-xs text-warm-gray uppercase tracking-wider">Journal</p>
                      </div>

                      <button
                        onClick={handleExport}
                        disabled={exportStatus === 'exporting' || entries.size === 0}
                        className="w-full text-left px-4 py-2.5 text-sm text-charcoal hover:bg-sage-light/20 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {exportStatus === 'exporting' ? (
                          <>
                            <div className="w-4 h-4 flex-shrink-0 border-2 border-sage/40 border-t-sage rounded-full animate-spin" />
                            <span>Preparing export…</span>
                          </>
                        ) : (
                          <>
                            {/* Archive / zip icon */}
                            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                            </svg>
                            <div>
                              <span>Export Journal</span>
                              <p className="text-xs text-warm-gray leading-tight mt-0.5">
                                Download all entries as a .zip
                              </p>
                            </div>
                          </>
                        )}
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* ── Export toast notification ── */}
      {(exportStatus === 'done' || exportStatus === 'error') && (
        <div
          className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-2xl shadow-serene-lg text-sm font-medium flex items-center gap-2.5 animate-scale-in ${
            exportStatus === 'done'
              ? 'bg-sage text-charcoal'
              : 'bg-red-100 text-red-700 border border-red-200'
          }`}
        >
          {exportStatus === 'done' ? (
            <>
              <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Journal exported — check your Downloads
            </>
          ) : (
            <>
              <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {exportError}
            </>
          )}
        </div>
      )}

      {/* ── Change Name Modal ── */}
      {showNameModal && (
        <div className="fixed inset-0 bg-charcoal/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="max-w-md w-full serene-card rounded-3xl p-8 animate-scale-in">
            <h2
              className="text-2xl font-bold text-charcoal mb-6 tracking-tight"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              Change Your Name
            </h2>

            {nameError && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-4 text-sm animate-slide-in">
                {nameError}
              </div>
            )}

            <div className="mb-6">
              <label className="block text-sm font-semibold text-charcoal mb-2">
                Your Name
              </label>
              <input
                type="text"
                value={newName}
                onChange={(e) => {
                  setNewName(e.target.value);
                  setNameError('');
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newName.trim()) handleSaveName();
                  if (e.key === 'Escape') setShowNameModal(false);
                }}
                placeholder="Enter your name"
                className="w-full bg-soft-white border-2 border-sage/20 focus:border-sage text-charcoal px-4 py-3 rounded-xl focus:outline-none transition-all placeholder:text-light-muted"
                autoFocus
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowNameModal(false)}
                className="flex-1 bg-soft-white hover:bg-sage-light/20 border border-sage/15 hover:border-sage/30 text-charcoal font-semibold py-3 px-6 rounded-xl transition-all duration-300"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveName}
                disabled={isSaving || !newName.trim()}
                className="flex-1 btn-primary text-white font-semibold py-3 px-6 rounded-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isSaving ? (
                  <>
                    <div className="w-4 h-4 spinner-serene rounded-full" />
                    <span>Saving…</span>
                  </>
                ) : (
                  'Save'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}