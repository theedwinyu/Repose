'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { format, differenceInDays, parse } from 'date-fns';
import { useFolderContext } from '../context/FolderContext';
import Header from '../components/Header';
import CalendarComponent from '../components/Calendar';

export default function Dashboard() {
  const router = useRouter();
  const { folderHandle, userConfig, entries, setFolderHandle, setUserConfig, setEntries } = useFolderContext();
  const [activeStartDate, setActiveStartDate] = useState<Date>(new Date());
  const [isMounted, setIsMounted] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (isMounted && (!folderHandle || !userConfig)) {
      router.push('/');
    }
  }, [folderHandle, userConfig, router, isMounted]);

  if (!isMounted || !folderHandle || !userConfig) {
    return null;
  }

  // Calculate stats
  const totalEntries = entries.size;
  
  // Calculate streak
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
  
  const moodCounts = {
    happy: 0,
    neutral: 0,
    sad: 0,
  };

  entries.forEach((entry) => {
    moodCounts[entry.mood]++;
  });

  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const hasEntryToday = entries.has(todayStr);

  // Filter entries based on search query
  const filteredEntries = Array.from(entries.entries())
    .filter(([_, entry]) => {
      if (!searchQuery.trim()) return true;
      const query = searchQuery.toLowerCase();
      return entry.title.toLowerCase().includes(query);
    })
    .sort((a, b) => b[1].timestamp.localeCompare(a[1].timestamp));

  // Get recent entries (top 5 from filtered if searching, otherwise all entries)
  const recentEntries = searchQuery.trim() 
    ? filteredEntries.slice(0, 10) // Show more results when searching
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

  const moodEmojis = {
    happy: '😊',
    neutral: '😐',
    sad: '😢',
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-800">
      <Header title="📔 Journal" />

      <main className="max-w-7xl mx-auto p-6">
        {/* Welcome Section */}
        <div className="mb-10">
          <h2 className="text-4xl font-bold text-zinc-100 mb-3 tracking-tight">
            Welcome back, {userConfig.name}! 👋
          </h2>
          <p className="text-zinc-400 text-lg font-medium">
            {format(new Date(), 'EEEE, MMMM d, yyyy')}
          </p>
        </div>

        {/* Search Bar */}
        <div className="mb-8">
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search your journal..."
              className="w-full bg-zinc-800/60 border border-zinc-700/50 text-zinc-100 pl-12 pr-5 py-4 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all placeholder:text-zinc-500 backdrop-blur-sm"
            />
            <svg className="w-5 h-5 text-zinc-400 absolute left-4 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-100 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
          {searchQuery && (
            <p className="text-sm text-zinc-400 mt-2">
              Found {filteredEntries.length} {filteredEntries.length === 1 ? 'entry' : 'entries'}
            </p>
          )}
        </div>

        {/* Only show stats and calendar when not searching */}
        {!searchQuery && (
          <>
            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-10">
              <div className="bg-gradient-to-br from-purple-900/40 to-purple-800/20 border border-purple-700/30 rounded-2xl p-6 text-center card-hover backdrop-blur-sm">
                <div className="text-4xl mb-3">📔</div>
                <div className="text-3xl font-bold text-purple-300 mb-1">{totalEntries}</div>
                <div className="text-sm font-medium text-zinc-400 uppercase tracking-wider">Days Journaled</div>
              </div>

              <div className="bg-gradient-to-br from-orange-900/40 to-orange-800/20 border border-orange-700/30 rounded-2xl p-6 text-center card-hover backdrop-blur-sm">
                <div className="text-4xl mb-3">🔥</div>
                <div className="text-3xl font-bold text-orange-400 mb-1">{streak}</div>
                <div className="text-sm font-medium text-zinc-400 uppercase tracking-wider">Day Streak</div>
              </div>

              <div className="bg-gradient-to-br from-green-900/40 to-green-800/20 border border-green-700/30 rounded-2xl p-6 text-center card-hover backdrop-blur-sm">
                <div className="text-4xl mb-3">😊</div>
                <div className="text-3xl font-bold text-green-400 mb-1">{moodCounts.happy}</div>
                <div className="text-sm font-medium text-zinc-400 uppercase tracking-wider">Happy Days</div>
              </div>

              <div className="bg-gradient-to-br from-yellow-900/40 to-yellow-800/20 border border-yellow-700/30 rounded-2xl p-6 text-center card-hover backdrop-blur-sm">
                <div className="text-4xl mb-3">😐</div>
                <div className="text-3xl font-bold text-yellow-400 mb-1">{moodCounts.neutral}</div>
                <div className="text-sm font-medium text-zinc-400 uppercase tracking-wider">Neutral Days</div>
              </div>

              <div className="bg-gradient-to-br from-blue-900/40 to-blue-800/20 border border-blue-700/30 rounded-2xl p-6 text-center card-hover backdrop-blur-sm">
                <div className="text-4xl mb-3">😢</div>
                <div className="text-3xl font-bold text-blue-400 mb-1">{moodCounts.sad}</div>
                <div className="text-sm font-medium text-zinc-400 uppercase tracking-wider">Sad Days</div>
              </div>
            </div>

            {/* Calendar Section */}
            <div className="glass rounded-2xl p-8 mb-8 backdrop-blur-xl">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-2xl font-bold text-zinc-100 tracking-tight mb-1">Your Journal Calendar</h3>
                  <p className="text-sm text-zinc-400 font-medium">
                    Click on any date to view or create a journal entry.
                  </p>
                </div>
                <button
                  onClick={goToToday}
                  className="bg-blue-600 hover:bg-blue-500 text-white font-semibold py-2.5 px-5 rounded-xl transition-all duration-200 text-sm shadow-lg shadow-blue-900/30 hover:shadow-xl hover:shadow-blue-900/40 hover:-translate-y-0.5"
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

            {/* Write Today's Entry Button */}
            {!hasEntryToday && (
              <button
                onClick={handleWriteToday}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-semibold py-5 px-6 rounded-2xl transition-all duration-200 mb-8 flex items-center justify-center gap-3 shadow-xl shadow-blue-900/30 hover:shadow-2xl hover:shadow-blue-900/40 hover:-translate-y-1"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                </svg>
                <span className="text-lg">Write Today's Entry</span>
              </button>
            )}
          </>
        )}

        {/* Recent/Search Results */}
        <div className="glass rounded-2xl p-8 mb-8 backdrop-blur-xl">
          <h3 className="text-2xl font-bold text-zinc-100 mb-6 tracking-tight">
            {searchQuery ? 'Search Results' : 'Recent Entries'}
          </h3>
          
          {recentEntries.length === 0 ? (
            <div className="text-center py-16">
              <div className="text-6xl mb-5">
                {searchQuery ? '🔍' : '✨'}
              </div>
              <p className="text-zinc-300 text-xl mb-2 font-semibold">
                {searchQuery ? 'No entries found' : 'No journal entries yet'}
              </p>
              <p className="text-zinc-500 text-sm">
                {searchQuery ? 'Try a different search term' : 'Start writing to see your entries here'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentEntries.map(([dateStr, entry]) => (
                <button
                  key={dateStr}
                  onClick={() => handleDateClick(parse(dateStr, 'yyyy-MM-dd', new Date()))}
                  className="w-full bg-zinc-800/40 hover:bg-zinc-700/60 border border-zinc-700/50 hover:border-zinc-600/50 rounded-xl p-5 transition-all duration-200 text-left flex items-center gap-4 card-hover backdrop-blur-sm"
                >
                  <span className="text-4xl">{moodEmojis[entry.mood]}</span>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-zinc-100 font-semibold truncate text-lg">{entry.title}</h4>
                    <p className="text-zinc-400 text-sm font-medium">
                      {format(parse(dateStr, 'yyyy-MM-dd', new Date()), 'MMMM d, yyyy')}
                    </p>
                  </div>
                  <svg className="w-5 h-5 text-zinc-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Change Folder Button */}
        <div className="text-center">
          <button
            onClick={handleChangeFolder}
            className="text-zinc-500 hover:text-zinc-300 text-sm font-medium transition-colors"
          >
            Select Different Folder
          </button>
        </div>
      </main>
    </div>
  );
}