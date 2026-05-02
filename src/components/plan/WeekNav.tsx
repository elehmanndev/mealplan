'use client';

import Link from 'next/link';
import { ChevronLeft, ChevronRight, MoreVertical } from 'lucide-react';
import { formatWeekLabel, getCurrentWeek, getNextWeek, getPrevWeek } from '@/lib/week';

interface WeekNavProps {
  week: string;
  onOpenActions: () => void;
}

export function WeekNav({ week, onOpenActions }: WeekNavProps) {
  const prev = getPrevWeek(week);
  const next = getNextWeek(week);
  const current = getCurrentWeek();
  const isCurrent = week === current;

  return (
    <header className="sticky top-0 z-20 bg-bg/95 backdrop-blur supports-[backdrop-filter]:bg-bg/80 border-b border-neutral-800 safe-top">
      <div className="flex items-center justify-between px-2 py-2 gap-2">
        <Link
          href={`/?week=${prev}`}
          aria-label="Semana anterior"
          className="min-w-touch min-h-touch flex items-center justify-center rounded-full hover:bg-surface-2 text-text"
        >
          <ChevronLeft size={24} />
        </Link>
        <div className="flex-1 flex items-center justify-center gap-3">
          <span className="font-semibold text-base">{formatWeekLabel(week)}</span>
          {isCurrent ? (
            <span className="text-xs text-text-muted">Hoy</span>
          ) : (
            <Link
              href={`/?week=${current}`}
              className="text-xs text-accent font-medium px-2 py-1 rounded-full bg-accent/10 active:scale-95 transition-transform"
            >
              Hoy
            </Link>
          )}
        </div>
        <Link
          href={`/?week=${next}`}
          aria-label="Semana siguiente"
          className="min-w-touch min-h-touch flex items-center justify-center rounded-full hover:bg-surface-2 text-text"
        >
          <ChevronRight size={24} />
        </Link>
        <button
          type="button"
          onClick={onOpenActions}
          aria-label="Acciones de semana"
          className="min-w-touch min-h-touch flex items-center justify-center rounded-full hover:bg-surface-2 text-text"
        >
          <MoreVertical size={22} />
        </button>
      </div>
    </header>
  );
}
