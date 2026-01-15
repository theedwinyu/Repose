'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { format, parse, isToday } from 'date-fns';
import { useFolderContext } from '../../context/FolderContext';
import { readEntry, writeEntry, deleteEntry } from '../../lib/fileSystem';
import Header from '../../components/Header';
import RichTextEditor from '../../components/RichTextEditor';
import MoodSelector from '../../components/MoodSelector';
import TagInput from '../../components/TagInput';
import { JournalEntry, getTagColor } from '../../types';
import { getSuggestedTags } from '../../utils/tagUtils';
import Image from 'next/image';
import { getWeatherContext } from '../../lib/weather';
import WeatherDisplay from '../../components/WeatherDisplay';
import { WeatherContext } from '../../types';

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

// Mood-adaptive journaling prompts
// Sources: Day One, Atomic Habits, Stoic Philosophy, Zen Habits, CBT,
// The Artist's Way, Positive Psychology, Somatic Therapy, Narrative Therapy,
// DBT, ACT, Self-Compassion (Kristin Neff), Ikigai

const promptsByMood = {
  // Goal: Deepen the calm, reinforce gratitude, and savor the moment.
  peaceful: [
    "What are you noticing right now that usually goes unnoticed?", // Zen - Mindfulness
    "Describe a place, real or imaginary, where you feel completely safe and calm.", // Visualization
    "What is one totally-free thing that has transformed your life recently?", // Gratitude
    "Who has invested in your well-being recently? How can you thank them?", // Relationship Gratitude
    "Describe a moment of profound beauty you witnessed today, no matter how small.", // Savoring
    "What part of your day felt most aligned with your core values?", // Values Alignment
    "If this feeling of peace had a color or a texture, what would it be?", // Somatic / Creative
    "Write a short note of thanks to your body for carrying you through today.", // Self-Compassion
    "What felt easy today?", // Non-striving (Zen)
    "What did you not rush today?", // Slow living
    "What ordinary thing felt quietly meaningful?", // CONSOLIDATED: Everyday presence (removed "quietest moment" and "made today complete")
    "Where in your body do you feel most relaxed right now?", // Somatic awareness
    "What sound felt comforting today?", // Sensory grounding
    "What did you allow instead of resisting?", // Acceptance (ACT)
    "What feels settled in your life right now?", // Stability
    "What would staying in this feeling teach you?", // Insight from calm
    "What part of yourself feels safest today?", // Internal safety (IFS)
    "What do you not need to worry about tonight?", // Letting go
    "What feels okay exactly as it is?", // Radical acceptance
    "If today had a soft ending, what would it be?", // Gentle closure
    "What would you like more days to feel like?", // Preference discovery
    
    // NEW HIGH-IMPACT ADDITIONS
    "Who do you feel completely yourself around lately?", // Relationship depth
    "What are you quietly excited about?", // Future-oriented
    "What movement felt good today?", // Body-based
  ],

  // Goal: Capture positive energy, record wins, and document life satisfaction.
  content: [
    "What was the 'story-worthy' moment of today?", // Narrative
    "What is a small win you had today that no one else knows about?", // Celebration
    "If you could bottle the feeling of today, what would you name the vintage?", // Metaphor
    "Who is pushing you to be the best version of yourself right now?", // Relationships
    "What is a recent purchase (under $100) that has positively impacted your life?", // Resourcefulness
    "Write about a moment today where you felt fully engaged and 'in the flow'.", // Flow (Positive Psych)
    "What is something you're looking forward to in the near future?", // Optimism
    "How did you practice self-care today?", // Wellness
    "What did you enjoy more than you expected?", // Pleasant surprise
    "What part of today would you happily repeat?", // Repeatability
    "What felt earned today?", // Effort → reward
    "What made you smile without trying?", // Natural joy
    "Who benefited from your presence today?", // Contribution
    "What problem did you handle better than before?", // Growth
    "What feels stable in your life right now?", // Security
    "What made today feel worthwhile?", // CONSOLIDATED: Meaning (removed "balanced" and "complete")
    "What felt aligned without effort?", // Natural strengths
    "What did you say no to that helped you?", // Boundaries
    "What small pleasure did you fully enjoy?", // Savoring
    "What part of your routine do you appreciate more now?", // Familiar gratitude
    "What are you quietly proud of?", // Self-esteem
    "If you had to describe today in one word, what would it be?", // Emotional clarity
    
    // NEW HIGH-IMPACT ADDITIONS
    "What did someone trust you with recently?", // Relationship depth
    "What are you building toward right now?", // Future-oriented
    "Where in your body do you feel joy?", // Body-based
    "What made you feel creatively alive today?", // The Artist's Way
    "Name 3 people who made today easier.", // Gratitude (Emmons)
    "What did you do today that the world needs?", // Ikigai - Purpose
  ],

  // Goal: Turn "okay" into insight. Move from observation to clarity or planning.
  neutral: [
    "What did I learn today?", // Growth
    "What is the harder choice I'm avoiding right now?", // Avoidance
    "If today was a prototype for your average day, what would you keep and change?", // Iteration
    "What problem am I currently trying to solve?", // Clarity
    "What is one thing I can do tomorrow to make the day 1% better?", // Incrementalism (Atomic Habits)
    "Review your day as an objective observer. What happened without judgment?", // Objectivity
    "What is one thing you are curious about right now?", // Curiosity
    "Are your current habits leading you toward or away from your desired identity?", // Identity (Atomic Habits)
    "What took more energy than expected?", // Energy audit
    "What felt unclear today?", // Ambiguity
    "What pattern did you notice?", // Pattern recognition
    "What decision did you postpone?", // Procrastination awareness
    "What worked fine but could be improved?", // Optimization without pressure
    "What did you react to instead of respond to?", // Emotional regulation
    "What did you spend time on that didn't matter much?", // Prioritization
    "What question are you circling lately?", // Open loops
    "What would an outside observer notice about today?", // Perspective
    "What assumption did you make?", // Cognitive bias
    "What needs more structure in your life right now?", // Systems thinking
    "What deserves a follow-up?", // Closure
    "What information are you missing?", // Decision quality
    "What would tomorrow benefit from?", // Gentle planning
    "What felt neutral but meaningful?", // Subtle significance
    
    // NEW HIGH-IMPACT ADDITIONS
    "What relationship needs attention?", // Relationship depth
    "What experiment could you run this week?", // Future-oriented
    "What does your body want to tell you?", // Body-based
    "What synchronicities did you notice today?", // The Artist's Way - Awareness
    "Did today move me toward or away from my values?", // ACT - Values alignment
    "Rate today: emotion (0-10), energy (0-10), stress (0-10)", // DBT - Self-monitoring
  ],

  // Goal: Explore complexity, identity, and perspective.
  reflective: [
    "What is a view about the world that has changed as you've gotten older?", // Perspective
    "Are you holding onto something you need to let go of?", // Release
    "If you lived exactly like today for 5 years, where would you end up?", // Trajectory
    "What boundary do you need to draw right now?", // Boundaries
    "Write a letter to your past self from one year ago.", // Time reflection
    "In what ways might you be self-sabotaging?", // Shadow work
    "What are the 'Morning Pages' of your mind right now?", // Brain dump (Artist's Way)
    "What is a question you wish someone would ask you?", // Unmet needs
    "What part of you is changing right now?", // Identity shift
    "What belief are you questioning lately?", // Belief update
    "What keeps repeating in your life?", // Pattern depth
    "What are you becoming more honest about?", // Self-truth
    "What fear is quieter than it used to be?", // Growth recognition
    "What truth are you slowly accepting?", // Integration
    "What role are you tired of playing?", // Authenticity (consider adding context: "The perfectionist? The helper? The strong one?")
    "What does this season of life ask of you?", // Life context
    "What do you need more space from?", // Boundaries
    "What do you miss that surprised you?", // Unexpected grief
    "What feels unresolved?", // Open emotional loops
    "What version of you is emerging?", // Becoming
    "What would you grieve if it ended?", // Value discovery
    "What does 'enough' mean to you now?", // Sufficiency
    "What are you learning about yourself lately?", // Self-knowledge
    
    // NEW HIGH-IMPACT ADDITIONS
    "What relationship pattern are you noticing?", // Relationship depth
    "What do you want to be true about you in 5 years?", // Future-oriented
    "What sensation are you avoiding?", // Body-based (somatic)
    "What are you pretending not to know?", // The Artist's Way - Shadow work
    "If your life was a book, what chapter are you in?", // Narrative Therapy
    "What matters most to me right now?", // ACT - Values work
    "What are you good at that you also love doing?", // Ikigai - Intersection
  ],

  // Goal: Process difficult emotions with compassion and grounding.
  heavy: [
    "If your anxiety or pain could speak, what would it say?", // Externalization
    "What are 5 things you can control and 5 you cannot?", // Stoic - Dichotomy of control
    "How would you comfort a small child who felt this way?", // Self-compassion (Kristin Neff)
    "What is the bare minimum you need today?", // Survival mode
    "How will today's difficulties show your character?", // Stoic - Reframing
    "Write the worst-case scenario, then how you'd cope.", // Fear-setting (Tim Ferriss)
    "What is one thing that is not wrong right now?", // CBT grounding
    "I forgive myself for...", // Forgiveness
    "What hurts the most right now?", // Naming pain
    "What are you afraid to admit?", // Emotional honesty
    "What do you need that you're not getting?", // Needs awareness
    "What would make this 5% easier?", // Load reduction
    "What are you blaming yourself for?", // Self-criticism awareness
    "What are you carrying that isn't yours?", // Emotional boundaries
    "What feels overwhelming, specifically?", // Decompression
    "What emotion is underneath this one?", // Emotional layering
    "What would rest look like today?", // Recovery
    "What feels unfair?", // Validation
    "What strength are you forgetting?", // Resilience
    "What would asking for help look like?", // Support
    "What does your body want right now?", // Somatic need
    "What are you surviving?", // Acknowledgment
    "What can wait until tomorrow?", // Pressure relief
    
    // NEW HIGH-IMPACT ADDITIONS
    "Who would you call if you weren't afraid of burdening them?", // Relationship depth + Support
    "What would future-you want current-you to know?", // Future-oriented + Self-compassion
    "Where are you holding tension right now?", // Body-based (somatic)
    "What are two opposite truths right now?", // DBT - Dialectical thinking (CRITICAL ADD)
    "Dear [your name], I see you're struggling with...", // Self-compassion letter (Kristin Neff)
    "What would radical acceptance of this situation look like?", // DBT/ACT - Acceptance
    "Is this problem bigger than you, or are you bigger than this problem?", // Narrative Therapy - Externalization
  ],

  // Goal: Extremely low friction. Safe to answer even on the worst days.
  lowEnergy: [
    "Today in 3 emojis:", // Micro-journaling
    "One tiny thing I managed to do today:", // Micro-win
    "I give myself permission to...", // Self-permission
    "Right now, my body feels:", // Somatic check-in
    "How I feel in one word:", // REVISED: More direct than "weather inside my head" metaphor
    "I am grateful for this one simple comfort:", // Micro-gratitude
    "A song that describes my mood:", // Vibe
    "Tomorrow, I hope to...", // Gentle hope
    "Right now, I feel...", // Open-ended emotion
    "Something warm or comforting:", // Sensory safety
    "Today felt...", // Sentence fragment
    "One thing that didn't go wrong:", // Cognitive grounding
    "My energy level (0–10):", // Self-awareness
    "I'm proud I showed up by...", // Self-kindness
    "Something that helped, even a little:", // Support tracking
    "I'm allowed to rest because...", // Permission
    "What I need less of tomorrow:", // Boundary-lite
    "A sound I liked today:", // Sensory anchor
    "What I want to remember:", // Memory
    "A word I need right now:", // Emotional need
    "That's enough for today.", // Closure
    "I'm still here.", // Existence acknowledgment
    
    // NEW HIGH-IMPACT ADDITIONS
    "One good thing:", // Ultra-minimal gratitude (Robert Emmons)
  ],
};

