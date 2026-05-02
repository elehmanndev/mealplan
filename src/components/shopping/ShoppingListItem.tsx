'use client';

import { useRef, useTransition, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Circle, CheckCircle2, RotateCcw } from 'lucide-react';
import type { ShoppingItem } from '@/lib/shopping-types';
import {
  toggleCheckAction,
  toggleExtraCheckAction,
  removeIngredientAction,
  removeExtraAction,
  restoreIngredientAction,
  restoreExtraAction,
} from '@/actions/shopping';

interface ShoppingListItemProps {
  item: ShoppingItem;
  week: string;
}

const LONG_PRESS_MS = 500;

export function ShoppingListItem({ item, week }: ShoppingListItemProps) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [pendingRemove, setPendingRemove] = useState(false);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressFired = useRef(false);

  function clearTimer() {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }

  function handlePointerDown() {
    if (item.removed) return;
    longPressFired.current = false;
    clearTimer();
    longPressTimer.current = setTimeout(() => {
      longPressFired.current = true;
      navigator.vibrate?.(30);
      setPendingRemove(true);
      startTransition(async () => {
        if (item.kind === 'recipe') {
          await removeIngredientAction(week, item.ingredientId!);
        } else {
          await removeExtraAction(item.id);
        }
        router.refresh();
        setPendingRemove(false);
      });
    }, LONG_PRESS_MS);
  }

  function handlePointerEnd() {
    clearTimer();
  }

  function handleClick() {
    if (longPressFired.current) {
      longPressFired.current = false;
      return;
    }
    if (item.removed) return;
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

  function handleRestore(e: React.MouseEvent) {
    e.stopPropagation();
    startTransition(async () => {
      if (item.kind === 'recipe') {
        await restoreIngredientAction(week, item.ingredientId!);
      } else {
        await restoreExtraAction(item.id);
      }
      router.refresh();
    });
  }

  const removed = item.removed;
  const checked = item.checked;
  const Icon = checked ? CheckCircle2 : Circle;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerEnd}
      onPointerLeave={handlePointerEnd}
      onPointerCancel={handlePointerEnd}
      onContextMenu={(e) => e.preventDefault()}
      className={[
        'min-h-touch px-1 py-2 flex items-center gap-3 w-full text-left select-none',
        'transition-opacity',
        removed ? 'opacity-50' : '',
        pendingRemove ? 'opacity-40' : '',
      ].join(' ')}
      style={{ touchAction: 'manipulation' }}
    >
      <Icon
        size={24}
        className={[
          'shrink-0',
          removed ? 'text-text-muted' : checked ? 'text-accent' : 'text-text-muted',
        ].join(' ')}
      />
      <div
        className={[
          'flex-1 flex items-baseline gap-2',
          checked || removed ? 'line-through' : '',
        ].join(' ')}
      >
        {item.quantity != null && item.unit && (
          <span className="font-semibold tabular-nums">
            {item.quantity} {item.unit}
          </span>
        )}
        <span className="text-text">{item.name}</span>
      </div>
      {removed && (
        <button
          type="button"
          onClick={handleRestore}
          className="shrink-0 min-h-touch px-3 text-sm text-accent flex items-center gap-1"
          aria-label="Restaurar"
        >
          <RotateCcw size={16} />
          Restaurar
        </button>
      )}
    </div>
  );
}
