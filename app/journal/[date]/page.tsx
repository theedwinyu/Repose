'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { format, parse, isToday } from 'date-fns';
import { useFolderContext } from '../../context/FolderContext';
import { readEntry, writeEntry, deleteEntry } from '../../lib/fileSystem';
import Header from '../../components/Header';
import RichTextEditor from '../../components/RichTextEditor';
import MoodSelector from '../../components/MoodSelector';
import { JournalEntry } from '../../types';
import Image from 'next/image';
import { getWeatherContext } from '../../lib/weather';
import WeatherDisplay from '../../components/WeatherDisplay';
import { WeatherContext } from '../../types';

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

// Mood-adaptive journaling prompts
const promptsByMood = {
  peaceful: [
    "Describe this feeling of peace. Where do you feel it in your body? What does it remind you of?",
    "What helped you find this calm today? How can you return to this feeling when you need it?",
    "What are you noticing right now that usually goes unnoticed?",
    "Describe a moment today using all five senses. What did you see, hear, smell, taste, feel?",
    "What part of your day felt most aligned with who you want to be?",
  ],
  content: [
    "What made today feel good? Be specific—was it a person, a moment, an accomplishment, or something else?",
    "Write about a small moment today that made you smile or feel warm inside.",
    "Who or what are you appreciating right now? Why does this matter to you?",
    "What went better than expected today?",
    "If you could bottle the feeling of today, what would you save it for?",
  ],
  neutral: [
    "Sometimes 'okay' is enough. What made today just... a day?",
    "What thoughts have been circling in your mind lately?",
    "If today was a color or a texture, what would it be? Why?",
    "What's something small you did today that you usually take for granted?",
    "What are you wondering about right now—about yourself, your life, or the world?",
  ],
  reflective: [
    "What's something you're trying to figure out right now? Write without needing to find the answer.",
    "What emotions are beneath the surface today? Even if they're tangled or unclear, can you name them?",
    "What would you say to a friend who was going through what you're going through?",
    "Write a letter to your past self from one year ago. What would you want them to know?",
    "What are you learning about yourself lately? It doesn't have to be profound—just honest.",
  ],
  heavy: [
    "What do you need right now? Even if you can't have it, what would feel like relief?",
    "Where in your body do you feel this heaviness? What would you say to that part of you?",
    "List three very small things you did today, even if they feel insignificant. (Getting out of bed counts.)",
    "What's one thing that feels too hard right now? You don't have to solve it, just name it.",
    "If your pain could speak, what would it be trying to tell you?",
  ],
  lowEnergy: [
    "How I feel right now:",
    "Today I",
    "My day in 3 emojis:",
    "One thing I want to remember:",
    "I'm here. That's enough for today.",
    "Right now my body feels:",
    "Something small I noticed:",
    "Today I give myself permission to",
  ],
};

