'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface MobileLayoutContextType {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  activityOpen: boolean;
  setActivityOpen: (open: boolean) => void;
  theme: 'dark' | 'light';
  toggleTheme: () => void;
  mounted: boolean;
}

const MobileLayoutContext = createContext<MobileLayoutContextType>({
  sidebarOpen: false,
  setSidebarOpen: () => {},
  activityOpen: false,
  setActivityOpen: () => {},
  theme: 'dark',
  toggleTheme: () => {},
  mounted: false,
});

export const useMobileLayout = () => useContext(MobileLayoutContext);

export function MobileLayoutProvider({ children }: { children: ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activityOpen, setActivityOpen] = useState(false);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [mounted, setMounted] = useState(false);

  // Load theme from localStorage on mount (client-side only)
  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem('mc-theme');
    if (saved === 'light') {
      setTheme('light');
      document.documentElement.classList.add('light-theme');
    }
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    localStorage.setItem('mc-theme', newTheme);

    if (newTheme === 'light') {
      document.documentElement.classList.add('light-theme');
    } else {
      document.documentElement.classList.remove('light-theme');
    }
  };

  return (
    <MobileLayoutContext.Provider
      value={{ sidebarOpen, setSidebarOpen, activityOpen, setActivityOpen, theme, toggleTheme, mounted }}
    >
      {children}
    </MobileLayoutContext.Provider>
  );
}