export default function JournalEditor() {
  const router = useRouter();
  const params = useParams();
  const dateStr = params.date as string;
  const { folderHandle, refreshEntries, entries } = useFolderContext();

  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [mood, setMood] = useState<'peaceful' | 'content' | 'neutral' | 'reflective' | 'heavy' | null>(null);
  const [tags, setTags] = useState<string[]>([]);
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
  const [initialTags, setInitialTags] = useState<string[]>([]);

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
        setTags(entry.tags || []);
        setInitialTitle(entry.title);
        setInitialBody(entry.body);
        setInitialMood(entry.mood);
        setInitialTags(entry.tags || []);
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
        tags: tags,
        createdAt: isExisting ? undefined : new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await writeEntry(folderHandle, dateStr, entry, body);
      
      setInitialTitle(title);
      setInitialBody(body);
      setInitialMood(mood);
      setInitialTags(tags);
      
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
  }, [folderHandle, dateStr, title, body, mood, tags, weatherContext, refreshEntries, isExisting]);

  useEffect(() => {
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }

    const hasChanges = 
      title !== initialTitle ||
      body !== initialBody ||
      mood !== initialMood ||
      JSON.stringify(tags) !== JSON.stringify(initialTags);

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
  }, [title, body, mood, tags, initialTitle, initialBody, initialMood, initialTags, autoSave, isPreviewMode]);

  useEffect(() => {
    const hasUnsavedChanges = 
      (title !== initialTitle ||
      body !== initialBody ||
      mood !== initialMood ||
      JSON.stringify(tags) !== JSON.stringify(initialTags)) && saveStatus !== 'saved';

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges && !isPreviewMode) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [title, body, mood, tags, initialTitle, initialBody, initialMood, initialTags, saveStatus, isPreviewMode]);

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
      mood !== initialMood ||
      JSON.stringify(tags) !== JSON.stringify(initialTags);

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
      mood !== initialMood ||
      JSON.stringify(tags) !== JSON.stringify(initialTags);

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

              {/* Tags Display */}
              {tags && tags.length > 0 && (
                <div className="mb-6">
                  <div className="flex flex-wrap gap-2">
                    {tags.map((tag) => (
                      <span
                        key={tag}
                        className={`px-3 py-1.5 rounded-full text-sm font-medium border ${getTagColor(tag)}`}
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
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

          {/* Tags Input */}
          <div className="mb-8">
            <h4 className="text-sm font-semibold text-charcoal mb-3">Tags</h4>
            <TagInput
              tags={tags}
              onChange={setTags}
              suggestions={getSuggestedTags(entries, 10)}
              placeholder="Add tags to organize your entry..."
            />
          </div>

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