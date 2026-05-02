'use client';

import { useDroppable } from '@dnd-kit/core';
import { Plus } from 'lucide-react';
import type { PlanEntry, Slot } from '@/types';
import { formatDate } from '@/lib/week';
import { DraggablePlanCard } from './DraggablePlanCard';

interface PlanSlotProps {
  date: Date;
  slot: Slot;
  entry?: PlanEntry;
  isToday: boolean;
  onTapEmpty: () => void;
  onTapEntry: (entry: PlanEntry) => void;
}

export function PlanSlot({ date, slot, entry, isToday, onTapEmpty, onTapEntry }: PlanSlotProps) {
  const id = `${formatDate(date)}-${slot}`;
  const { setNodeRef, isOver } = useDroppable({ id });

  const ringClass = isOver
    ? 'ring-2 ring-accent/60'
    : isToday
      ? 'ring-1 ring-accent/30'
      : '';

  return (
    <div
      ref={setNodeRef}
      className={['rounded-xl transition-colors h-full min-h-0', ringClass].join(' ')}
    >
      {entry ? (
        <DraggablePlanCard entry={entry} onTap={() => onTapEntry(entry)} />
      ) : (
        <button
          type="button"
          onClick={onTapEmpty}
          aria-label="Añadir comida"
          className={[
            'w-full h-full rounded-xl border border-dashed flex items-center justify-center',
            'text-text-muted active:scale-[0.98] transition-transform',
            isToday ? 'border-accent/40 bg-accent/5' : 'border-neutral-800 bg-surface/40',
          ].join(' ')}
        >
          <Plus size={20} />
        </button>
      )}
    </div>
  );
}
