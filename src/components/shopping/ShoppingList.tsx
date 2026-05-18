'use client';

import type { ShoppingGroup } from '@/lib/shopping-types';
import { getSupermarket, type SupermarketTheme } from '@/lib/supermarkets';
import { ShoppingListItem } from './ShoppingListItem';

interface ShoppingListProps {
  groups: ShoppingGroup[];
  week: string;
}

const NEUTRAL_THEME: SupermarketTheme = {
  bg: 'bg-surface',
  border: 'border-[color:var(--glass-border)]',
  header: 'text-text-muted',
  divider: 'divide-[color:var(--glass-border)]',
};

function getTheme(id: string | null): SupermarketTheme {
  return getSupermarket(id)?.theme ?? NEUTRAL_THEME;
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
