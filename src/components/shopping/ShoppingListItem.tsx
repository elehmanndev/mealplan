'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { ShoppingItem } from '@/lib/shopping-types';
import {
  removeExtraAction,
  removeIngredientAction,
  toggleCheckAction,
  toggleExtraCheckAction,
} from '@/actions/shopping';
import { useToast } from '@/components/ui/Toast';
import { SwipeToDelete } from '@/components/ui/SwipeToDelete';

interface ShoppingListItemProps {
  item: ShoppingItem;
  week: string;
}

export function ShoppingListItem({ item, week }: ShoppingListItemProps) {
  const router = useRouter();
  const toast = useToast();
  const [pending, startTransition] = useTransition();

  function handleToggle() {
    const next = !item.checked;
    startTransition(async () => {
      try {
        if (item.kind === 'recipe') {
          await toggleCheckAction(week, item.ingredientIds, next);
        } else {
          await toggleExtraCheckAction(item.id, next);
        }
        router.refresh();
      } catch {
        toast.show('No se pudo actualizar el item', 'error');
      }
    });
  }

  function handleRemove() {
    startTransition(async () => {
      try {
        if (item.kind === 'recipe') {
          await removeIngredientAction(week, item.ingredientIds);
        } else {
          await removeExtraAction(item.id);
        }
        router.refresh();
      } catch {
        toast.show('No se pudo quitar el item', 'error');
      }
    });
  }

  const checked = item.checked;
  const qty = item.parts.map((p) => `${p.quantity} ${p.unit}`).join(' + ');

  return (
    <SwipeToDelete onDelete={handleRemove} disabled={pending} label={`Quitar ${item.name} de la lista`}>
      <div className={['list-row flex items-center w-full select-none bg-surface', pending ? 'opacity-50' : ''].join(' ')}>
        <button
          type="button"
          onClick={handleToggle}
          disabled={pending}
          aria-pressed={checked}
          className="flex items-center gap-3 flex-1 min-w-0 pl-4 text-left"
          style={{ touchAction: 'pan-y' }}
        >
          {/* Reminders.app radio: hollow ring → filled tint disc with inner dot */}
          <span
            className={[
              'shrink-0 w-[22px] h-[22px] rounded-full flex items-center justify-center transition-colors duration-200',
              checked ? 'bg-accent' : 'ring-[1.5px] ring-inset ring-text-tertiary',
            ].join(' ')}
            aria-hidden
          >
            {checked && <span className="w-2 h-2 rounded-full bg-white" />}
          </span>
          <span className="list-row-content flex-1 min-w-0 flex items-center gap-2 py-[11px] pr-4">
            <span
              className={[
                'flex-1 truncate text-body transition-colors',
                checked ? 'text-text-muted' : 'text-text',
              ].join(' ')}
            >
              {item.name}
            </span>
            {qty && <span className="shrink-0 text-subhead text-text-muted tabular-nums">{qty}</span>}
          </span>
        </button>
      </div>
    </SwipeToDelete>
  );
}
