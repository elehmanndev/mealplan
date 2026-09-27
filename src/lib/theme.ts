// Appearance preference, persisted in localStorage under `theme`.
// 'system' (or no key) follows prefers-color-scheme like a native iOS app;
// 'light' / 'dark' force it via a class on <html> (see globals.css).
export type ThemePreference = 'system' | 'light' | 'dark';

export const THEME_STORAGE_KEY = 'theme';

export function readThemePreference(): ThemePreference {
  try {
    const t = localStorage.getItem(THEME_STORAGE_KEY);
    return t === 'light' || t === 'dark' ? t : 'system';
  } catch {
    return 'system';
  }
}

export function applyThemePreference(pref: ThemePreference) {
  try {
    if (pref === 'system') localStorage.removeItem(THEME_STORAGE_KEY);
    else localStorage.setItem(THEME_STORAGE_KEY, pref);
  } catch {
    // ignore (private mode)
  }
  const el = document.documentElement;
  el.classList.toggle('light', pref === 'light');
  el.classList.toggle('dark', pref === 'dark');
}
