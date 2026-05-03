'use client';

import type { ShoppingGroup } from '@/lib/shopping-types';
import { ShoppingListItem } from './ShoppingListItem';

interface ShoppingListProps {
  groups: ShoppingGroup[];
  week: string;
}

interface PostItTheme {
  bg: string;
  border: string;
  header: string;
  divider: string;
}

const SUPERMARKET_THEMES: Record<string, PostItTheme> = {
  lidl: {
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/25',
    header: 'text-blue-500',
    divider: 'divide-blue-500/15',
  },
  mercadona: {
    bg: 'bg-green-500/10',
    border: 'border-green-500/25',
    header: 'text-green-600',
    divider: 'divide-green-500/15',
  },
  'bon-area': {
    bg: 'bg-amber-500/15',
    border: 'border-amber-500/30',
    header: 'text-amber-600',
    divider: 'divide-amber-500/20',
  },
  aldi: {
    bg: 'bg-sky-500/10',
    border: 'border-sky-500/25',
    header: 'text-sky-500',
    divider: 'divide-sky-500/15',
  },
};

const NEUTRAL_THEME: PostItTheme = {
  bg: 'bg-surface',
  border: 'border-white/5',
  header: 'text-text-muted',
  divider: 'divide-neutral-500/20',
};

function getTheme(id: string | null): PostItTheme {
  if (!id) return NEUTRAL_THEME;
  return SUPERMARKET_THEMES[id] ?? NEUTRAL_THEME;
}

export function ShoppingList({ groups, week }: ShoppingListProps) {
  return (
    <div className="space-y-3">
      {groups.map((group) => {
        const theme = getTheme(group.supermarket);
        return (
          <details
            key={group.supermarket ?? '__none__'}
            open
            className={['rounded-2xl px-4 py-3 border shadow-soft', theme.bg, theme.border].join(' ')}
          >
            <summary className="flex items-center justify-between cursor-pointer list-none min-h-touch select-none">
              <span className={['uppercase tracking-wide text-sm font-semibold', theme.header].join(' ')}>
                {group.label}
              </span>
              <span className={['text-sm tabular-nums', theme.header, 'opacity-70'].join(' ')}>
                {group.items.length}
              </span>
            </summary>
            <ul className={['mt-2 divide-y', theme.divider].join(' ')}>
              {group.items.map((item) => (
                <li key={`${item.kind}-${item.id}`}>
                  <ShoppingListItem item={item} week={week} />
                </li>
              ))}
            </ul>
          </details>
        );
      })}
    </div>
  );
}
