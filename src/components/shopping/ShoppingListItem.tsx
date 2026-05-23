'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Circle, CheckCircle2, X } from 'lucide-react';
import type { ShoppingItem } from '@/lib/shopping-types';
import {
  removeExtraAction,
  removeIngredientAction,
  toggleCheckAction,
  toggleExtraCheckAction,
} from '@/actions/shopping';
import { useToast } from '@/components/ui/Toast';

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

  function handleRemove(e: React.MouseEvent) {
    e.stopPropagation();
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
  const Icon = checked ? CheckCircle2 : Circle;

  return (
    <div
      className={[
        'flex items-center w-full select-none transition-opacity',
        pending ? 'opacity-50' : '',
      ].join(' ')}
    >
      <button
        type="button"
        onClick={handleToggle}
        disabled={pending}
        aria-pressed={checked}
        className="min-h-touch px-1 py-2 flex items-center gap-3 flex-1 min-w-0 text-left"
        style={{ touchAction: 'manipulation' }}
      >
        <Icon
          size={24}
          className={['shrink-0', checked ? 'text-accent' : 'text-text-muted'].join(' ')}
        />
        <div
          className={[
            'flex-1 min-w-0 flex items-baseline gap-2',
            checked ? 'line-through text-text-muted' : '',
          ].join(' ')}
        >
          <span className="truncate">{item.name}</span>
          {item.parts.length > 0 && (
            <span className="text-text-muted tabular-nums text-sm shrink-0">
              {item.parts.map((p) => `${p.quantity} ${p.unit}`).join(' + ')}
            </span>
          )}
        </div>
      </button>
      <button
        type="button"
        onClick={handleRemove}
        disabled={pending}
        aria-label={`Quitar ${item.name} de la lista`}
        className="shrink-0 min-h-touch min-w-touch flex items-center justify-center text-text-muted/60 hover:text-red-400 transition-colors"
      >
        <X size={18} />
      </button>
    </div>
  );
}
