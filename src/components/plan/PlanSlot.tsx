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

  const ringClass = isOver ? 'ring-2 ring-accent' : '';
  // Empty cells: faint grouped fill with a tint glyph, not dashed outlines.
  const addCls = [
    'rounded-[14px] flex items-center justify-center text-accent/70 transition-[transform,background-color]',
    'active:scale-[0.97] active:bg-[var(--fill-pressed)]',
    isToday ? 'bg-accent/10' : 'bg-surface/60',
  ].join(' ');

  const empty = entries.length === 0;

  if (empty) {
    return (
      <div
        ref={setNodeRef}
        className={['rounded-[14px] transition-shadow h-full min-h-0', ringClass].join(' ')}
      >
        <button
          type="button"
          onClick={onTapEmpty}
          aria-label="Añadir comida"
          className={['h-full w-full', addCls].join(' ')}
        >
          <Plus size={20} strokeWidth={2.25} />
        </button>
      </div>
    );
  }

  return (
    <div
      ref={setNodeRef}
      className={['rounded-[14px] transition-shadow h-full min-h-0', ringClass].join(' ')}
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
          className={['w-8 shrink-0', addCls].join(' ')}
        >
          <Plus size={16} strokeWidth={2.25} />
        </button>
      </div>
    </div>
  );
}
