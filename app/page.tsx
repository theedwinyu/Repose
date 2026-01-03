'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useFolderContext } from './context/FolderContext';
import { isFileSystemAccessSupported, openJournalFolder, writeConfig, listEntries, readConfig } from './lib/fileSystem';

export default function Home() {
  const router = useRouter();
  const { folderHandle, setFolderHandle, userConfig, setUserConfig, setEntries } = useFolderContext();
  const [name, setName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [isMounted, setIsMounted] = useState(false);
  const [greeting, setGreeting] = useState('');

  const supported = typeof window !== 'undefined' && isFileSystemAccessSupported();

  useEffect(() => {
    setIsMounted(true);
    
    // Set time-based greeting
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Good morning');
    else if (hour < 18) setGreeting('Good afternoon');
    else setGreeting('Good evening');
  }, []);

  // Simple redirect: if we have both handle and config, go to dashboard
  useEffect(() => {
    if (isMounted && folderHandle && userConfig) {
      router.push('/dashboard');
    }
  }, [isMounted, folderHandle, userConfig, router]);

  const handleSelectFolder = async () => {
    setError('');
    const handle = await openJournalFolder();
    
    if (handle) {
      setFolderHandle(handle);
      
      const existingConfig = await readConfig(handle);
      if (existingConfig) {
        setUserConfig(existingConfig);
        const entriesMap = await listEntries(handle);
        setEntries(entriesMap);
      } else {
        const entriesMap = await listEntries(handle);
        setEntries(entriesMap);
      }
    }
  };

  const handleStartJournaling = async () => {
    if (!name.trim()) {
      setError('Please enter your name');
      return;
    }

    if (!folderHandle) {
      setError('No folder selected');
      return;
    }

    setIsSaving(true);
    setError('');

    try {
      const config = { name: name.trim() };
      await writeConfig(folderHandle, config);
      setUserConfig(config);
    } catch (err) {
      setError('Failed to save configuration');
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  if (!isMounted) {
    return null;
  }

  if (!supported) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-800">
        <div className="max-w-md w-full glass rounded-3xl shadow-2xl p-8 text-center">
          <div className="text-7xl mb-6">🚫</div>
          <h1 className="text-2xl font-bold text-zinc-100 mb-3 tracking-tight">Browser Not Supported</h1>
          <p className="text-zinc-400 leading-relaxed">
            This app requires the File System Access API, which is only available in Chrome and Edge browsers.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-800 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '4s' }} />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '6s', animationDelay: '1s' }} />
      </div>

      <div className="max-w-2xl w-full text-center relative z-10">
        {/* Hero Section */}
        <div className="mb-12">
          {/* Animated Journal Icon */}
          <div className="relative inline-block mb-8">
            <div className="text-8xl animate-bounce" style={{ animationDuration: '3s' }}>📔</div>
            <div className="absolute -top-2 -right-2 w-6 h-6 bg-blue-500 rounded-full animate-ping" />
          </div>

          <h1 className="text-6xl md:text-7xl font-bold text-zinc-100 mb-4 tracking-tight bg-gradient-to-r from-zinc-100 via-zinc-300 to-zinc-100 bg-clip-text text-transparent animate-fade-in">
            My Journal
          </h1>
          <p className="text-zinc-400 text-xl mb-2 animate-slide-in">
            {greeting}! Ready to reflect?
          </p>
          <p className="text-zinc-500 text-base animate-slide-in" style={{ animationDelay: '0.1s' }}>
            Your personal space for thoughts and reflections
          </p>
        </div>

        {/* Main Card */}
        <div className="glass rounded-3xl shadow-2xl p-10 backdrop-blur-xl animate-scale-in border-2 border-zinc-700/20">
          {!folderHandle ? (
            <>
              <h2 className="text-3xl font-bold text-zinc-100 mb-4 tracking-tight">Open Your Journal</h2>
              <p className="text-zinc-400 mb-8 leading-relaxed text-lg">
                Select your journal folder to get started. Your entries are stored locally and never leave your computer.
              </p>

              {/* Trust Indicators */}
              <div className="grid grid-cols-3 gap-4 mb-8">
                <div className="text-center p-4 bg-zinc-800/30 rounded-xl">
                  <div className="text-2xl mb-2">🔒</div>
                  <div className="text-xs text-zinc-400 font-medium">Fully Private</div>
                </div>
                <div className="text-center p-4 bg-zinc-800/30 rounded-xl">
                  <div className="text-2xl mb-2">💾</div>
                  <div className="text-xs text-zinc-400 font-medium">Local Storage</div>
                </div>
                <div className="text-center p-4 bg-zinc-800/30 rounded-xl">
                  <div className="text-2xl mb-2">✨</div>
                  <div className="text-xs text-zinc-400 font-medium">Auto-Saves</div>
                </div>
              </div>

              <button
                onClick={handleSelectFolder}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-semibold py-5 px-6 rounded-2xl transition-all duration-200 flex items-center justify-center gap-3 shadow-xl shadow-blue-900/40 hover:shadow-2xl hover:shadow-blue-900/60 hover:-translate-y-1 text-lg"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                </svg>
                Select Journal Folder
              </button>

              {/* How it Works */}
              <div className="mt-10 pt-8 border-t border-zinc-700/30">
                <h3 className="text-sm font-semibold text-zinc-300 mb-4 uppercase tracking-wider">How It Works</h3>
                <div className="grid md:grid-cols-3 gap-4 text-left">
                  <div className="flex gap-3">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 font-bold text-sm">1</div>
                    <div>
                      <div className="text-sm font-medium text-zinc-200 mb-1">Choose Folder</div>
                      <div className="text-xs text-zinc-500">Select where to save your journal</div>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-purple-600/20 border border-purple-500/30 flex items-center justify-center text-purple-400 font-bold text-sm">2</div>
                    <div>
                      <div className="text-sm font-medium text-zinc-200 mb-1">Start Writing</div>
                      <div className="text-xs text-zinc-500">Create your first entry</div>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-green-600/20 border border-green-500/30 flex items-center justify-center text-green-400 font-bold text-sm">3</div>
                    <div>
                      <div className="text-sm font-medium text-zinc-200 mb-1">Auto-Saved</div>
                      <div className="text-xs text-zinc-500">All changes saved automatically</div>
                    </div>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="text-6xl mb-6 animate-bounce" style={{ animationDuration: '2s' }}>👋</div>
              <h2 className="text-3xl font-bold text-zinc-100 mb-3 tracking-tight">Welcome!</h2>
              <p className="text-zinc-400 mb-8 leading-relaxed text-lg">What should we call you?</p>
              
              <div className="mb-8">
                <input
                  type="text"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    setError('');
                  }}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      handleStartJournaling();
                    }
                  }}
                  placeholder="Enter your name"
                  className="w-full bg-zinc-900/50 border-2 border-zinc-700/50 focus:border-blue-500/50 text-zinc-100 px-6 py-4 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-500/20 transition-all placeholder:text-zinc-500 text-lg"
                  autoFocus
                />
                {error && (
                  <p className="text-red-400 text-sm mt-3 flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {error}
                  </p>
                )}
              </div>

              <button
                onClick={handleStartJournaling}
                disabled={isSaving || !name.trim()}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 disabled:from-zinc-700 disabled:to-zinc-700 disabled:cursor-not-allowed text-white font-semibold py-5 px-6 rounded-2xl transition-all duration-200 shadow-xl shadow-blue-900/40 hover:shadow-2xl hover:shadow-blue-900/60 hover:-translate-y-1 disabled:shadow-none disabled:hover:translate-y-0 text-lg"
              >
                {isSaving ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Creating your journal...
                  </span>
                ) : (
                  'Start Journaling'
                )}
              </button>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-zinc-500 text-sm">
          <p>Your data stays private • Stored locally on your device • No cloud sync</p>
        </div>
      </div>
    </div>
  );
}