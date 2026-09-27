'use client';

import { useEffect, useState } from 'react';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { applyThemePreference, readThemePreference, type ThemePreference } from '@/lib/theme';

export function ThemePicker() {
  const [theme, setTheme] = useState<ThemePreference>('system');

  useEffect(() => {
    setTheme(readThemePreference());
  }, []);

  function handleChange(next: ThemePreference) {
    setTheme(next);
    applyThemePreference(next);
  }

  return (
    <div className="bg-surface rounded-cell px-4 py-3">
      <SegmentedControl<ThemePreference>
        ariaLabel="Apariencia"
        value={theme}
        onChange={handleChange}
        segments={[
          { value: 'system', label: 'Automático' },
          { value: 'light', label: 'Claro' },
          { value: 'dark', label: 'Oscuro' },
        ]}
      />
    </div>
  );
}
