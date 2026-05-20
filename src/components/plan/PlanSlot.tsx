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

  if (empty) {
    return (
      <div
        ref={setNodeRef}
        className={['rounded-xl transition-colors h-full min-h-0', ringClass].join(' ')}
      >
        <button
          type="button"
          onClick={onTapEmpty}
          aria-label="Añadir comida"
          className={[
            'h-full w-full rounded-xl border border-dashed flex items-center justify-center',
            'text-text-muted active:scale-[0.98] transition-transform',
            isToday ? 'border-accent/40 bg-accent/5' : 'border-neutral-800 bg-surface/40',
          ].join(' ')}
        >
          <Plus size={20} />
        </button>
      </div>
    );
  }

  return (
    <div
      ref={setNodeRef}
      className={['rounded-xl transition-colors h-full min-h-0', ringClass].join(' ')}
    >
      <div className="flex gap-1 h-full">
        <div className="flex-1 min-w-0 flex flex-col gap-1">
          {entries.map((entry) => (
            <div key={entry.id} className="flex-1 min-h-0">
              <DraggablePlanCard entry={entry} onTap={() => onTapEntry(entry)} />
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={onTapEmpty}
          aria-label="Añadir otra receta a este slot"
          className={[
            'w-9 shrink-0 rounded-xl border border-dashed flex items-center justify-center',
            'text-text-muted active:scale-[0.98] transition-transform',
            isToday ? 'border-accent/40 bg-accent/5' : 'border-neutral-800 bg-surface/40',
          ].join(' ')}
        >
          <Plus size={16} />
        </button>
      </div>
    </div>
  );
}
