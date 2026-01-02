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

  const supported = typeof window !== 'undefined' && isFileSystemAccessSupported();

  useEffect(() => {
    setIsMounted(true);
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
      
      // Check if config already exists in this folder
      const existingConfig = await readConfig(handle);
      if (existingConfig) {
        // Folder already has config, load everything and go to dashboard
        setUserConfig(existingConfig);
        const entriesMap = await listEntries(handle);
        setEntries(entriesMap);
        // Will redirect via useEffect
      } else {
        // New folder, load entries but show name input
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
      // Will redirect via useEffect
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
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-800">
      <div className="max-w-md w-full text-center animate-fade-in">
        {/* Branding */}
        <div className="mb-10">
          <div className="text-7xl mb-6 animate-bounce" style={{ animationDuration: '2s' }}>📔</div>
          <h1 className="text-5xl font-bold text-zinc-100 mb-3 tracking-tight bg-gradient-to-r from-zinc-100 to-zinc-400 bg-clip-text text-transparent">
            My Journal
          </h1>
          <p className="text-zinc-400 text-lg">Your personal space for thoughts and reflections</p>
        </div>

        {/* Card */}
        <div className="glass rounded-3xl shadow-2xl p-8 backdrop-blur-xl">
          {!folderHandle ? (
            <>
              <h2 className="text-2xl font-bold text-zinc-100 mb-3 tracking-tight">Open Your Journal</h2>
              <p className="text-zinc-400 mb-8 leading-relaxed">
                🔒 Select your journal folder to get started. Your entries are stored locally and never leave your computer.
              </p>
              <button
                onClick={handleSelectFolder}
                className="w-full bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-semibold py-4 px-6 rounded-xl transition-all duration-200 flex items-center justify-center gap-3 shadow-lg shadow-blue-900/50 hover:shadow-xl hover:shadow-blue-900/60 hover:-translate-y-0.5"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                </svg>
                Select Journal Folder
              </button>
            </>
          ) : (
            <>
              <h2 className="text-2xl font-bold text-zinc-100 mb-3 tracking-tight">Welcome! 👋</h2>
              <p className="text-zinc-400 mb-8 leading-relaxed">What should we call you?</p>
              
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
                  className="w-full bg-zinc-900/50 border border-zinc-700/50 text-zinc-100 px-5 py-4 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all placeholder:text-zinc-500"
                  autoFocus
                />
                {error && (
                  <p className="text-red-400 text-sm mt-3">{error}</p>
                )}
              </div>

              <button
                onClick={handleStartJournaling}
                disabled={isSaving || !name.trim()}
                className="w-full bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 disabled:from-zinc-700 disabled:to-zinc-700 disabled:cursor-not-allowed text-white font-semibold py-4 px-6 rounded-xl transition-all duration-200 shadow-lg shadow-blue-900/50 hover:shadow-xl hover:shadow-blue-900/60 hover:-translate-y-0.5 disabled:shadow-none disabled:hover:translate-y-0"
              >
                {isSaving ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Saving...
                  </span>
                ) : (
                  'Start Journaling'
                )}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}