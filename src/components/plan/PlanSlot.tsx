'use client';

import { useDroppable } from '@dnd-kit/core';
import { Plus } from 'lucide-react';
import type { PlanEntry, Slot } from '@/types';
import { formatDate } from '@/lib/week';
import { DraggablePlanCard } from './DraggablePlanCard';

interface PlanSlotProps {
  date: Date;
  slot: Slot;
  entries: PlanEntry[];
  isToday: boolean;
  onTapEmpty: () => void;
  onTapEntry: (entry: PlanEntry) => void;
}

export function PlanSlot({ date, slot, entries, isToday, onTapEmpty, onTapEntry }: PlanSlotProps) {
  const id = `${formatDate(date)}-${slot}`;
  const { setNodeRef, isOver } = useDroppable({ id });

  const ringClass = isOver
    ? 'ring-2 ring-accent/60'
    : isToday
      ? 'ring-1 ring-accent/30'
      : '';

  const empty = entries.length === 0;

  return (
    <div
      ref={setNodeRef}
      className={['rounded-xl transition-colors h-full min-h-0', ringClass].join(' ')}
    >
      <div className="flex flex-col gap-1 h-full">
        {entries.map((entry) => (
          <div key={entry.id} className="flex-1 min-h-0">
            <DraggablePlanCard entry={entry} onTap={() => onTapEntry(entry)} />
          </div>
        ))}
        <button
          type="button"
          onClick={onTapEmpty}
          aria-label={empty ? 'Añadir comida' : 'Añadir otra receta a este slot'}
          className={[
            'rounded-xl border border-dashed flex items-center justify-center',
            'text-text-muted active:scale-[0.98] transition-transform',
            isToday ? 'border-accent/40 bg-accent/5' : 'border-neutral-800 bg-surface/40',
            empty ? 'flex-1 w-full' : 'h-6 w-full',
          ].join(' ')}
        >
          <Plus size={empty ? 20 : 14} />
        </button>
      </div>
    </div>
  );
}
