'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { format, differenceInDays, parse, startOfWeek, endOfWeek, subDays } from 'date-fns';
import Fuse from 'fuse.js';
import { useFolderContext } from '../context/FolderContext';
import { readEntry } from '../lib/fileSystem';
import Header from '../components/Header';
import CalendarComponent from '../components/Calendar';
import type { Mood } from "../types";

export default function Dashboard() {
  const router = useRouter();
  const { folderHandle, userConfig, entries, setFolderHandle, setUserConfig, setEntries } = useFolderContext();
  const [activeStartDate, setActiveStartDate] = useState<Date>(new Date());
  const [isMounted, setIsMounted] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [greeting, setGreeting] = useState('');

  const [searchableEntries, setSearchableEntries] = useState<Array<{
    dateStr: string;
    title: string;
    mood: Mood,
    timestamp: string;
    content: string;
  }>>([]);

  // Move fuse.js setup before early returns
  const fuse = useMemo(() => {
    return new Fuse(searchableEntries, {
      keys: [
        { name: 'title', weight: 2 },
        { name: 'content', weight: 1 },
      ],
      threshold: 0.3,
      includeScore: true,
      minMatchCharLength: 2,
      ignoreLocation: true,
    });
  }, [searchableEntries]);

  // Move filtered entries logic before early returns
  const filteredEntries = useMemo(() => {
    if (!entries) return [];
    
    if (!searchQuery.trim()) {
      return Array.from(entries.entries())
        .sort((a, b) => b[1].timestamp.localeCompare(a[1].timestamp));
    }

    const results = fuse.search(searchQuery);
    
    return results.map(result => {
      const dateStr = result.item.dateStr;
      const entry = entries.get(dateStr);
      return [dateStr, entry] as [string, typeof entry];
    }).filter((item): item is [string, NonNullable<typeof item[1]>] => item[1] !== undefined);
  }, [searchQuery, entries, fuse]);

  useEffect(() => {
    setIsMounted(true);
    
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Good morning');
    else if (hour < 18) setGreeting('Good afternoon');
    else setGreeting('Good evening');
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
            };
          } catch (err) {
            console.error(`Failed to load entry ${dateStr}:`, err);
            return {
              dateStr,
              title: entry.title,
              mood: entry.mood,
              timestamp: entry.timestamp,
              content: '',
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

  if (!isMounted || !folderHandle || !userConfig) {
    return null;
  }

  const totalEntries = entries.size;
  
  const calculateStreak = () => {
    if (entries.size === 0) return 0;

    const dates = Array.from(entries.keys())
      .map(dateStr => parse(dateStr, 'yyyy-MM-dd', new Date()))
      .sort((a, b) => b.getTime() - a.getTime());

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const mostRecent = dates[0];
    mostRecent.setHours(0, 0, 0, 0);

    const daysDiff = differenceInDays(today, mostRecent);

    if (daysDiff > 1) return 0;

    let streak = 1;
    for (let i = 1; i < dates.length; i++) {
      const current = new Date(dates[i]);
      current.setHours(0, 0, 0, 0);
      const previous = new Date(dates[i - 1]);
      previous.setHours(0, 0, 0, 0);
      
      const diff = differenceInDays(previous, current);
      if (diff === 1) {
        streak++;
      } else {
        break;
      }
    }

    return streak;
  };

  const streak = calculateStreak();
  
  // Mood counts with migration support
  const moodCounts = {
    peaceful: 0,
    content: 0,
    neutral: 0,
    reflective: 0,
    heavy: 0,
  };

  entries.forEach((entry) => {
    // Handle migration from old 3-mood system
    let mood = entry.mood;
    if (mood === 'happy' as any) mood = 'content' as any;
    if (mood === 'sad' as any) mood = 'heavy' as any;
    
    if (mood in moodCounts) {
      moodCounts[mood as keyof typeof moodCounts]++;
    }
  });

  // Calculate total words written across all entries
  const calculateTotalWords = () => {
    let totalWords = 0;
    searchableEntries.forEach((entry) => {
      if (entry.content) {
        // Remove HTML tags and count words
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

  const recentEntries = searchQuery.trim() 
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
    // Migration support for old moods
    happy: '😊',
    sad: '😢',
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
        {/* Welcome Section */}
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

          {/* Week Activity Heatmap */}
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
        </div>

        {/* Search Bar */}
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

        {!searchQuery && (
          <>
            {/* Summary Cards */}
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

            {/* Emotional Landscape - Mood Bar Chart */}
            <div className="serene-card rounded-2xl p-8 mb-8 animate-slide-in" style={{ animationDelay: '0.25s' }}>
              <div className="mb-6">
                <h3 className="text-2xl font-bold text-charcoal tracking-tight mb-1" style={{ fontFamily: 'var(--font-display)' }}>
                  Your Emotional Landscape
                </h3>
                <p className="text-sm text-warm-gray">
                  {totalEntries} {totalEntries === 1 ? 'reflection' : 'reflections'} recorded
                </p>
              </div>
              
              <div className="divider-wave mb-6" />

              <div className="space-y-4">
                {[
                  { mood: 'peaceful', emoji: '😌', label: 'Peaceful', color: 'sage', count: moodCounts.peaceful },
                  { mood: 'content', emoji: '😊', label: 'Content', color: 'aqua', count: moodCounts.content },
                  { mood: 'neutral', emoji: '😐', label: 'Neutral', color: 'sand', count: moodCounts.neutral },
                  { mood: 'reflective', emoji: '😔', label: 'Reflective', color: 'lavender', count: moodCounts.reflective },
                  { mood: 'heavy', emoji: '😢', label: 'Heavy', color: 'sky', count: moodCounts.heavy },
                ].map(({ mood, emoji, label, color, count }) => {
                  const percentage = totalEntries > 0 ? (count / totalEntries) * 100 : 0;
                  const barWidth = count > 0 ? Math.max(percentage, 5) : 0; // Minimum 5% if count > 0
                  
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

            {/* Calendar Section */}
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

            {!hasEntryToday && (
              <button
                onClick={handleWriteToday}
                className="w-full btn-primary text-white font-semibold py-6 px-6 rounded-2xl transition-all duration-300 mb-8 flex items-center justify-center gap-3 animate-scale-in" 
                style={{ animationDelay: '0.4s' }}
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                </svg>
                <span className="text-lg">Create Today's Entry</span>
              </button>
            )}
          </>
        )}

        {/* Recent/Search Results */}
        <div className="serene-card rounded-2xl p-8 mb-8 animate-slide-in" style={{ animationDelay: '0.5s' }}>
          <div className="divider-wave mb-6" />
          <h3 className="text-2xl font-bold text-charcoal mb-6 tracking-tight" style={{ fontFamily: 'var(--font-display)' }}>
            {searchQuery ? 'Search Results' : 'Recent Reflections'}
          </h3>
          
          {recentEntries.length === 0 ? (
            <div className="text-center py-20 wave-empty-state">
              <div className="text-7xl mb-6 animate-gentle-float">
                {searchQuery ? '🔍' : '🌸'}
              </div>
              <p className="text-charcoal text-2xl mb-3 font-semibold">
                {searchQuery ? 'No entries found' : 'Begin your peaceful practice'}
              </p>
              <p className="text-warm-gray mb-8">
                {searchQuery ? 'Try different keywords' : 'Your journey starts with a single thought'}
              </p>
              {!searchQuery && (
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
              {recentEntries.map(([dateStr, entry]) => {
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

        {/* Footer */}
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
    </div>
  );
}