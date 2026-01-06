'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useFolderContext } from './context/FolderContext';
import { isFileSystemAccessSupported, openJournalFolder, writeConfig, listEntries, readConfig } from './lib/fileSystem';

type OnboardingStep = 'welcome' | 'how-it-works' | 'folder-selection' | 'name-input';

export default function Home() {
  const router = useRouter();
  const { folderHandle, setFolderHandle, userConfig, setUserConfig, setEntries } = useFolderContext();
  const [name, setName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [isMounted, setIsMounted] = useState(false);
  const [greeting, setGreeting] = useState('');
  const [currentStep, setCurrentStep] = useState<OnboardingStep>('welcome');
  const [isReturningUser, setIsReturningUser] = useState(false);
  const [showFolderSuccess, setShowFolderSuccess] = useState(false);
  const [selectedFolderName, setSelectedFolderName] = useState('');

  const supported = typeof window !== 'undefined' && isFileSystemAccessSupported();

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
    if (isMounted && folderHandle && userConfig) {
      router.push('/dashboard');
    }
  }, [isMounted, folderHandle, userConfig, router]);

  const handleSelectFolder = async () => {
    setError('');
    setShowFolderSuccess(false);
    
    const handle = await openJournalFolder();
    
    if (handle) {
      setFolderHandle(handle);
      setSelectedFolderName(handle.name);
      
      const existingConfig = await readConfig(handle);
      if (existingConfig) {
        // Returning user - go straight to dashboard
        setUserConfig(existingConfig);
        const entriesMap = await listEntries(handle);
        setEntries(entriesMap);
      } else {
        // New user - show success and ask for name
        setShowFolderSuccess(true);
        setCurrentStep('name-input');
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

  // Browser not supported
  if (!supported) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-serene">
        <div className="max-w-lg w-full serene-card rounded-3xl p-8 text-center animate-scale-in">
          <div className="text-7xl mb-6 opacity-50">🌿</div>
          <h1 className="text-2xl font-bold text-charcoal mb-4 tracking-tight" style={{ fontFamily: 'var(--font-display)' }}>
            Browser Compatibility
          </h1>
          <p className="text-warm-gray leading-relaxed mb-6">
            Repose uses secure local storage that&apos;s only available in Chromium-based browsers.
          </p>
          
          <div className="bg-sage/5 rounded-xl p-4 mb-6 text-left">
            <p className="text-sm font-semibold text-sage-dark mb-2">Repose works best in:</p>
            <ul className="space-y-1 text-sm text-warm-gray">
              <li className="flex items-center gap-2">
                <span className="text-sage">✓</span> Chrome (recommended)
              </li>
              <li className="flex items-center gap-2">
                <span className="text-sage">✓</span> Edge
              </li>
              <li className="flex items-center gap-2">
                <span className="text-sage">✓</span> Brave
              </li>
            </ul>
          </div>

          <a 
            href="https://www.google.com/chrome/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block btn-primary text-white font-semibold py-3 px-8 rounded-2xl transition-all duration-300"
          >
            Download Chrome
          </a>
        </div>
      </div>
    );
  }

  // Welcome Screen
  if (currentStep === 'welcome') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-serene relative overflow-hidden">
        {/* Background Orbs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-30">
          <div className="absolute top-20 left-10 w-96 h-96 bg-sage rounded-full blur-3xl animate-wave-float" />
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-sky rounded-full blur-3xl animate-wave-float" style={{ animationDelay: '4s' }} />
          <div className="absolute top-40 right-20 w-64 h-64 bg-aqua rounded-full blur-3xl animate-wave-float" style={{ animationDelay: '8s' }} />
        </div>

        <div className="max-w-2xl w-full text-center animate-fade-in relative z-10">
          {/* Logo */}
          <div className="mb-8 flex justify-center">
            <div className="w-32 h-32 rounded-full overflow-hidden bg-soft-white shadow-serene-lg animate-gentle-float relative">
              <Image 
                src="/repose-logo.jpg" 
                alt="Repose" 
                width={128}
                height={128}
                className="w-full h-full object-cover"
                priority
              />
            </div>
          </div>

          {/* Title */}
          <h1 className="text-5xl md:text-6xl font-bold text-charcoal mb-3 tracking-tight animate-slide-in" style={{ fontFamily: 'var(--font-display)', animationDelay: '0.1s' }}>
            Repose
          </h1>
          
          {/* Wave decoration */}
          <div className="flex justify-center gap-2 mb-6 text-2xl text-sage/40 animate-slide-in" style={{ animationDelay: '0.2s' }}>
            <span>～</span>
            <span>～</span>
            <span>～</span>
          </div>

          {/* Subtitle */}
          <p className="text-xl text-warm-gray mb-12 animate-slide-in" style={{ animationDelay: '0.3s' }}>
            Your space for peaceful reflection
          </p>

          {/* Buttons */}
          <div className="space-y-4 animate-scale-in" style={{ animationDelay: '0.4s' }}>
            <button
              onClick={() => setCurrentStep('how-it-works')}
              className="w-full max-w-md mx-auto block btn-primary text-white font-semibold py-4 px-8 rounded-2xl transition-all duration-300"
            >
              Get Started
            </button>
            
            <button
              onClick={() => {
                setIsReturningUser(true);
                setCurrentStep('folder-selection');
              }}
              className="w-full max-w-md mx-auto block text-sage-dark hover:text-sage font-medium py-3 transition-colors"
            >
              I already have a journal
            </button>
          </div>
        </div>
      </div>
    );
  }

  // How It Works Screen
  if (currentStep === 'how-it-works') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-serene">
        <div className="max-w-2xl w-full serene-card rounded-3xl p-8 md:p-12 animate-scale-in">
          {/* Progress Indicator */}
          <div className="flex items-center justify-center gap-2 mb-8">
            <div className="w-8 h-8 rounded-full bg-sage text-white flex items-center justify-center text-sm font-semibold">1</div>
            <div className="w-16 h-0.5 bg-sage/20" />
            <div className="w-8 h-8 rounded-full bg-sage/20 text-warm-gray flex items-center justify-center text-sm font-semibold">2</div>
          </div>

          <h2 className="text-3xl font-bold text-charcoal mb-8 text-center tracking-tight" style={{ fontFamily: 'var(--font-display)' }}>
            How Repose Protects Your Privacy
          </h2>

          <div className="space-y-6 mb-8">
            {/* Feature 1 */}
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-sage/10 flex items-center justify-center text-2xl">
                🔒
              </div>
              <div>
                <h3 className="font-semibold text-charcoal mb-1">Stored on Your Computer</h3>
                <p className="text-warm-gray text-sm">
                  Your entries are saved directly to your device. Nothing is ever sent to the cloud or any server.
                </p>
              </div>
            </div>

            {/* Feature 2 */}
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-aqua/10 flex items-center justify-center text-2xl">
                📂
              </div>
              <div>
                <h3 className="font-semibold text-charcoal mb-1">Choose Any Folder</h3>
                <p className="text-warm-gray text-sm">
                  Select where to save your journal. Sync with Google Drive or Dropbox if you want automatic backups.
                </p>
              </div>
            </div>

            {/* Feature 3 */}
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-lavender/10 flex items-center justify-center text-2xl">
                🔐
              </div>
              <div>
                <h3 className="font-semibold text-charcoal mb-1">Browser Security</h3>
                <p className="text-warm-gray text-sm">
                  Modern browsers protect your privacy by requiring you to select your folder each time. This ensures only you can access your entries.
                </p>
              </div>
            </div>
          </div>

          <button
            onClick={() => setCurrentStep('folder-selection')}
            className="w-full btn-primary text-white font-semibold py-4 px-8 rounded-2xl transition-all duration-300"
          >
            Select My Journal Folder
          </button>
        </div>
      </div>
    );
  }

  // Folder Selection Screen
  if (currentStep === 'folder-selection') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-serene">
        <div className="max-w-2xl w-full serene-card rounded-3xl p-8 md:p-12 animate-scale-in">
          {/* Progress Indicator */}
          {!isReturningUser && (
            <div className="flex items-center justify-center gap-2 mb-8">
              <div className="w-8 h-8 rounded-full bg-sage text-white flex items-center justify-center text-sm font-semibold">✓</div>
              <div className="w-16 h-0.5 bg-sage" />
              <div className="w-8 h-8 rounded-full bg-sage text-white flex items-center justify-center text-sm font-semibold">2</div>
            </div>
          )}

          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-charcoal mb-3 tracking-tight" style={{ fontFamily: 'var(--font-display)' }}>
              {isReturningUser ? 'Welcome Back' : 'Select Your Journal Folder'}
            </h2>
            <p className="text-warm-gray">
              {isReturningUser 
                ? 'Choose your existing journal folder to continue'
                : 'Choose where to save your journal entries'
              }
            </p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-6 text-sm">
              {error}
            </div>
          )}

          <button
            onClick={handleSelectFolder}
            className="w-full btn-primary text-white font-semibold py-4 px-8 rounded-2xl transition-all duration-300 mb-4 flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
            </svg>
            Select Folder
          </button>

          {/* Tooltip */}
          <div className="bg-sage/5 rounded-xl p-4 text-sm text-warm-gray">
            <p className="font-medium text-charcoal mb-1">💡 Tip:</p>
            <p>We recommend creating a dedicated folder like &quot;Documents/Repose&quot; or &quot;Desktop/Journal&quot; for your entries.</p>
          </div>

          {!isReturningUser && (
            <button
              onClick={() => setCurrentStep('welcome')}
              className="w-full text-warm-gray hover:text-charcoal font-medium py-3 transition-colors mt-4"
            >
              ← Back
            </button>
          )}
        </div>
      </div>
    );
  }

  // Name Input Screen (after folder selected)
  if (currentStep === 'name-input' && folderHandle) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-serene">
        <div className="max-w-2xl w-full serene-card rounded-3xl p-8 md:p-12 animate-scale-in">
          {/* Folder Success Animation */}
          {showFolderSuccess && (
            <div className="text-center mb-8 animate-fade-in">
              <div className="w-16 h-16 rounded-full bg-sage/10 flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-sage" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="text-sage-dark font-semibold mb-2">Folder Selected!</p>
              <p className="text-sm text-warm-gray">
                Your journal will be saved to: <span className="font-medium text-charcoal">{selectedFolderName}</span>
              </p>
            </div>
          )}

          {/* Progress Indicator */}
          <div className="flex items-center justify-center gap-2 mb-8">
            <div className="w-8 h-8 rounded-full bg-sage text-white flex items-center justify-center text-sm font-semibold">✓</div>
            <div className="w-16 h-0.5 bg-sage" />
            <div className="w-8 h-8 rounded-full bg-sage text-white flex items-center justify-center text-sm font-semibold">2</div>
          </div>

          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-charcoal mb-3 tracking-tight" style={{ fontFamily: 'var(--font-display)' }}>
              {greeting}
            </h2>
            <p className="text-warm-gray">What should we call you?</p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-6 text-sm animate-slide-in">
              {error}
            </div>
          )}

          <div className="mb-6">
            <input
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setError('');
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && name.trim()) {
                  handleStartJournaling();
                }
              }}
              placeholder="Your name"
              className="w-full bg-soft-white border-2 border-sage/20 focus:border-sage text-charcoal px-6 py-4 rounded-2xl focus:outline-none transition-all text-lg placeholder:text-light-muted"
              autoFocus
            />
            <p className="text-xs text-warm-gray mt-2 text-center">
              Used for personalized greetings. You can change this anytime in Settings.
            </p>
          </div>

          <button
            onClick={handleStartJournaling}
            disabled={isSaving || !name.trim()}
            className="w-full btn-primary text-white font-semibold py-4 px-8 rounded-2xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isSaving ? (
              <>
                <div className="w-5 h-5 spinner-serene rounded-full" />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <span>Begin Your Journey</span>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </>
            )}
          </button>
        </div>
      </div>
    );
  }

  // Default: should not reach here
  return null;
}