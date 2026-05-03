'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Circle, CheckCircle2 } from 'lucide-react';
import type { ShoppingItem } from '@/lib/shopping-types';
import { toggleCheckAction, toggleExtraCheckAction } from '@/actions/shopping';

interface ShoppingListItemProps {
  item: ShoppingItem;
  week: string;
}

export function ShoppingListItem({ item, week }: ShoppingListItemProps) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  function handleClick() {
    const next = !item.checked;
    startTransition(async () => {
      if (item.kind === 'recipe') {
        await toggleCheckAction(week, item.ingredientId!, next);
      } else {
        await toggleExtraCheckAction(item.id, next);
      }
      router.refresh();
    });
  }

  const checked = item.checked;
  const Icon = checked ? CheckCircle2 : Circle;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleClick}
      className="min-h-touch px-1 py-2 flex items-center gap-3 w-full text-left select-none transition-opacity"
      style={{ touchAction: 'manipulation' }}
    >
      <Icon
        size={24}
        className={['shrink-0', checked ? 'text-accent' : 'text-text-muted'].join(' ')}
      />
      <div
        className={[
          'flex-1 flex items-baseline gap-2',
          checked ? 'line-through text-text-muted' : '',
        ].join(' ')}
      >
        <span>{item.name}</span>
        {item.quantity != null && item.unit && (
          <span className="text-text-muted tabular-nums text-sm">
            {item.quantity} {item.unit}
          </span>
        )}
      </div>
    </div>
  );
}