export default function JournalEditor() {
  const router = useRouter();
  const params = useParams();
  const dateStr = params.date as string;
  const { folderHandle, refreshEntries } = useFolderContext();

  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [mood, setMood] = useState<'peaceful' | 'content' | 'neutral' | 'reflective' | 'heavy' | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [error, setError] = useState('');
  const [isExisting, setIsExisting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false);
  const [lastSavedTime, setLastSavedTime] = useState<Date | null>(null);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  // Weather context
  const [weatherContext, setWeatherContext] = useState<WeatherContext | null>(null);
  
  // Get mood-appropriate prompt
  const [currentPrompt, setCurrentPrompt] = useState('');
  const [showLowEnergyPrompts, setShowLowEnergyPrompts] = useState(false);
  const [showPrompt, setShowPrompt] = useState(true); // Control prompt visibility
  
  const getRandomPrompt = (promptMood: 'peaceful' | 'content' | 'neutral' | 'reflective' | 'heavy' | 'lowEnergy') => {
    const prompts = promptsByMood[promptMood];
    return prompts[Math.floor(Math.random() * prompts.length)];
  };
  
  // Update prompt when mood changes
  useEffect(() => {
    if (mood) {
      const promptMood = showLowEnergyPrompts ? 'lowEnergy' : mood;
      // Defer setState to avoid cascading renders
      const timeoutId = setTimeout(() => {
        setCurrentPrompt(getRandomPrompt(promptMood));
        setShowPrompt(true); // Show prompt when mood changes
      }, 0);
      
      return () => clearTimeout(timeoutId);
    }
  }, [mood, showLowEnergyPrompts]);

  const [initialTitle, setInitialTitle] = useState('');
  const [initialBody, setInitialBody] = useState('');
  const [initialMood, setInitialMood] = useState<'peaceful' | 'content' | 'neutral' | 'reflective' | 'heavy' | null>(null);

  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!folderHandle) {
      router.push('/');
      return;
    }

    async function loadEntry() {
      setIsLoading(true);

      if (!folderHandle) {
        setError("No journal folder selected. Please go back and select your folder.");
        setIsLoading(false);
        return;
      }

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
        
        // Load existing weather context if available
        if (entry.weatherContext) {
          setWeatherContext(entry.weatherContext);
        }
      }
      
      setIsLoading(false);
    }

    loadEntry();
  }, [folderHandle, dateStr, router]);

  // Fetch weather for new entries (only for today's date)
  useEffect(() => {
    const fetchWeather = async () => {
      const entryDate = parse(dateStr, 'yyyy-MM-dd', new Date());
      const isTodaysEntry = isToday(entryDate);
      
      // Only fetch weather if:
      // 1. This is a new entry (not existing)
      // 2. The entry date is TODAY (not past or future)
      if (!isExisting && isTodaysEntry) {
        try {
          const weather = await getWeatherContext();
          setWeatherContext(weather);
        } catch (error) {
          // User denied permission or error occurred
          console.log('Weather not available:', error);
          // Entry still saves without weather - no problem!
        }
      }
    };

    fetchWeather();
  }, [isExisting, dateStr]);

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
        weatherContext: weatherContext || undefined,
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
  }, [folderHandle, dateStr, title, body, mood, weatherContext, refreshEntries]);

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
  const formattedShortDate = format(date, 'MMM d, yyyy');

  const tempDiv = typeof document !== 'undefined' ? document.createElement('div') : null;
  let wordCount = 0;
  if (tempDiv) {
    tempDiv.innerHTML = body;
    const text = tempDiv.textContent || tempDiv.innerText || '';
    wordCount = text.trim().split(/\s+/).filter(word => word.length > 0).length;
  }

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
    peaceful: '😌',
    content: '😊',
    neutral: '😐',
    reflective: '😔',
    heavy: '😢',
  };

  const moodColors = {
    peaceful: 'from-sage/10 to-sage-light/5',
    content: 'from-aqua/10 to-aqua-light/5',
    neutral: 'from-sand/10 to-sand-light/5',
    reflective: 'from-lavender/10 to-lavender-light/5',
    heavy: 'from-sky/10 to-sky-light/5',
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-serene flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 spinner-serene rounded-full"></div>
          <div className="text-warm-gray font-medium">Loading your thoughts...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-serene">
      <Header
        title={isExisting ? (isPreviewMode ? 'Reading' : 'Reflecting') : 'Reflecting'}
        showBackButton
        onBack={handleBack}
      />

      {isPreviewMode ? (
        /* PREVIEW MODE */
        <main className="max-w-4xl mx-auto p-6 animate-fade-in">
          {/* Mode Toggle */}
          <div className="flex justify-end mb-6">
            <button
              onClick={() => setIsPreviewMode(false)}
              className="flex items-center gap-2 serene-card text-charcoal font-medium py-2.5 px-5 rounded-full transition-all hover:scale-105"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Edit Entry
            </button>
          </div>

          {/* Book-like Entry Card */}
          <article className="serene-card rounded-3xl shadow-serene-lg overflow-hidden border-2 border-sage/10">
            {/* Decorative Header */}
            <div className={`h-2 bg-gradient-to-r ${mood ? moodColors[mood] : 'from-sage/20 to-sage-light/10'}`} />
            
            <div className="p-12">
              {/* Date Banner */}
              <div className="flex items-center gap-4 mb-8 pb-6 border-b border-sage/10">
                <div className="text-center px-4 py-2 bg-sage/8 rounded-lg">
                  <div className="text-3xl font-bold text-charcoal">{format(date, 'd')}</div>
                  <div className="text-xs text-warm-gray uppercase tracking-wider">{format(date, 'MMM')}</div>
                </div>
                <div className="flex-1">
                  <div className="text-sm text-warm-gray uppercase tracking-wider mb-1">
                    {format(date, 'EEEE')}
                  </div>
                  <div className="text-charcoal font-medium">{format(date, 'yyyy')}</div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-4xl">{mood && moodEmojis[mood]}</span>
                  <div className="text-right">
                    <div className="text-xs text-warm-gray uppercase tracking-wider">Mood</div>
                    <div className="text-charcoal capitalize font-medium">{mood}</div>
                  </div>
                </div>
              </div>

              {/* Title */}
              <h1 className="text-4xl md:text-5xl font-bold text-charcoal mb-6 leading-tight tracking-tight" style={{ fontFamily: 'var(--font-display)' }}>
                {title}
              </h1>

              {/* Weather Display */}
              {weatherContext && (
                <div className="mb-6">
                  <WeatherDisplay 
                    weatherContext={weatherContext} 
                    className="text-warm-gray"
                  />
                </div>
              )}

              {/* Reading Stats */}
              <div className="flex items-center gap-6 mb-10 text-sm text-warm-gray">
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
              <div className="mb-10">
                <div className="divider-wave" />
              </div>

              {/* Content */}
              <div 
                className="prose prose-invert max-w-none prose-lg"
                dangerouslySetInnerHTML={{ __html: body }}
              />

              {/* Decorative Footer */}
              <div className="mt-12 pt-8 border-t border-sage/10 flex items-center justify-center">
                <div className="flex items-center gap-2 text-sage/40">
                  <div className="w-1 h-1 rounded-full bg-sage/40" />
                  <div className="w-2 h-2 rounded-full bg-sage/40" />
                  <div className="w-1 h-1 rounded-full bg-sage/40" />
                </div>
              </div>
            </div>
          </article>

          {/* Bottom Actions */}
          <div className="mt-8 flex gap-4">
            <button
              onClick={() => router.push('/dashboard')}
              className="flex-1 btn-secondary text-charcoal font-semibold py-4 px-6 rounded-2xl transition-all duration-300"
            >
              Back to Dashboard
            </button>
            
            {isExisting && (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="bg-red-50 hover:bg-red-100 border border-red-200 text-red-600 font-semibold py-4 px-6 rounded-2xl transition-all duration-300"
              >
                Delete Entry
              </button>
            )}
          </div>
        </main>
      ) : (
        /* EDIT MODE */
        <main className="max-w-5xl mx-auto p-6 animate-fade-in">
          {/* Floating Status Bar */}
          <div className="sticky top-20 z-10 mb-8">
            <div className="serene-card rounded-2xl p-4 shadow-serene-lg border border-sage/20">
              <div className="flex items-center justify-between">
                {/* Left: Date */}
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-sage/8 border border-sage/20 flex items-center justify-center overflow-hidden p-0.5">
                    <Image src="/repose-logo.jpg" alt="" width={40} height={40} className="w-full h-full rounded-full" />
                  </div>
                  <div>
                    <div className="text-xs text-warm-gray uppercase tracking-wider">
                      {isExisting ? 'Editing' : 'New Entry'}
                    </div>
                    <div className="text-sm font-semibold text-charcoal">{formattedShortDate}</div>
                  </div>
                </div>

                {/* Center: Save Status */}
                <div className="flex items-center gap-2 text-sm min-w-[140px] justify-center">
                  {saveStatus === 'saving' && (
                    <div className="flex items-center gap-2 text-sage animate-fade-in">
                      <div className="w-4 h-4 spinner-serene rounded-full"></div>
                      <span className="font-medium">Saving...</span>
                    </div>
                  )}
                  {saveStatus === 'saved' && (
                    <div className="flex items-center gap-2 text-sage-dark animate-fade-in">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="font-medium">Saved {getLastSavedText()}</span>
                    </div>
                  )}
                  {saveStatus === 'error' && (
                    <div className="flex items-center gap-2 text-red-600 animate-fade-in">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="font-medium">Save failed</span>
                    </div>
                  )}
                  {saveStatus === 'idle' && lastSavedTime && (
                    <div className="flex items-center gap-2 text-warm-gray">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="font-medium">Saved {getLastSavedText()}</span>
                    </div>
                  )}
                </div>

                {/* Right: Preview Toggle & Stats */}
                <div className="flex items-center gap-3">
                  {wordCount > 0 && (
                    <div className="text-right mr-2">
                      <div className="text-xs text-warm-gray">{wordCount} words</div>
                      <div className="text-xs text-light-muted">{readingTime} min read</div>
                    </div>
                  )}
                  {isExisting && (
                    <button
                      onClick={() => setIsPreviewMode(true)}
                      className="flex items-center gap-2 btn-secondary text-charcoal font-medium py-2 px-4 rounded-lg transition-all"
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

          {/* Mood Selector - AT TOP! */}
          <div className="mb-8">
            <MoodSelector selected={mood} onChange={setMood} />
          </div>

          {/* Weather Display */}
          {weatherContext && (
            <div className="mb-8">
              <WeatherDisplay 
                weatherContext={weatherContext} 
                className=""
              />
            </div>
          )}

          {/* Writing Prompt - Shows after mood selection */}
          {mood && showPrompt && currentPrompt && (
            <div className="mb-8 serene-card rounded-2xl p-6 border border-sage/15 bg-gradient-to-r from-sage/5 to-sky/5 relative">
              {/* Dismiss button */}
              <button
                type="button"
                onClick={() => setShowPrompt(false)}
                className="absolute top-4 right-4 text-warm-gray hover:text-charcoal transition-colors"
                aria-label="Dismiss prompt"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>

              <div className="flex items-start gap-4 pr-8">
                <div className="text-3xl">💭</div>
                <div className="flex-1">
                  <div className="text-sm font-semibold text-sage-dark mb-3">
                    {showLowEnergyPrompts ? 'Micro prompt' : 'Something to consider'}
                  </div>
                  <p className="text-charcoal text-lg italic leading-relaxed mb-4">{currentPrompt}</p>
                  
                  {/* Prompt Controls */}
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const promptMood = showLowEnergyPrompts ? 'lowEnergy' : mood;
                        setCurrentPrompt(getRandomPrompt(promptMood));
                      }}
                      className="text-xs text-sage-dark hover:text-sage font-medium transition-colors flex items-center gap-1"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      Try another
                    </button>
                    {!showLowEnergyPrompts && (
                      <button
                        type="button"
                        onClick={() => setShowLowEnergyPrompts(true)}
                        className="text-xs text-warm-gray hover:text-charcoal font-medium transition-colors flex items-center gap-1"
                      >
                        <span>🪶</span>
                        Need something simpler?
                      </button>
                    )}
                    {showLowEnergyPrompts && (
                      <button
                        type="button"
                        onClick={() => setShowLowEnergyPrompts(false)}
                        className="text-xs text-warm-gray hover:text-charcoal font-medium transition-colors"
                      >
                        ← Back to full prompts
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Title Input */}
          <div className="mb-8">
            <input
              type="text"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                setError('');
              }}
              placeholder="Give this a title..."
              className="w-full bg-transparent border-0 border-b-2 border-sage/20 focus:border-sage text-charcoal px-0 py-6 focus:outline-none transition-all text-3xl md:text-4xl font-bold placeholder:text-light-muted tracking-tight pl-4 md:pl-4"
              style={{ fontFamily: 'var(--font-display)' }}
              autoFocus={!isExisting}
            />
          </div>

          {/* Rich Text Editor */}
          <div className="mb-6">
            <RichTextEditor content={body} onChange={setBody} />
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-2xl mb-6 animate-slide-in flex items-center gap-3">
              <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {error}
            </div>
          )}

          {/* Delete Button */}
          {isExisting && (
            <div className="mb-8">
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="text-red-600 hover:text-red-700 text-sm transition-colors flex items-center gap-2 font-medium"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Delete this entry
              </button>
            </div>
          )}

          {/* Action Buttons */}
          <div className="sticky bottom-6 serene-card rounded-2xl p-4 shadow-serene-lg border border-sage/20">
            <div className="flex gap-4">
              <button
                onClick={handleCancel}
                disabled={saveStatus === 'saving'}
                className="flex-1 btn-secondary disabled:opacity-50 disabled:cursor-not-allowed text-charcoal font-semibold py-4 px-6 rounded-xl transition-all duration-300"
              >
                Cancel
              </button>
              <button
                onClick={handleManualSave}
                disabled={saveStatus === 'saving' || !title.trim() || !mood}
                className="flex-1 btn-primary disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-4 px-6 rounded-xl transition-all duration-300 flex items-center justify-center gap-3"
              >
                {saveStatus === 'saving' ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
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
        <div className="fixed inset-0 bg-charcoal/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="serene-card rounded-3xl p-8 max-w-md w-full animate-scale-in shadow-serene-lg">
            <div className="text-5xl mb-4 text-center">🗑️</div>
            <h3 className="text-2xl font-bold text-charcoal mb-3 tracking-tight text-center" style={{ fontFamily: 'var(--font-display)' }}>Delete Entry?</h3>
            <p className="text-warm-gray mb-8 leading-relaxed text-center">
              Are you sure you want to delete this reflection? This action cannot be undone.
            </p>
            <div className="flex gap-4">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isDeleting}
                className="flex-1 btn-secondary disabled:opacity-50 disabled:cursor-not-allowed text-charcoal font-semibold py-3 px-6 rounded-xl transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-red-300 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-xl transition-all"
              >
                {isDeleting ? 'Deleting...' : 'Delete Entry'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Unsaved Changes Dialog */}
      {showUnsavedDialog && (
        <div className="fixed inset-0 bg-charcoal/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="serene-card rounded-3xl p-8 max-w-md w-full animate-scale-in shadow-serene-lg">
            <div className="text-5xl mb-4 text-center">⚠️</div>
            <h3 className="text-2xl font-bold text-charcoal mb-3 tracking-tight text-center" style={{ fontFamily: 'var(--font-display)' }}>Unsaved Changes</h3>
            <p className="text-warm-gray mb-8 leading-relaxed text-center">
              You have unsaved changes. Are you sure you want to leave without saving?
            </p>
            <div className="flex gap-4">
              <button
                onClick={() => setShowUnsavedDialog(false)}
                className="flex-1 btn-secondary text-charcoal font-semibold py-3 px-6 rounded-xl transition-all"
              >
                Keep Editing
              </button>
              <button
                onClick={() => router.push('/dashboard')}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold py-3 px-6 rounded-xl transition-all"
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