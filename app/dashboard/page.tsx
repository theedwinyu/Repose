'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { format, differenceInDays, parse, startOfWeek, endOfWeek, eachDayOfInterval, subDays } from 'date-fns';
import { useFolderContext } from '../context/FolderContext';
import Header from '../components/Header';
import CalendarComponent from '../components/Calendar';

export default function Dashboard() {
  const router = useRouter();
  const { folderHandle, userConfig, entries, setFolderHandle, setUserConfig, setEntries } = useFolderContext();
  const [activeStartDate, setActiveStartDate] = useState<Date>(new Date());
  const [isMounted, setIsMounted] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [greeting, setGreeting] = useState('');

  useEffect(() => {
    setIsMounted(true);
    
    // Set time-based greeting
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

  // Calculate this week's entries
  const thisWeekStart = startOfWeek(new Date(), { weekStartsOn: 0 });
  const thisWeekEnd = endOfWeek(new Date(), { weekStartsOn: 0 });
  const thisWeekEntries = Array.from(entries.keys()).filter(dateStr => {
    const date = parse(dateStr, 'yyyy-MM-dd', new Date());
    return date >= thisWeekStart && date <= thisWeekEnd;
  }).length;

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

  const moodEmojis = {
    happy: '😊',
    neutral: '😐',
    sad: '😢',
  };

  // Get last 7 days for mini activity view
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-800">
      <Header title="📔 Journal" />

      <main className="max-w-7xl mx-auto p-6">
        {/* Welcome Section with Quick Stats */}
        <div className="mb-10">
          <div className="flex items-start justify-between mb-6">
            <div className="flex-1">
              <h2 className="text-4xl md:text-5xl font-bold text-zinc-100 mb-2 tracking-tight animate-fade-in">
                {greeting}, {userConfig.name}! 👋
              </h2>
              <p className="text-zinc-400 text-lg font-medium animate-slide-in">
                {format(new Date(), 'EEEE, MMMM d, yyyy')}
              </p>
            </div>

            {/* This Week Summary */}
            <div className="glass rounded-2xl p-6 backdrop-blur-xl text-center min-w-[160px]">
              <div className="text-sm text-zinc-400 mb-1 uppercase tracking-wider">This Week</div>
              <div className="text-4xl font-bold text-blue-400 mb-1">{thisWeekEntries}</div>
              <div className="text-xs text-zinc-500">entries written</div>
            </div>
          </div>

          {/* Week Activity Heatmap */}
          <div className="glass rounded-2xl p-6 backdrop-blur-xl mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider">Your Week</h3>
              <div className="text-xs text-zinc-500">Last 7 days</div>
            </div>
            <div className="grid grid-cols-7 gap-2">
              {last7Days.map((day, idx) => (
                <button
                  key={idx}
                  onClick={() => day.hasEntry && handleDateClick(parse(day.dateStr, 'yyyy-MM-dd', new Date()))}
                  className={`aspect-square rounded-xl transition-all duration-200 flex flex-col items-center justify-center gap-1 ${
                    day.hasEntry
                      ? 'bg-blue-600/20 border-2 border-blue-500/30 hover:bg-blue-600/30 hover:scale-105 cursor-pointer'
                      : 'bg-zinc-800/30 border-2 border-zinc-700/20'
                  }`}
                >
                  <div className="text-xs text-zinc-400 font-medium">{day.date}</div>
                  {day.mood && <div className="text-2xl">{moodEmojis[day.mood]}</div>}
                  {!day.mood && <div className="w-2 h-2 rounded-full bg-zinc-600" />}
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
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-10 animate-scale-in" style={{ animationDelay: '0.2s' }}>
              <div className="bg-gradient-to-br from-purple-900/40 to-purple-800/20 border border-purple-700/30 rounded-2xl p-6 text-center card-hover backdrop-blur-sm">
                <div className="text-4xl mb-3">📔</div>
                <div className="text-3xl font-bold text-purple-300 mb-1">{totalEntries}</div>
                <div className="text-sm font-medium text-zinc-400 uppercase tracking-wider">Total Entries</div>
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
            <div className="glass rounded-2xl p-8 mb-8 backdrop-blur-xl animate-slide-in" style={{ animationDelay: '0.3s' }}>
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
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-semibold py-6 px-6 rounded-2xl transition-all duration-200 mb-8 flex items-center justify-center gap-3 shadow-xl shadow-blue-900/30 hover:shadow-2xl hover:shadow-blue-900/40 hover:-translate-y-1 animate-scale-in" 
                style={{ animationDelay: '0.4s' }}
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
        <div className="glass rounded-2xl p-8 mb-8 backdrop-blur-xl animate-slide-in" style={{ animationDelay: '0.5s' }}>
          <h3 className="text-2xl font-bold text-zinc-100 mb-6 tracking-tight">
            {searchQuery ? 'Search Results' : 'Recent Entries'}
          </h3>
          
          {recentEntries.length === 0 ? (
            <div className="text-center py-20">
              <div className="text-7xl mb-6 animate-bounce" style={{ animationDuration: '2s' }}>
                {searchQuery ? '🔍' : '✨'}
              </div>
              <p className="text-zinc-300 text-2xl mb-3 font-semibold">
                {searchQuery ? 'No entries found' : 'No journal entries yet'}
              </p>
              <p className="text-zinc-500 mb-8">
                {searchQuery ? 'Try a different search term' : 'Start your journaling journey today'}
              </p>
              {!searchQuery && (
                <button
                  onClick={handleWriteToday}
                  className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200 shadow-lg shadow-blue-900/30 hover:shadow-xl hover:shadow-blue-900/40 hover:-translate-y-0.5"
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
              {recentEntries.map(([dateStr, entry]) => (
                <button
                  key={dateStr}
                  onClick={() => handleDateClick(parse(dateStr, 'yyyy-MM-dd', new Date()))}
                  className="w-full bg-zinc-800/40 hover:bg-zinc-700/60 border border-zinc-700/50 hover:border-zinc-600/50 rounded-xl p-5 transition-all duration-200 text-left flex items-center gap-4 card-hover backdrop-blur-sm group"
                >
                  <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-zinc-900/50 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <span className="text-3xl">{moodEmojis[entry.mood]}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-zinc-100 font-semibold truncate text-lg mb-1 group-hover:text-blue-400 transition-colors">{entry.title}</h4>
                    <p className="text-zinc-400 text-sm font-medium">
                      {format(parse(dateStr, 'yyyy-MM-dd', new Date()), 'MMMM d, yyyy • EEEE')}
                    </p>
                  </div>
                  <svg className="w-5 h-5 text-zinc-500 flex-shrink-0 group-hover:text-blue-400 group-hover:translate-x-1 transition-all" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="text-center flex items-center justify-center gap-6 text-sm">
          <button
            onClick={handleChangeFolder}
            className="text-zinc-500 hover:text-zinc-300 font-medium transition-colors"
          >
            Select Different Folder
          </button>
          <span className="text-zinc-700">•</span>
          <span className="text-zinc-500">
            {totalEntries} {totalEntries === 1 ? 'entry' : 'entries'} • {streak} day streak
          </span>
        </div>
      </main>

      {/* Floating Action Button for New Entry */}
      <button
        onClick={handleWriteToday}
        className="fixed bottom-8 right-8 w-16 h-16 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 rounded-full shadow-2xl flex items-center justify-center text-white hover:scale-110 transition-all duration-200 z-50 animate-scale-in"
        style={{ animationDelay: '0.6s' }}
        title="Write new entry"
      >
        <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
        </svg>
      </button>
    </div>
  );
}