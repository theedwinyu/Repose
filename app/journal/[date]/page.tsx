'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { format, parse } from 'date-fns';
import { useFolderContext } from '../../context/FolderContext';
import { readEntry, writeEntry, deleteEntry } from '../../lib/fileSystem';
import Header from '../../components/Header';
import RichTextEditor from '../../components/RichTextEditor';
import MoodSelector from '../../components/MoodSelector';
import { JournalEntry } from '../../types';

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

export default function JournalEditor() {
  const router = useRouter();
  const params = useParams();
  const dateStr = params.date as string;
  const { folderHandle, refreshEntries } = useFolderContext();

  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [mood, setMood] = useState<'happy' | 'sad' | 'neutral' | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [error, setError] = useState('');
  const [isExisting, setIsExisting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false);
  const [lastSavedTime, setLastSavedTime] = useState<Date | null>(null);
  const [isPreviewMode, setIsPreviewMode] = useState(false);

  // Track initial values for unsaved changes detection
  const [initialTitle, setInitialTitle] = useState('');
  const [initialBody, setInitialBody] = useState('');
  const [initialMood, setInitialMood] = useState<'happy' | 'sad' | 'neutral' | null>(null);

  // Auto-save timer ref
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!folderHandle) {
      router.push('/');
      return;
    }

    async function loadEntry() {
      setIsLoading(true);
      const entry = await readEntry(folderHandle, dateStr);
      
      if (entry) {
        setTitle(entry.title);
        setBody(entry.body);
        setMood(entry.mood);
        setInitialTitle(entry.title);
        setInitialBody(entry.body);
        setInitialMood(entry.mood);
        setIsExisting(true);
        setIsPreviewMode(true); // Start in preview mode for existing entries
      }
      
      setIsLoading(false);
    }

    loadEntry();
  }, [folderHandle, dateStr, router]);

  // Auto-save function
  const autoSave = useCallback(async () => {
    if (!folderHandle || !title.trim() || !mood) {
      return;
    }

    setSaveStatus('saving');
    
    try {
      const entry: JournalEntry = {
        title: title.trim(),
        mood,
        timestamp: new Date().toISOString(),
      };

      await writeEntry(folderHandle, dateStr, entry, body);
      
      setInitialTitle(title);
      setInitialBody(body);
      setInitialMood(mood);
      
      setSaveStatus('saved');
      setLastSavedTime(new Date());
      
      setTimeout(() => {
        setSaveStatus('idle');
      }, 2000);
      
      refreshEntries();
    } catch (err) {
      console.error('Auto-save failed:', err);
      setSaveStatus('error');
      setTimeout(() => {
        setSaveStatus('idle');
      }, 3000);
    }
  }, [folderHandle, dateStr, title, body, mood, refreshEntries]);

  // Debounced auto-save effect
  useEffect(() => {
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }

    const hasChanges = 
      title !== initialTitle ||
      body !== initialBody ||
      mood !== initialMood;

    if (hasChanges && title.trim() && mood && !isPreviewMode) {
      autoSaveTimerRef.current = setTimeout(() => {
        autoSave();
      }, 2500);
    }

    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, [title, body, mood, initialTitle, initialBody, initialMood, autoSave, isPreviewMode]);

  // Warn before closing tab with unsaved changes
  useEffect(() => {
    const hasUnsavedChanges = 
      (title !== initialTitle ||
      body !== initialBody ||
      mood !== initialMood) && saveStatus !== 'saved';

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges && !isPreviewMode) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [title, body, mood, initialTitle, initialBody, initialMood, saveStatus, isPreviewMode]);

  if (!folderHandle) {
    return null;
  }

  const date = parse(dateStr, 'yyyy-MM-dd', new Date());
  const formattedDate = format(date, 'EEEE, MMMM d, yyyy');

  // Calculate word count
  const tempDiv = typeof document !== 'undefined' ? document.createElement('div') : null;
  if (tempDiv) {
    tempDiv.innerHTML = body;
    const text = tempDiv.textContent || tempDiv.innerText || '';
    var wordCount = text.trim().split(/\s+/).filter(word => word.length > 0).length;
  } else {
    var wordCount = 0;
  }

  const handleManualSave = async () => {
    if (!title.trim()) {
      setError('Please enter a title');
      return;
    }

    if (!mood) {
      setError('Please select a mood');
      return;
    }

    await autoSave();
    
    setTimeout(() => {
      router.push('/dashboard');
    }, 500);
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await deleteEntry(folderHandle, dateStr);
      refreshEntries();
      router.push('/dashboard');
    } catch (err) {
      setError('Failed to delete entry');
      console.error(err);
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const handleBack = () => {
    const hasUnsavedChanges = 
      title !== initialTitle ||
      body !== initialBody ||
      mood !== initialMood;

    if (hasUnsavedChanges && saveStatus !== 'saved' && !isPreviewMode) {
      setShowUnsavedDialog(true);
    } else {
      router.push('/dashboard');
    }
  };

  const handleCancel = () => {
    const hasUnsavedChanges = 
      title !== initialTitle ||
      body !== initialBody ||
      mood !== initialMood;

    if (hasUnsavedChanges && saveStatus !== 'saved' && !isPreviewMode) {
      setShowUnsavedDialog(true);
    } else {
      router.push('/dashboard');
    }
  };

  const getLastSavedText = () => {
    if (!lastSavedTime) return '';
    
    const now = new Date();
    const diffSeconds = Math.floor((now.getTime() - lastSavedTime.getTime()) / 1000);
    
    if (diffSeconds < 60) return 'just now';
    if (diffSeconds < 120) return '1 minute ago';
    if (diffSeconds < 3600) return `${Math.floor(diffSeconds / 60)} minutes ago`;
    return format(lastSavedTime, 'h:mm a');
  };

  const moodEmojis = {
    happy: '😊',
    neutral: '😐',
    sad: '😢',
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-800 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-zinc-700 border-t-blue-500 rounded-full animate-spin"></div>
          <div className="text-zinc-400 font-medium">Loading entry...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-800">
      <Header
        title={isExisting ? (isPreviewMode ? 'View Entry' : 'Edit Entry') : 'New Entry'}
        showBackButton
        onBack={handleBack}
      />

      <main className="max-w-4xl mx-auto p-6 animate-fade-in">
        {/* Date Display, Save Status & Mode Toggle */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <p className="text-sm text-zinc-400 mb-1 font-medium">
              {isPreviewMode ? 'Entry for' : (isExisting ? 'Editing entry for' : 'Creating entry for')}
            </p>
            <p className="text-2xl font-bold text-zinc-100 tracking-tight">{formattedDate}</p>
          </div>
          
          <div className="flex items-center gap-4">
            {/* Auto-save Status Indicator - Always show in edit mode */}
            {!isPreviewMode && (
              <div className="flex items-center gap-2 text-sm min-w-[140px]">
                {saveStatus === 'saving' && (
                  <div className="flex items-center gap-2 text-blue-400 animate-fade-in">
                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span className="font-medium">Saving...</span>
                  </div>
                )}
                {saveStatus === 'saved' && (
                  <div className="flex items-center gap-2 text-green-400 animate-fade-in">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="font-medium">Saved {getLastSavedText()}</span>
                  </div>
                )}
                {saveStatus === 'error' && (
                  <div className="flex items-center gap-2 text-red-400 animate-fade-in">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="font-medium">Save failed</span>
                  </div>
                )}
                {saveStatus === 'idle' && lastSavedTime && (
                  <div className="flex items-center gap-2 text-zinc-400">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="font-medium">Saved {getLastSavedText()}</span>
                  </div>
                )}
              </div>
            )}

            {/* Preview/Edit Toggle */}
            {isExisting && (
              <button
                onClick={() => setIsPreviewMode(!isPreviewMode)}
                className="flex items-center gap-2 bg-zinc-800/60 hover:bg-zinc-700/60 text-zinc-100 font-medium py-2 px-4 rounded-lg transition-all border border-zinc-700/50"
              >
                {isPreviewMode ? (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    Edit
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                    Preview
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {isPreviewMode ? (
          /* Preview Mode */
          <>
            {/* Title Display */}
            <div className="mb-6">
              <h1 className="text-4xl font-bold text-zinc-100 mb-4">{title}</h1>
              <div className="flex items-center gap-4 text-zinc-400">
                <span className="flex items-center gap-2">
                  <span className="text-2xl">{mood && moodEmojis[mood]}</span>
                  <span className="capitalize">{mood}</span>
                </span>
                <span>•</span>
                <span>{wordCount} {wordCount === 1 ? 'word' : 'words'}</span>
              </div>
            </div>

            {/* Content Display */}
            <div className="glass rounded-2xl p-8 mb-6 backdrop-blur-xl">
              <div 
                className="prose prose-invert max-w-none"
                dangerouslySetInnerHTML={{ __html: body }}
              />
            </div>

            {/* Preview Mode Actions */}
            <div className="flex gap-4">
              <button
                onClick={() => router.push('/dashboard')}
                className="flex-1 bg-zinc-700/60 hover:bg-zinc-600/60 text-zinc-100 font-semibold py-4 px-6 rounded-xl transition-all duration-200 backdrop-blur-sm"
              >
                Back to Dashboard
              </button>
              
              {isExisting && (
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="bg-red-600/20 hover:bg-red-600/30 border border-red-600/50 text-red-400 font-semibold py-4 px-6 rounded-xl transition-all duration-200"
                >
                  Delete Entry
                </button>
              )}
            </div>
          </>
        ) : (
          /* Edit Mode */
          <>
            {/* Title Input */}
            <div className="mb-6">
              <label className="block text-sm font-semibold text-zinc-300 mb-2">
                Entry Title
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  setError('');
                }}
                placeholder="Give this entry a title..."
                className="w-full bg-zinc-800/60 border border-zinc-700/50 text-zinc-100 px-5 py-4 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all text-lg placeholder:text-zinc-500 backdrop-blur-sm"
              />
            </div>

            {/* Rich Text Editor */}
            <div className="mb-4">
              <label className="block text-sm font-semibold text-zinc-300 mb-2">
                Entry Content
              </label>
              <RichTextEditor content={body} onChange={setBody} />
            </div>

            {/* Word Count */}
            <div className="text-right text-sm text-zinc-500 mb-6 font-medium">
              {wordCount} {wordCount === 1 ? 'word' : 'words'}
            </div>

            {/* Mood Selector */}
            <div className="mb-6">
              <MoodSelector selected={mood} onChange={setMood} />
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-900/30 border border-red-800 text-red-400 px-4 py-3 rounded-xl mb-6 animate-slide-in">
                {error}
              </div>
            )}

            {/* Delete Button (for existing entries) */}
            {isExisting && (
              <div className="mb-6">
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="text-red-400 hover:text-red-300 text-sm transition-colors flex items-center gap-2 font-medium"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  Delete this entry
                </button>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-4">
              <button
                onClick={handleCancel}
                disabled={saveStatus === 'saving'}
                className="flex-1 bg-zinc-700/60 hover:bg-zinc-600/60 disabled:bg-zinc-800/50 disabled:cursor-not-allowed text-zinc-100 font-semibold py-4 px-6 rounded-xl transition-all duration-200 backdrop-blur-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleManualSave}
                disabled={saveStatus === 'saving' || !title.trim() || !mood}
                className="flex-1 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 disabled:from-zinc-700 disabled:to-zinc-700 disabled:cursor-not-allowed text-white font-semibold py-4 px-6 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 shadow-lg shadow-blue-900/30 hover:shadow-xl hover:shadow-blue-900/40 hover:-translate-y-0.5 disabled:shadow-none disabled:hover:translate-y-0"
              >
                {saveStatus === 'saving' ? (
                  <>
                    <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Saving...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Done
                  </>
                )}
              </button>
            </div>
          </>
        )}
      </main>

      {/* Delete Confirmation Dialog */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="glass rounded-2xl p-6 max-w-md w-full animate-scale-in">
            <h3 className="text-xl font-bold text-zinc-100 mb-4 tracking-tight">Delete Entry?</h3>
            <p className="text-zinc-400 mb-6 leading-relaxed">
              Are you sure you want to delete this journal entry? This action cannot be undone.
            </p>
            <div className="flex gap-4">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isDeleting}
                className="flex-1 bg-zinc-700/60 hover:bg-zinc-600/60 disabled:bg-zinc-800/50 disabled:cursor-not-allowed text-zinc-100 font-semibold py-3 px-4 rounded-xl transition-all backdrop-blur-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="flex-1 bg-red-600 hover:bg-red-500 disabled:bg-zinc-700 disabled:cursor-not-allowed text-white font-semibold py-3 px-4 rounded-xl transition-all shadow-lg shadow-red-900/30"
              >
                {isDeleting ? 'Deleting...' : 'Delete Entry'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Unsaved Changes Dialog */}
      {showUnsavedDialog && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="glass rounded-2xl p-6 max-w-md w-full animate-scale-in">
            <h3 className="text-xl font-bold text-zinc-100 mb-4 tracking-tight">Unsaved Changes</h3>
            <p className="text-zinc-400 mb-6 leading-relaxed">
              You have unsaved changes. Are you sure you want to leave without saving?
            </p>
            <div className="flex gap-4">
              <button
                onClick={() => setShowUnsavedDialog(false)}
                className="flex-1 bg-zinc-700/60 hover:bg-zinc-600/60 text-zinc-100 font-semibold py-3 px-4 rounded-xl transition-all backdrop-blur-sm"
              >
                Keep Editing
              </button>
              <button
                onClick={() => router.push('/dashboard')}
                className="flex-1 bg-red-600 hover:bg-red-500 text-white font-semibold py-3 px-4 rounded-xl transition-all shadow-lg shadow-red-900/30"
              >
                Discard Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}