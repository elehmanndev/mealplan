'use client';

import { useState } from 'react';
import { ChevronDown, Plus } from 'lucide-react';
import type { ShoppingGroup } from '@/lib/shopping-types';
import { getSupermarket } from '@/lib/supermarkets';
import { ShoppingListItem } from './ShoppingListItem';
import { AddExtraSheet } from './AddExtraSheet';

interface ShoppingListProps {
  groups: ShoppingGroup[];
  week: string;
}

/**
 * Reminders.app layout: one inset-grouped section per supermarket. The
 * store's brand color survives as the header text (like a list's color in
 * Reminders); rows stay neutral so the whole screen reads as one system.
 */
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
      <div className="space-y-6">
        {displayGroups.map((group) => {
          const header = getSupermarket(group.supermarket)?.theme.header ?? 'text-text';
          const pending = group.items.filter((i) => !i.checked).length;
          return (
            <details key={group.supermarket ?? '__none__'} open className="group">
              <summary className="flex items-center justify-between cursor-pointer list-none select-none px-4 pb-2 [&::-webkit-details-marker]:hidden">
                <span className={['text-title3', header].join(' ')}>{group.label}</span>
                <span className="flex items-center gap-1.5 text-subhead text-text-muted tabular-nums">
                  {pending > 0 ? pending : group.items.length > 0 ? '✓' : ''}
                  <ChevronDown
                    size={18}
                    strokeWidth={2.5}
                    className="text-accent transition-transform duration-200 group-[:not([open])]:-rotate-90"
                  />
                </span>
              </summary>
              <ul className="list-group rounded-cell bg-surface overflow-hidden">
                {group.items.map((item) => (
                  <li key={`${item.kind}-${item.id}`}>
                    <ShoppingListItem item={item} week={week} />
                  </li>
                ))}
                <li>
                  <button
                    type="button"
                    onClick={() => openAdd(group.supermarket)}
                    className="list-row w-full flex items-center gap-3 pl-4 text-left pressable"
                  >
                    <span className="w-[22px] h-[22px] shrink-0 rounded-full bg-accent text-white flex items-center justify-center">
                      <Plus size={15} strokeWidth={3} />
                    </span>
                    <span className="list-row-content flex-1 py-[11px] text-body text-accent">Añadir item</span>
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
