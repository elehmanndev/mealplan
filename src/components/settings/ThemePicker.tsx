'use client';

import { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';

type Theme = 'dark' | 'light';

export function ThemePicker() {
  const [theme, setTheme] = useState<Theme>('dark');

  useEffect(() => {
    const stored = (typeof localStorage !== 'undefined' && localStorage.getItem('theme')) as Theme | null;
    setTheme(stored === 'light' ? 'light' : 'dark');
  }, []);

  function setAndPersist(next: Theme) {
    setTheme(next);
    try {
      localStorage.setItem('theme', next);
    } catch {
      // ignore
    }
    document.documentElement.classList.toggle('light', next === 'light');
  }

  return (
    <div className="bg-surface rounded-2xl p-1.5 flex gap-1">
      <button
        type="button"
        onClick={() => setAndPersist('dark')}
        aria-pressed={theme === 'dark'}
        className={[
          'flex-1 flex items-center justify-center gap-2 h-11 rounded-xl text-sm font-medium transition-colors',
          theme === 'dark' ? 'bg-surface-2 text-text' : 'text-text-muted',
        ].join(' ')}
      >
        <Moon size={16} />
        Oscuro
      </button>
      <button
        type="button"
        onClick={() => setAndPersist('light')}
        aria-pressed={theme === 'light'}
        className={[
          'flex-1 flex items-center justify-center gap-2 h-11 rounded-xl text-sm font-medium transition-colors',
          theme === 'light' ? 'bg-surface-2 text-text' : 'text-text-muted',
        ].join(' ')}
      >
        <Sun size={16} />
        Claro
      </button>
    </div>
  );
}
