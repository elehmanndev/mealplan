'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import type { ShoppingGroup } from '@/lib/shopping-types';
import { getSupermarket, type SupermarketTheme } from '@/lib/supermarkets';
import { ShoppingListItem } from './ShoppingListItem';
import { AddExtraSheet } from './AddExtraSheet';

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
  // Single shared sheet; each group's add line opens it preset to that
  // supermarket. `null` targets the "Sin asignar" group.
  const [sheetOpen, setSheetOpen] = useState(false);
  const [target, setTarget] = useState<string | null>(null);

  // The "Sin asignar" (null) group must always be present so there's a place
  // to drop items with no supermarket, even when nothing is unassigned yet.
  const displayGroups: ShoppingGroup[] = groups.some((g) => g.supermarket === null)
    ? groups
    : [...groups, { supermarket: null, label: 'Sin asignar', items: [] }];

  function openAdd(supermarket: string | null) {
    setTarget(supermarket);
    setSheetOpen(true);
  }

  return (
    <>
      <div className="space-y-3">
        {displayGroups.map((group) => {
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
                <li>
                  <button
                    type="button"
                    onClick={() => openAdd(group.supermarket)}
                    className="w-full flex items-center gap-2 py-3 min-h-touch text-sm text-text-muted/50 hover:text-text-muted transition-colors"
                  >
                    <Plus size={16} />
                    Añadir item
                  </button>
                </li>
              </ul>
            </details>
          );
        })}
      </div>

      <AddExtraSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        week={week}
        defaultSupermarket={target}
      />
    </>
  );
}
