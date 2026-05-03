'use client';

import { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';

type Theme = 'dark' | 'light';

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>('dark');

  useEffect(() => {
    const stored = (typeof localStorage !== 'undefined' && localStorage.getItem('theme')) as Theme | null;
    setTheme(stored === 'light' ? 'light' : 'dark');
  }, []);

  function toggle() {
    const next: Theme = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    try {
      localStorage.setItem('theme', next);
    } catch {
      // ignore
    }
    document.documentElement.classList.toggle('light', next === 'light');
  }

  const isLight = theme === 'light';

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={isLight ? 'Cambiar a modo oscuro' : 'Cambiar a modo claro'}
      className="inline-flex items-center gap-2 px-3 h-9 rounded-full bg-surface-2 text-text-muted text-sm font-medium active:scale-95 transition-transform"
    >
      {isLight ? <Sun size={16} /> : <Moon size={16} />}
      <span>{isLight ? 'Light' : 'Dark'}</span>
    </button>
  );
}
