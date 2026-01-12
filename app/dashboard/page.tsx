'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { format, parse, startOfWeek, endOfWeek, subDays } from 'date-fns';
import dynamic from 'next/dynamic';
import { useFolderContext } from '../context/FolderContext';
import { readEntry } from '../lib/fileSystem';
import Header from '../components/Header';
import TagCloud from '../components/TagCloud';
import TagManagement from '../components/TagManagement';
import { getAllTags, filterEntriesByTags, renameTagInEntries, deleteTagFromEntries, mergeTagsInEntries } from '../utils/tagUtils';
import { getTagColor } from '../types';
import type { Mood } from "../types";

// PERFORMANCE: Dynamic import Calendar to reduce initial bundle
const CalendarComponent = dynamic(() => import('../components/Calendar'), {
  loading: () => (
    <div className="serene-card rounded-2xl p-8 h-96 flex items-center justify-center">
      <div className="w-8 h-8 spinner-serene rounded-full"></div>
    </div>
  ),
  ssr: false
});

// PERFORMANCE: Dynamic import Fuse.js
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let Fuse: any = null;
if (typeof window !== 'undefined') {
  import('fuse.js').then(mod => {
    Fuse = mod.default;
  });
}

export default function Dashboard() {
  const router = useRouter();
  const { folderHandle, userConfig, entries, setFolderHandle, setUserConfig, setEntries } = useFolderContext();
  const [activeStartDate, setActiveStartDate] = useState<Date>(new Date());
  const [isMounted, setIsMounted] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [greeting, setGreeting] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [showTagManagement, setShowTagManagement] = useState(false);
  const [isUpdatingTags, setIsUpdatingTags] = useState(false);

  const [searchableEntries, setSearchableEntries] = useState<Array<{
    dateStr: string;
    title: string;
    mood: Mood,
    timestamp: string;
    content: string;
    tags?: string[];
  }>>([]);

  // PERFORMANCE: Debounce search input (300ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);
    
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Get all available tags
  const allTags = useMemo(() => getAllTags(entries), [entries]);

  // PERFORMANCE: Memoized fuse instance with tags support
  const fuse = useMemo(() => {
    if (!Fuse || searchableEntries.length === 0) return null;
    
    return new Fuse(searchableEntries, {
      keys: [
        { name: 'title', weight: 2 },
        { name: 'content', weight: 1 },
        { name: 'tags', weight: 1.5 },
      ],
      threshold: 0.3,
      includeScore: true,
      minMatchCharLength: 2,
      ignoreLocation: true,
    });
  }, [searchableEntries]);

  // Filter entries by tags first, then by search query
  const filteredEntries = useMemo(() => {
    if (!entries) return [];
    
    // First apply tag filter (always use OR logic)
    let tagFiltered = entries;
    if (selectedTags.length > 0) {
      tagFiltered = filterEntriesByTags(entries, selectedTags, 'OR');
    }
    
    // Then apply search filter
    if (!debouncedSearchQuery.trim()) {
      return Array.from(tagFiltered.entries())
        .sort((a, b) => b[1].timestamp.localeCompare(a[1].timestamp));
    }

    if (!fuse) {
      return Array.from(tagFiltered.entries())
        .sort((a, b) => b[1].timestamp.localeCompare(a[1].timestamp));
    }

    const results = fuse.search(debouncedSearchQuery);
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return results.map((result: any) => {
      const dateStr = result.item.dateStr;
      const entry = tagFiltered.get(dateStr);
      return [dateStr, entry] as [string, typeof entry];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    }).filter((item: any): item is [string, NonNullable<typeof item[1]>] => item[1] !== undefined);
  }, [debouncedSearchQuery, entries, fuse, selectedTags]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setIsMounted(true);
      
      const hour = new Date().getHours();
      if (hour < 12) setGreeting('Good morning');
      else if (hour < 18) setGreeting('Good afternoon');
      else setGreeting('Good evening');
    }, 0);
    
    return () => clearTimeout(timeoutId);
  }, []);

  useEffect(() => {
    if (isMounted && (!folderHandle || !userConfig)) {
      router.push('/');
    }
  }, [folderHandle, userConfig, router, isMounted]);

  useEffect(() => {
    async function loadEntriesForSearch() {
      if (!folderHandle) return;
      
      const entriesWithContent = await Promise.all(
        Array.from(entries.entries()).map(async ([dateStr, entry]) => {
          try {
            const fullEntry = await readEntry(folderHandle, dateStr);
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = fullEntry?.body || '';
            const textContent = tempDiv.textContent || tempDiv.innerText || '';
            
            return {
              dateStr,
              title: entry.title,
              mood: entry.mood,
              timestamp: entry.timestamp,
              content: textContent,
              tags: entry.tags || [],
            };
          } catch (err) {
            console.error(`Failed to load entry ${dateStr}:`, err);
            return {
              dateStr,
              title: entry.title,
              mood: entry.mood,
              timestamp: entry.timestamp,
              content: '',
              tags: entry.tags || [],
            };
          }
        })
      );
      
      setSearchableEntries(entriesWithContent);
    }

    if (entries.size > 0) {
      loadEntriesForSearch();
    }
  }, [entries, folderHandle]);

  // Tag management handlers
  const handleRenameTag = async (oldTag: string, newTag: string) => {
    if (!folderHandle) return;
    
    setIsUpdatingTags(true);
    try {
      const updatedEntries = renameTagInEntries(entries, oldTag, newTag);
      
      const { writeEntry } = await import('../lib/fileSystem');
      
      // Only write entries that were actually updated
      for (const [dateStr, entry] of updatedEntries) {
        const fullEntry = await readEntry(folderHandle, dateStr);
        if (fullEntry) {
          await writeEntry(folderHandle, dateStr, {
            title: fullEntry.title,
            mood: fullEntry.mood,
            timestamp: fullEntry.timestamp,
            weatherContext: fullEntry.weatherContext,
            tags: entry.tags,
            createdAt: entry.createdAt,
            updatedAt: entry.updatedAt,
          }, fullEntry.body);
        }
      }
      
      // Update all entries in state, not just updated ones
      const newEntries = new Map(entries);
      updatedEntries.forEach((entry, dateStr) => {
        newEntries.set(dateStr, entry);
      });
      setEntries(newEntries);
      
      if (selectedTags.includes(oldTag)) {
        setSelectedTags(prev => prev.map(t => t === oldTag ? newTag : t));
      }
    } catch (error) {
      console.error('Failed to rename tag:', error);
      throw error;
    } finally {
      setIsUpdatingTags(false);
    }
  };

  const handleDeleteTag = async (tag: string) => {
    if (!folderHandle) return;
    
    setIsUpdatingTags(true);
    try {
      const updatedEntries = deleteTagFromEntries(entries, tag);
      
      const { writeEntry } = await import('../lib/fileSystem');
      for (const [dateStr, entry] of updatedEntries) {
        const fullEntry = await readEntry(folderHandle, dateStr);
        if (fullEntry) {
          await writeEntry(folderHandle, dateStr, {
            title: fullEntry.title,
            mood: fullEntry.mood,
            timestamp: fullEntry.timestamp,
            weatherContext: fullEntry.weatherContext,
            tags: entry.tags,
            createdAt: entry.createdAt,
            updatedAt: entry.updatedAt,
          }, fullEntry.body);
        }
      }
      
      const newEntries = new Map(entries);
      updatedEntries.forEach((entry, dateStr) => {
        newEntries.set(dateStr, entry);
      });
      setEntries(newEntries);
      
      setSelectedTags(prev => prev.filter(t => t !== tag));
    } catch (error) {
      console.error('Failed to delete tag:', error);
      throw error;
    } finally {
      setIsUpdatingTags(false);
    }
  };

  const handleMergeTags = async (tagsToMerge: string[], targetTag: string) => {
    if (!folderHandle) return;
    
    setIsUpdatingTags(true);
    try {
      const updatedEntries = mergeTagsInEntries(entries, tagsToMerge, targetTag);
      
      const { writeEntry } = await import('../lib/fileSystem');
      for (const [dateStr, entry] of updatedEntries) {
        const fullEntry = await readEntry(folderHandle, dateStr);
        if (fullEntry) {
          await writeEntry(folderHandle, dateStr, {
            title: fullEntry.title,
            mood: fullEntry.mood,
            timestamp: fullEntry.timestamp,
            weatherContext: fullEntry.weatherContext,
            tags: entry.tags,
            createdAt: entry.createdAt,
            updatedAt: entry.updatedAt,
          }, fullEntry.body);
        }
      }
      
      const newEntries = new Map(entries);
      updatedEntries.forEach((entry, dateStr) => {
        newEntries.set(dateStr, entry);
      });
      setEntries(newEntries);
      
      setSelectedTags(prev => {
        const filtered = prev.filter(t => !tagsToMerge.includes(t));
        return filtered.includes(targetTag) ? filtered : [...filtered, targetTag];
      });
    } catch (error) {
      console.error('Failed to merge tags:', error);
      throw error;
    } finally {
      setIsUpdatingTags(false);
    }
  };

  const handleTagClick = (tag: string) => {
    setSelectedTags(prev => 
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  if (!isMounted || !folderHandle || !userConfig) {
    return null;
  }

  const totalEntries = entries.size;

  const moodCounts = {
    peaceful: 0,
    content: 0,
    neutral: 0,
    reflective: 0,
    heavy: 0,
  };

  entries.forEach((entry) => {
    const mood = entry.mood;
    if (mood in moodCounts) {
      moodCounts[mood as keyof typeof moodCounts]++;
    }
  });

  const calculateTotalWords = () => {
    let totalWords = 0;
    searchableEntries.forEach((entry) => {
      if (entry.content) {
        const text = entry.content.replace(/<[^>]*>/g, ' ');
        const words = text.trim().split(/\s+/).filter(word => word.length > 0);
        totalWords += words.length;
      }
    });
    return totalWords;
  };

  const totalWords = calculateTotalWords();

  const thisWeekStart = startOfWeek(new Date(), { weekStartsOn: 0 });
  const thisWeekEnd = endOfWeek(new Date(), { weekStartsOn: 0 });
  const thisWeekEntries = Array.from(entries.keys()).filter(dateStr => {
    const date = parse(dateStr, 'yyyy-MM-dd', new Date());
    return date >= thisWeekStart && date <= thisWeekEnd;
  }).length;

  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const hasEntryToday = entries.has(todayStr);

  const recentEntries = (searchQuery.trim() || selectedTags.length > 0)
    ? filteredEntries.slice(0, 10)
    : filteredEntries.slice(0, 5);

  const handleDateClick = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    router.push(`/journal/${dateStr}`);
  };

  const handleWriteToday = () => {
    router.push(`/journal/${todayStr}`);
  };

  const handleChangeFolder = () => {
    setFolderHandle(null);
    setUserConfig(null);
    setEntries(new Map());
    router.push('/');
  };

  const goToToday = () => {
    setActiveStartDate(new Date());
  };

  const moodEmojis: Record<string, string> = {
    peaceful: '😌',
    content: '😊',
    neutral: '😐',
    reflective: '😔',
    heavy: '😢',
  };

  const getLast7Days = () => {
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const date = subDays(new Date(), i);
      const dateStr = format(date, 'yyyy-MM-dd');
      const entry = entries.get(dateStr);
      days.push({
        date: format(date, 'EEE'),
        dateStr,
        mood: entry?.mood || null,
        hasEntry: !!entry,
      });
    }
    return days;
  };

  const last7Days = getLast7Days();

  const getSearchPreview = (dateStr: string, maxLength: number = 100): string => {
    const searchableEntry = searchableEntries.find(e => e.dateStr === dateStr);
    if (!searchableEntry || !searchQuery.trim()) return '';
    
    const content = searchableEntry.content;
    const query = searchQuery.toLowerCase();
    const index = content.toLowerCase().indexOf(query);
    
    if (index === -1) return '';
    
    const start = Math.max(0, index - 20);
    const end = Math.min(content.length, index + maxLength);
    let snippet = content.slice(start, end);
    
    if (start > 0) snippet = '...' + snippet;
    if (end < content.length) snippet = snippet + '...';
    
    return snippet;
  };

  return (
    <div className="min-h-screen bg-gradient-serene">
      <Header title="Dashboard" />

      <main className="max-w-7xl mx-auto p-6">
        {/* Welcome Section - ORIGINAL LAYOUT */}
        <div className="mb-10">
          <div className="flex items-start justify-between mb-6">
            <div className="flex-1">
              <h2 className="text-4xl md:text-5xl font-bold text-charcoal mb-2 tracking-tight animate-fade-in" style={{ fontFamily: 'var(--font-display)' }}>
                {greeting}, {userConfig.name}
              </h2>
              <p className="text-warm-gray text-lg font-medium animate-slide-in">
                {format(new Date(), 'EEEE, MMMM d, yyyy')}
              </p>
            </div>

            <div className="serene-card rounded-2xl p-6 text-center min-w-[160px]">
              <div className="text-sm text-warm-gray mb-1 uppercase tracking-wider">This Week</div>
              <div className="text-4xl font-bold text-sage mb-1">{thisWeekEntries}</div>
              <div className="text-xs text-light-muted">entries written</div>
            </div>
          </div>

          {/* Week Activity Heatmap - ORIGINAL */}
          <div className="serene-card rounded-2xl p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-charcoal uppercase tracking-wider">Your Week</h3>
              <div className="text-xs text-light-muted">Last 7 days</div>
            </div>
            <div className="grid grid-cols-7 gap-2">
              {last7Days.map((day, idx) => (
                <button
                  key={idx}
                  onClick={() => day.hasEntry && handleDateClick(parse(day.dateStr, 'yyyy-MM-dd', new Date()))}
                  className={`aspect-square rounded-xl transition-all duration-200 flex flex-col items-center justify-center gap-1 ${
                    day.hasEntry
                      ? 'bg-sage/10 border-2 border-sage/30 hover:bg-sage/20 hover:scale-105 cursor-pointer'
                      : 'bg-light-gray border-2 border-sage/10'
                  }`}
                >
                  <div className="text-xs text-warm-gray font-medium">{day.date}</div>
                  {day.mood && <div className="text-2xl">{moodEmojis[day.mood]}</div>}
                  {!day.mood && <div className="w-2 h-2 rounded-full bg-light-muted" />}
                </button>
              ))}
            </div>
          </div>

          {/* Create Today's Entry Button - ORIGINAL */}
          {!hasEntryToday && (
            <button
              onClick={handleWriteToday}
              className="w-full btn-primary text-white font-semibold py-6 px-6 rounded-2xl transition-all duration-300 mb-6 flex items-center justify-center gap-3 animate-scale-in shadow-lg hover:shadow-xl" 
              style={{ animationDelay: '0.15s' }}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
              </svg>
              <span className="text-lg">Create Today&apos;s Entry</span>
            </button>
          )}
        </div>

        {/* Search Bar - ORIGINAL */}
        <div className="mb-8 animate-slide-in" style={{ animationDelay: '0.1s' }}>
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search your reflections..."
              className="w-full bg-soft-white border border-sage/20 text-charcoal pl-12 pr-5 py-4 rounded-xl focus:outline-none focus:border-sage focus:ring-2 focus:ring-sage/10 transition-all placeholder:text-light-muted shadow-serene"
            />
            <svg className="w-5 h-5 text-warm-gray absolute left-4 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-warm-gray hover:text-charcoal transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
          {searchQuery && (
            <div className="flex items-center gap-2 mt-2">
              <p className="text-sm text-warm-gray">
                Found {filteredEntries.length} {filteredEntries.length === 1 ? 'entry' : 'entries'}
              </p>
              {filteredEntries.length > 0 && (
                <div className="flex items-center gap-1 text-xs text-light-muted">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Fuzzy search enabled
                </div>
              )}
            </div>
          )}
        </div>

        {!searchQuery && !selectedTags.length && (
          <>
            {/* Summary Cards - ORIGINAL */}
            <div className="grid grid-cols-2 gap-4 mb-8 animate-scale-in" style={{ animationDelay: '0.2s' }}>
              <div className="serene-card bg-gradient-to-br from-sage/8 to-sage-light/5 rounded-2xl p-6 text-center card-hover">
                <div className="text-4xl mb-3">📔</div>
                <div className="text-3xl font-bold text-sage-dark mb-1">{totalEntries}</div>
                <div className="text-sm font-medium text-warm-gray uppercase tracking-wider">Total Reflections</div>
              </div>

              <div className="serene-card bg-gradient-to-br from-aqua/8 to-aqua-light/5 rounded-2xl p-6 text-center card-hover">
                <div className="text-4xl mb-3">✍️</div>
                <div className="text-3xl font-bold text-aqua-dark mb-1">{totalWords.toLocaleString()}</div>
                <div className="text-sm font-medium text-warm-gray uppercase tracking-wider">Words Written</div>
              </div>
            </div>

            {/* Emotional Landscape - ORIGINAL with tag cloud added */}
            <div className="serene-card rounded-2xl p-8 mb-8 animate-slide-in" style={{ animationDelay: '0.25s' }}>
              <div className="mb-6">
                <h3 className="text-2xl font-bold text-charcoal tracking-tight mb-1" style={{ fontFamily: 'var(--font-display)' }}>
                  Your Emotional Landscape
                </h3>
                <p className="text-sm text-warm-gray">
                  {totalEntries} {totalEntries === 1 ? 'reflection' : 'reflections'} recorded
                </p>
              </div>

              <div className="space-y-4">
                {[
                  { mood: 'peaceful', emoji: '😌', label: 'Peaceful', color: 'sage', count: moodCounts.peaceful },
                  { mood: 'content', emoji: '😊', label: 'Content', color: 'aqua', count: moodCounts.content },
                  { mood: 'neutral', emoji: '😐', label: 'Neutral', color: 'sand', count: moodCounts.neutral },
                  { mood: 'reflective', emoji: '😔', label: 'Reflective', color: 'lavender', count: moodCounts.reflective },
                  { mood: 'heavy', emoji: '😢', label: 'Heavy', color: 'sky', count: moodCounts.heavy },
                ].map(({ mood, emoji, label, color, count }) => {
                  const percentage = totalEntries > 0 ? (count / totalEntries) * 100 : 0;
                  const barWidth = count > 0 ? Math.max(percentage, 5) : 0;
                  
                  return (
                    <div key={mood} className="flex items-center gap-4">
                      <div className="flex items-center gap-2 w-32 flex-shrink-0">
                        <span className="text-2xl">{emoji}</span>
                        <span className="text-sm font-medium text-charcoal">{label}</span>
                      </div>
                      <div className="flex-1 flex items-center gap-3">
                        <div className="flex-1 h-8 bg-light-gray rounded-full overflow-hidden relative">
                          {count > 0 && (
                            <div 
                              className="h-full rounded-full transition-all duration-500 absolute top-0 left-0"
                              style={{ 
                                width: `${barWidth}%`,
                                background: color === 'sage' ? 'linear-gradient(to right, #7FC5B8, #A8DDD3)' :
                                           color === 'aqua' ? 'linear-gradient(to right, #6BC9C9, #9BE0E0)' :
                                           color === 'sand' ? 'linear-gradient(to right, #D8E8C4, #EEF5E0)' :
                                           color === 'lavender' ? 'linear-gradient(to right, #D4C5E0, #EAE0F0)' :
                                           'linear-gradient(to right, #C5D8E8, #E0EAF5)'
                              }}
                            />
                          )}
                        </div>
                        <span className="text-lg font-semibold text-charcoal w-12 text-right">{count}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Calendar Section - ORIGINAL */}
            <div className="serene-card rounded-2xl p-8 mb-8 animate-slide-in" style={{ animationDelay: '0.3s' }}>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-2xl font-bold text-charcoal tracking-tight mb-1" style={{ fontFamily: 'var(--font-display)' }}>Your Journey</h3>
                  <p className="text-sm text-warm-gray font-medium">
                    Click any date to reflect or create an entry
                  </p>
                </div>
                <button
                  onClick={goToToday}
                  className="btn-secondary text-charcoal font-semibold py-2.5 px-5 rounded-xl transition-all duration-200 text-sm"
                >
                  Today
                </button>
              </div>
              
              <CalendarComponent
                entries={entries}
                onDateClick={handleDateClick}
                activeStartDate={activeStartDate}
                onActiveStartDateChange={setActiveStartDate}
              />
            </div>
          </>
        )}

        {/* Tags Card - NEW Separate Card - ALWAYS VISIBLE */}
        {allTags.length > 0 && (
          <div className="serene-card rounded-2xl p-8 mb-8 animate-slide-in" style={{ animationDelay: '0.28s' }}>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-2xl font-bold text-charcoal tracking-tight mb-1" style={{ fontFamily: 'var(--font-display)' }}>
                  Your Tags
                </h3>
                <p className="text-sm text-warm-gray">
                  {selectedTags.length > 0 
                    ? `Filtering by ${selectedTags.length} ${selectedTags.length === 1 ? 'tag' : 'tags'}`
                    : `${allTags.length} ${allTags.length === 1 ? 'tag' : 'tags'} to organize your reflections`
                  }
                </p>
              </div>
              <div className="flex items-center gap-3">
                {selectedTags.length > 0 && (
                  <button
                    onClick={() => setSelectedTags([])}
                    className="text-sm text-warm-gray hover:text-sage transition-colors font-medium"
                  >
                    Clear filters
                  </button>
                )}
                <button
                  onClick={() => setShowTagManagement(true)}
                  className="btn-secondary text-charcoal font-semibold py-2.5 px-5 rounded-xl transition-all duration-200 text-sm"
                >
                  Manage Tags
                </button>
              </div>
            </div>
            
            <TagCloud
              entries={entries}
              onTagClick={handleTagClick}
              selectedTags={selectedTags}
              maxTags={20}
            />
          </div>
        )}

        {/* Recent/Search Results - ORIGINAL with tags added */}
        <div className="serene-card rounded-2xl p-8 mb-8 animate-slide-in" style={{ animationDelay: '0.5s' }}>
          <h3 className="text-2xl font-bold text-charcoal mb-6 tracking-tight" style={{ fontFamily: 'var(--font-display)' }}>
            {searchQuery || selectedTags.length > 0 ? 'Search Results' : 'Recent Reflections'}
          </h3>
          
          {recentEntries.length === 0 ? (
            <div className="text-center py-20 wave-empty-state">
              <div className="text-7xl mb-6 animate-gentle-float">
                {searchQuery || selectedTags.length > 0 ? '🔍' : '🌸'}
              </div>
              <p className="text-charcoal text-2xl mb-3 font-semibold">
                {searchQuery || selectedTags.length > 0 ? 'No entries found' : 'Begin your peaceful practice'}
              </p>
              <p className="text-warm-gray mb-8">
                {searchQuery || selectedTags.length > 0 ? 'Try different keywords or tags' : 'Your journey starts with a single thought'}
              </p>
              {!searchQuery && selectedTags.length === 0 && (
                <button
                  onClick={handleWriteToday}
                  className="inline-flex items-center gap-2 btn-primary text-white font-semibold py-3 px-6 rounded-xl transition-all duration-300"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Create Your First Entry
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              {recentEntries.map(([dateStr, entry]: [string, any]) => {
                const preview = searchQuery ? getSearchPreview(dateStr) : '';
                return (
                  <button
                    key={dateStr}
                    onClick={() => handleDateClick(parse(dateStr, 'yyyy-MM-dd', new Date()))}
                    className="w-full bg-soft-white hover:bg-sage-light/30 border border-sage/15 hover:border-sage/30 rounded-xl p-5 transition-all duration-300 text-left flex items-start gap-4 card-hover group"
                  >
                    <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-light-gray flex items-center justify-center group-hover:scale-110 transition-transform">
                      <span className="text-3xl">{moodEmojis[entry.mood]}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-charcoal font-semibold truncate text-lg mb-1 group-hover:text-sage-dark transition-colors">
                        {entry.title}
                      </h4>
                      <p className="text-warm-gray text-sm font-medium mb-2">
                        {format(parse(dateStr, 'yyyy-MM-dd', new Date()), 'MMMM d, yyyy • EEEE')}
                      </p>
                      {entry.tags && entry.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mb-2">
                          {entry.tags.slice(0, 3).map((tag: string) => (
                            <span
                              key={tag}
                              className={`px-2 py-0.5 rounded-full text-xs font-medium border ${getTagColor(tag)}`}
                            >
                              #{tag}
                            </span>
                          ))}
                          {entry.tags.length > 3 && (
                            <span className="px-2 py-0.5 text-xs text-warm-gray">
                              +{entry.tags.length - 3} more
                            </span>
                          )}
                        </div>
                      )}
                      {preview && (
                        <p className="text-light-muted text-xs leading-relaxed line-clamp-2">
                          {preview}
                        </p>
                      )}
                    </div>
                    <svg className="w-5 h-5 text-light-muted flex-shrink-0 group-hover:text-sage group-hover:translate-x-1 transition-all" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer - ORIGINAL */}
        <div className="text-center flex items-center justify-center gap-6 text-sm">
          <button
            onClick={handleChangeFolder}
            className="text-warm-gray hover:text-charcoal font-medium transition-colors"
          >
            Select Different Folder
          </button>
          <span className="text-light-muted">•</span>
          <span className="text-warm-gray">
            {totalEntries} {totalEntries === 1 ? 'reflection' : 'reflections'} • {totalWords.toLocaleString()} words
          </span>
        </div>
      </main>

      {/* Tag Management Modal */}
      {showTagManagement && (
        <TagManagement
          entries={entries}
          onRenameTag={handleRenameTag}
          onDeleteTag={handleDeleteTag}
          onMergeTags={handleMergeTags}
          onClose={() => setShowTagManagement(false)}
        />
      )}

      {/* Processing Overlay */}
      {isUpdatingTags && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-white rounded-2xl p-6 shadow-2xl flex items-center gap-3">
            <div className="w-6 h-6 spinner-serene rounded-full"></div>
            <span className="text-charcoal font-medium">Updating tags...</span>
          </div>
        </div>
      )}
    </div>
  );
}