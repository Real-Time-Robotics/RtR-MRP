'use client';

import { useEffect, useState } from 'react';
import { Sun, Moon } from 'lucide-react';

export function ThemeToggle() {
  const [isDark, setIsDark] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Check system preference or stored preference
    const stored = localStorage.getItem('landing-theme');
    if (stored) {
      setIsDark(stored === 'dark');
    } else {
      // Check system preference
      setIsDark(window.matchMedia('(prefers-color-scheme: dark)').matches);
    }
  }, []);

  useEffect(() => {
    if (!mounted) return;

    if (isDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('landing-theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('landing-theme', 'light');
    }
  }, [isDark, mounted]);

  if (!mounted) {
    return (
      <button className="w-8 h-8 flex items-center justify-center rounded-md text-neutral-500" aria-label="Toggle theme">
        <Moon className="w-4 h-4" />
      </button>
    );
  }

  return (
    <button
      onClick={() => setIsDark(!isDark)}
      className="w-8 h-8 flex items-center justify-center rounded-md transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-600 dark:text-neutral-400"
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {isDark ? (
        <Sun className="w-4 h-4" />
      ) : (
        <Moon className="w-4 h-4" />
      )}
    </button>
  );
}
