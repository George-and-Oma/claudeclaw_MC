'use client';

import { useState, useEffect, useCallback } from 'react';
import SearchModal from './SearchModal';
import { useMobileLayout } from './MobileLayout';

export default function Header() {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [pauseLoading, setPauseLoading] = useState(false);
  const { setSidebarOpen, activityOpen, setActivityOpen, theme, toggleTheme, mounted } = useMobileLayout();

  // Check initial pause state
  const checkPauseState = useCallback(async () => {
    try {
      const res = await fetch('/api/pause-status');
      const data = await res.json();
      setIsPaused(data.paused);
    } catch {
      // Ignore errors
    }
  }, []);

  useEffect(() => {
    checkPauseState();
  }, [checkPauseState]);

  // Global keyboard shortcut for search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsSearchOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleTogglePause = async () => {
    setPauseLoading(true);
    try {
      const res = await fetch('/api/pause-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pause: !isPaused }),
      });
      const data = await res.json();
      setIsPaused(data.paused);
    } catch (error) {
      console.error('Error toggling pause:', error);
    } finally {
      setPauseLoading(false);
    }
  };

  return (
    <>
      <header className="min-h-[72px] pt-[calc(env(safe-area-inset-top)+12px)] pb-3 bg-[#0d0d0d] border-b border-[#2a2a2a] flex items-center justify-between px-3 md:px-4 gap-2 md:gap-4">
        {/* Left side - Mobile menu */}
        <div className="flex items-center gap-3">
          {/* Hamburger menu - mobile only */}
          <button
            onClick={() => setSidebarOpen(true)}
            className="md:hidden p-3 -m-1 text-[#a0a0a0] hover:text-white transition-colors active:bg-[#2a2a2a] rounded-lg"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          {/* Mobile title */}
          <span className="md:hidden font-semibold text-white text-base">Mission Control</span>
        </div>

        {/* Right side - Actions */}
        <div className="flex items-center gap-3 md:gap-4">
          {/* Search */}
          <button
            onClick={() => setIsSearchOpen(true)}
            className="flex items-center gap-1.5 md:gap-2 bg-[#1a1a1a] rounded-lg px-3 md:px-3 py-2.5 text-sm text-[#666] hover:text-white transition-colors active:bg-[#2a2a2a]"
          >
            <span className="text-lg">🔍</span>
            <span className="hidden sm:inline">Search</span>
            <span className="hidden md:inline text-xs bg-[#2a2a2a] px-1.5 py-0.5 rounded">⌘K</span>
          </button>

          {/* Pause */}
          <button
            onClick={handleTogglePause}
            disabled={pauseLoading}
            className={`flex items-center gap-1.5 md:gap-2 rounded-lg px-3 md:px-3 py-2.5 text-sm font-medium transition-colors active:opacity-80 ${
              isPaused
                ? 'bg-red-600/20 text-red-400 hover:bg-red-600/30'
                : 'bg-[#1a1a1a] text-[#a0a0a0] hover:text-white'
            }`}
          >
            <span className="text-lg">{isPaused ? '▶️' : '⏸️'}</span>
            <span className="hidden sm:inline">{pauseLoading ? '...' : isPaused ? 'Resume' : 'Pause'}</span>
          </button>

          {/* Theme toggle - only render after mount to avoid hydration mismatch */}
          {mounted && (
            <button
              onClick={toggleTheme}
              className="flex items-center gap-1 bg-[#1a1a1a] rounded-lg px-3 py-2.5 text-lg text-[#a0a0a0] hover:text-white transition-colors active:bg-[#2a2a2a]"
              title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              <span>{theme === 'dark' ? '☀️' : '🌙'}</span>
            </button>
          )}

          {/* Activity toggle - mobile only */}
          <button
            onClick={() => setActivityOpen(!activityOpen)}
            className="md:hidden flex items-center gap-1 bg-[#1a1a1a] rounded-lg px-3 py-2.5 text-lg text-[#a0a0a0] hover:text-white transition-colors active:bg-[#2a2a2a]"
          >
            <span>📊</span>
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          </button>

          {/* User */}
          <div className="hidden sm:flex items-center gap-2 text-sm text-white">
            <span>Daniel</span>
          </div>
        </div>
      </header>

      <SearchModal isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
    </>
  );
}
