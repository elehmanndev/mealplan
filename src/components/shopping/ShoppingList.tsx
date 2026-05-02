'use client';

import type { ShoppingGroup } from '@/lib/shopping-types';
import { ShoppingListItem } from './ShoppingListItem';

interface ShoppingListProps {
  groups: ShoppingGroup[];
  week: string;
  showRemoved: boolean;
}

export function ShoppingList({ groups, week }: ShoppingListProps) {
  return (
    <div className="space-y-3">
      {groups.map((group) => (
        <details
          key={group.category}
          open
          className="bg-surface rounded-2xl px-4 py-3 group"
        >
          <summary className="flex items-center justify-between cursor-pointer list-none min-h-touch select-none">
            <span className="uppercase tracking-wide text-sm font-semibold text-text-muted">
              {group.category}
            </span>
            <span className="text-text-muted text-sm tabular-nums">
              ({group.items.length})
            </span>
          </summary>
          <ul className="mt-2 divide-y divide-neutral-800">
            {group.items.map((item) => (
              <li key={`${item.kind}-${item.id}`}>
                <ShoppingListItem item={item} week={week} />
              </li>
            ))}
          </ul>
        </details>
      ))}
    </div>
  );
}
