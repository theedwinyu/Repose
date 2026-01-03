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

const writingPrompts = [
  "What made you smile today?",
  "What's something you learned recently?",
  "Describe a moment of peace you experienced.",
  "What are you looking forward to?",
  "What challenge did you overcome today?",
  "What are you grateful for right now?",
  "How did you grow today?",
  "What's on your mind?",
  "What would you tell your past self?",
  "What's a small win from today?",
];

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
  const [randomPrompt] = useState(() => writingPrompts[Math.floor(Math.random() * writingPrompts.length)]);

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
        setIsPreviewMode(true);
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
  const formattedShortDate = format(date, 'MMM d, yyyy');

  // Calculate word count
  const tempDiv = typeof document !== 'undefined' ? document.createElement('div') : null;
  if (tempDiv) {
    tempDiv.innerHTML = body;
    const text = tempDiv.textContent || tempDiv.innerText || '';
    var wordCount = text.trim().split(/\s+/).filter(word => word.length > 0).length;
  } else {
    var wordCount = 0;
  }

  // Calculate reading time
  const readingTime = Math.max(1, Math.ceil(wordCount / 200));

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

  const moodColors = {
    happy: 'from-green-500/20 to-emerald-500/20',
    neutral: 'from-yellow-500/20 to-amber-500/20',
    sad: 'from-blue-500/20 to-indigo-500/20',
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
        title={isExisting ? (isPreviewMode ? 'Reading' : 'Writing') : 'Writing'}
        showBackButton
        onBack={handleBack}
      />

      {isPreviewMode ? (
        /* ========== PREVIEW MODE - Book-like Reading Experience ========== */
        <main className="max-w-4xl mx-auto p-6 animate-fade-in">
          {/* Mode Toggle - Floating Top Right */}
          <div className="flex justify-end mb-6">
            <button
              onClick={() => setIsPreviewMode(false)}
              className="flex items-center gap-2 glass text-zinc-100 font-medium py-2.5 px-5 rounded-full transition-all hover:scale-105 shadow-lg"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Edit Entry
            </button>
          </div>

          {/* Book-like Entry Card */}
          <article className="glass rounded-3xl shadow-2xl overflow-hidden backdrop-blur-xl border-2 border-zinc-700/30">
            {/* Decorative Header with Mood Gradient */}
            <div className={`h-2 bg-gradient-to-r ${mood ? moodColors[mood] : 'from-zinc-700 to-zinc-600'}`} />
            
            <div className="p-12">
              {/* Date Banner */}
              <div className="flex items-center gap-4 mb-8 pb-6 border-b border-zinc-700/50">
                <div className="text-center px-4 py-2 bg-zinc-800/50 rounded-lg">
                  <div className="text-3xl font-bold text-zinc-100">{format(date, 'd')}</div>
                  <div className="text-xs text-zinc-400 uppercase tracking-wider">{format(date, 'MMM')}</div>
                </div>
                <div className="flex-1">
                  <div className="text-sm text-zinc-400 uppercase tracking-wider mb-1">
                    {format(date, 'EEEE')}
                  </div>
                  <div className="text-zinc-300 font-medium">{format(date, 'yyyy')}</div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-4xl">{mood && moodEmojis[mood]}</span>
                  <div className="text-right">
                    <div className="text-xs text-zinc-400 uppercase tracking-wider">Mood</div>
                    <div className="text-zinc-300 capitalize font-medium">{mood}</div>
                  </div>
                </div>
              </div>

              {/* Title */}
              <h1 className="text-4xl md:text-5xl font-bold text-zinc-50 mb-6 leading-tight tracking-tight">
                {title}
              </h1>

              {/* Reading Stats */}
              <div className="flex items-center gap-6 mb-10 text-sm text-zinc-400">
                <span className="flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                  {readingTime} min read
                </span>
                <span>•</span>
                <span className="flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  {wordCount} words
                </span>
              </div>

              {/* Decorative Divider */}
              <div className="flex items-center gap-4 mb-10">
                <div className="h-px flex-1 bg-gradient-to-r from-transparent via-zinc-700 to-transparent" />
                <div className="w-2 h-2 rounded-full bg-zinc-600" />
                <div className="h-px flex-1 bg-gradient-to-r from-transparent via-zinc-700 to-transparent" />
              </div>

              {/* Content with Book Typography */}
              <div 
                className="prose prose-invert max-w-none prose-lg"
                dangerouslySetInnerHTML={{ __html: body }}
              />

              {/* Decorative Footer */}
              <div className="mt-12 pt-8 border-t border-zinc-700/50 flex items-center justify-center">
                <div className="flex items-center gap-2 text-zinc-500">
                  <div className="w-1 h-1 rounded-full bg-zinc-600" />
                  <div className="w-2 h-2 rounded-full bg-zinc-600" />
                  <div className="w-1 h-1 rounded-full bg-zinc-600" />
                </div>
              </div>
            </div>
          </article>

          {/* Bottom Actions */}
          <div className="mt-8 flex gap-4">
            <button
              onClick={() => router.push('/dashboard')}
              className="flex-1 glass hover:bg-zinc-700/60 text-zinc-100 font-semibold py-4 px-6 rounded-2xl transition-all duration-200 backdrop-blur-sm"
            >
              Back to Dashboard
            </button>
            
            {isExisting && (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="bg-red-600/20 hover:bg-red-600/30 border border-red-600/50 text-red-400 font-semibold py-4 px-6 rounded-2xl transition-all duration-200"
              >
                Delete Entry
              </button>
            )}
          </div>
        </main>
      ) : (
        /* ========== EDIT MODE - Premium Writing Experience ========== */
        <main className="max-w-5xl mx-auto p-6 animate-fade-in">
          {/* Floating Status Bar */}
          <div className="sticky top-4 z-10 mb-8">
            <div className="glass rounded-2xl p-4 backdrop-blur-xl shadow-xl border border-zinc-700/30">
              <div className="flex items-center justify-between">
                {/* Left: Date */}
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-center">
                    <span className="text-lg">📝</span>
                  </div>
                  <div>
                    <div className="text-xs text-zinc-400 uppercase tracking-wider">
                      {isExisting ? 'Editing' : 'New Entry'}
                    </div>
                    <div className="text-sm font-semibold text-zinc-100">{formattedShortDate}</div>
                  </div>
                </div>

                {/* Center: Save Status */}
                <div className="flex items-center gap-2 text-sm min-w-[140px] justify-center">
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

                {/* Right: Preview Toggle */}
                <div className="flex items-center gap-3">
                  {wordCount > 0 && (
                    <div className="text-right mr-2">
                      <div className="text-xs text-zinc-400">{wordCount} words</div>
                      <div className="text-xs text-zinc-500">{readingTime} min read</div>
                    </div>
                  )}
                  {isExisting && (
                    <button
                      onClick={() => setIsPreviewMode(true)}
                      className="flex items-center gap-2 bg-zinc-800/60 hover:bg-zinc-700/60 text-zinc-100 font-medium py-2 px-4 rounded-lg transition-all border border-zinc-700/50"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                      Preview
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Writing Prompt (only when empty) */}
          {!title && !body && (
            <div className="mb-8 glass rounded-2xl p-6 backdrop-blur-xl border border-blue-500/20 bg-gradient-to-r from-blue-900/10 to-purple-900/10">
              <div className="flex items-start gap-4">
                <div className="text-3xl">💭</div>
                <div className="flex-1">
                  <div className="text-sm font-semibold text-blue-400 mb-1">Writing Prompt</div>
                  <p className="text-zinc-300 text-lg italic leading-relaxed">{randomPrompt}</p>
                </div>
              </div>
            </div>
          )}

          {/* Title Input - Larger and More Prominent */}
          <div className="mb-8">
            <input
              type="text"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                setError('');
              }}
              placeholder="Give your entry a title..."
              className="w-full bg-transparent border-0 border-b-2 border-zinc-700/50 focus:border-blue-500/50 text-zinc-100 px-0 py-4 focus:outline-none transition-all text-3xl md:text-4xl font-bold placeholder:text-zinc-700 tracking-tight"
              autoFocus={!isExisting}
            />
          </div>

          {/* Rich Text Editor with Enhanced Styling */}
          <div className="mb-6">
            <RichTextEditor content={body} onChange={setBody} />
          </div>

          {/* Mood Selector - More Visual */}
          <div className="mb-8">
            <MoodSelector selected={mood} onChange={setMood} />
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-900/30 border border-red-800 text-red-400 px-6 py-4 rounded-2xl mb-6 animate-slide-in flex items-center gap-3">
              <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {error}
            </div>
          )}

          {/* Delete Button (for existing entries) */}
          {isExisting && (
            <div className="mb-8">
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

          {/* Action Buttons - Floating at Bottom */}
          <div className="sticky bottom-6 glass rounded-2xl p-4 backdrop-blur-xl shadow-2xl border border-zinc-700/30">
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
                className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 disabled:from-zinc-700 disabled:to-zinc-700 disabled:cursor-not-allowed text-white font-semibold py-4 px-6 rounded-xl transition-all duration-200 flex items-center justify-center gap-3 shadow-xl shadow-blue-900/30 hover:shadow-2xl hover:shadow-blue-900/40 hover:-translate-y-0.5 disabled:shadow-none disabled:hover:translate-y-0"
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
                    Done & Save
                  </>
                )}
              </button>
            </div>
          </div>
        </main>
      )}

      {/* Delete Confirmation Dialog */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="glass rounded-3xl p-8 max-w-md w-full animate-scale-in shadow-2xl">
            <div className="text-5xl mb-4 text-center">🗑️</div>
            <h3 className="text-2xl font-bold text-zinc-100 mb-3 tracking-tight text-center">Delete Entry?</h3>
            <p className="text-zinc-400 mb-8 leading-relaxed text-center">
              Are you sure you want to delete this journal entry? This action cannot be undone.
            </p>
            <div className="flex gap-4">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isDeleting}
                className="flex-1 glass hover:bg-zinc-600/60 disabled:bg-zinc-800/50 disabled:cursor-not-allowed text-zinc-100 font-semibold py-3 px-6 rounded-xl transition-all backdrop-blur-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="flex-1 bg-red-600 hover:bg-red-500 disabled:bg-zinc-700 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-xl transition-all shadow-lg shadow-red-900/30"
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
          <div className="glass rounded-3xl p-8 max-w-md w-full animate-scale-in shadow-2xl">
            <div className="text-5xl mb-4 text-center">⚠️</div>
            <h3 className="text-2xl font-bold text-zinc-100 mb-3 tracking-tight text-center">Unsaved Changes</h3>
            <p className="text-zinc-400 mb-8 leading-relaxed text-center">
              You have unsaved changes. Are you sure you want to leave without saving?
            </p>
            <div className="flex gap-4">
              <button
                onClick={() => setShowUnsavedDialog(false)}
                className="flex-1 glass hover:bg-zinc-600/60 text-zinc-100 font-semibold py-3 px-6 rounded-xl transition-all backdrop-blur-sm"
              >
                Keep Editing
              </button>
              <button
                onClick={() => router.push('/dashboard')}
                className="flex-1 bg-red-600 hover:bg-red-500 text-white font-semibold py-3 px-6 rounded-xl transition-all shadow-lg shadow-red-900/30"
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