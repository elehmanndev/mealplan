'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { PlanEntry } from '@/types';

interface DraggablePlanCardProps {
  entry: PlanEntry;
  onTap: () => void;
}

export function DraggablePlanCard({ entry, onTap }: DraggablePlanCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: entry.id,
    data: { entry },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    touchAction: 'manipulation' as const,
  };

  return (
    <button
      ref={setNodeRef}
      style={style}
      onClick={onTap}
      type="button"
      aria-label={entry.recipe?.name ?? 'Receta'}
      className="w-full h-full rounded-xl bg-surface px-2 py-1.5 flex items-center gap-2 active:scale-[0.98] transition-transform text-left"
      {...attributes}
      {...listeners}
    >
      <span className="text-2xl shrink-0 leading-none" aria-hidden>
        {entry.recipe?.emoji ?? '🍽️'}
      </span>
      <div className="flex-1 min-w-0">
        <div className="text-xs font-medium leading-tight line-clamp-2">
          {entry.recipe?.name ?? 'Receta'}
        </div>
        <div className="text-[10px] text-text-muted leading-tight">{entry.servings}p</div>
      </div>
    </button>
  );
}
