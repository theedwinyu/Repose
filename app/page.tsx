'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useFolderContext } from './context/FolderContext';
import { isFileSystemAccessSupported, openJournalFolder, writeConfig, listEntries, readConfig } from './lib/fileSystem';
import Image from 'next/image';

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
    
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Good morning');
    else if (hour < 18) setGreeting('Good afternoon');
    else setGreeting('Good evening');
  }, []);

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
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-serene">
        <div className="max-w-md w-full serene-card rounded-3xl p-8 text-center animate-scale-in">
          <div className="text-7xl mb-6 opacity-50">🌿</div>
          <h1 className="text-2xl font-bold text-charcoal mb-3 tracking-tight">Browser Not Supported</h1>
          <p className="text-warm-gray leading-relaxed">
            Repose requires the File System Access API, which is available in Chrome and Edge browsers.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-serene relative overflow-hidden">
      {/* Subtle Background Pattern */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-30">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-sage rounded-full blur-3xl wave-orb" style={{ animationDelay: '0s' }} />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-sky rounded-full blur-3xl wave-orb" style={{ animationDelay: '4s' }} />
        <div className="absolute top-1/2 right-1/3 w-64 h-64 bg-aqua rounded-full blur-3xl wave-orb" style={{ animationDelay: '8s' }} />
      </div>

      <div className="max-w-2xl w-full text-center relative z-10">
        {/* Hero Section */}
        <div className="mb-12">
          {/* Logo/Icon */}
          <div className="relative inline-block mb-8">
            <div className="w-32 h-32 animate-gentle-float" style={{ filter: 'drop-shadow(0 4px 12px rgba(127, 197, 184, 0.3))' }}>
              <Image src="/repose-logo.jpg" alt="Repose" width={128} height={128} className="w-full h-full rounded-full" />
            </div>
          </div>

          <h1 className="text-7xl md:text-8xl font-bold text-charcoal mb-4 tracking-tight animate-fade-in" style={{ fontFamily: 'var(--font-display)' }}>
            Repose
          </h1>
          <div className="flex items-center justify-center gap-1 mb-4 text-sage text-2xl opacity-40">
            <span>～</span>
            <span>～</span>
            <span>～</span>
          </div>
          <p className="text-sage text-xl mb-3 animate-slide-in font-medium">
            {greeting}
          </p>
          <p className="text-warm-gray text-lg animate-slide-in max-w-md mx-auto leading-relaxed" style={{ animationDelay: '0.1s' }}>
            A serene space for your thoughts, where peace meets reflection
          </p>
        </div>

        {/* Main Card */}
        <div className="serene-card rounded-3xl p-10 backdrop-blur-xl animate-scale-in" style={{ animationDelay: '0.2s' }}>
          {!folderHandle ? (
            <>
              <h2 className="text-3xl font-semibold text-charcoal mb-4 tracking-tight" style={{ fontFamily: 'var(--font-display)' }}>
                Begin Your Journey
              </h2>
              <p className="text-warm-gray mb-8 leading-relaxed text-lg">
                Select a peaceful place on your computer to store your reflections. Your thoughts remain private, always.
              </p>

              {/* Trust Indicators */}
              <div className="grid grid-cols-3 gap-4 mb-8">
                <div className="text-center p-5 bg-sage-light rounded-2xl border border-sage/10">
                  <div className="text-3xl mb-2">🔒</div>
                  <div className="text-xs text-charcoal font-medium">Private</div>
                </div>
                <div className="text-center p-5 bg-sky-light rounded-2xl border border-sky/10">
                  <div className="text-3xl mb-2">💾</div>
                  <div className="text-xs text-charcoal font-medium">Local</div>
                </div>
                <div className="text-center p-5 bg-lavender-light rounded-2xl border border-lavender/10">
                  <div className="text-3xl mb-2">✨</div>
                  <div className="text-xs text-charcoal font-medium">Serene</div>
                </div>
              </div>

              <button
                onClick={handleSelectFolder}
                className="w-full btn-primary text-white font-semibold py-5 px-6 rounded-2xl transition-all duration-300 flex items-center justify-center gap-3 text-lg"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                </svg>
                Select Your Journal Folder
              </button>

              {/* How it Works */}
              <div className="mt-10 pt-8 border-t border-sage/10">
                <div className="divider-wave mb-6" />
                <h3 className="text-sm font-semibold text-warm-gray mb-6 uppercase tracking-wider">Your Path to Repose</h3>
                <div className="grid md:grid-cols-3 gap-6 text-left">
                  <div className="flex gap-4">
                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-sage/15 border border-sage/20 flex items-center justify-center text-sage font-semibold text-sm">1</div>
                    <div>
                      <div className="text-sm font-medium text-charcoal mb-1">Choose Location</div>
                      <div className="text-xs text-warm-gray leading-relaxed">Select a peaceful folder for your thoughts</div>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-sky/15 border border-sky/20 flex items-center justify-center text-sky-dark font-semibold text-sm">2</div>
                    <div>
                      <div className="text-sm font-medium text-charcoal mb-1">Begin Reflecting</div>
                      <div className="text-xs text-warm-gray leading-relaxed">Start writing your first entry</div>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-lavender/15 border border-lavender/20 flex items-center justify-center text-lavender-dark font-semibold text-sm">3</div>
                    <div>
                      <div className="text-sm font-medium text-charcoal mb-1">Find Peace</div>
                      <div className="text-xs text-warm-gray leading-relaxed">Your words, safely preserved</div>
                    </div>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="w-24 h-24 mb-6 mx-auto animate-gentle-float">
                <Image src="/repose-logo.jpg" alt="Repose" width={128} height={128} className="w-full h-full rounded-full" />
              </div>
              <h2 className="text-3xl font-semibold text-charcoal mb-3 tracking-tight" style={{ fontFamily: 'var(--font-display)' }}>
                Welcome
              </h2>
              <p className="text-warm-gray mb-8 leading-relaxed text-lg">What shall we call you?</p>
              
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
                  placeholder="Your name"
                  className="w-full bg-soft-white border-2 border-sage/20 focus:border-sage text-charcoal px-6 py-4 rounded-xl transition-all placeholder:text-light-muted text-lg"
                  autoFocus
                />
                {error && (
                  <p className="text-red-500 text-sm mt-3 flex items-center gap-2 justify-center">
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
                className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-5 px-6 rounded-2xl transition-all duration-300 text-lg"
              >
                {isSaving ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="w-5 h-5 spinner-serene rounded-full"></div>
                    Creating your sanctuary...
                  </span>
                ) : (
                  'Begin Your Journey'
                )}
              </button>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-warm-gray text-sm animate-fade-in" style={{ animationDelay: '0.4s' }}>
          <p className="flex items-center justify-center gap-2 flex-wrap">
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-sage"></span>
              Private & Secure
            </span>
            <span className="text-light-muted">•</span>
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-sage"></span>
              Stored Locally
            </span>
            <span className="text-light-muted">•</span>
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-sage"></span>
              Peaceful Experience
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}