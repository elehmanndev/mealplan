'use client';

import Link from 'next/link';
import { ChevronLeft, ChevronRight, Home, MoreVertical } from 'lucide-react';
import { formatWeekLabel, getCurrentWeek, getNextWeek, getPrevWeek } from '@/lib/week';

interface WeekNavProps {
  week: string;
  onOpenActions: () => void;
}

const iconBtn =
  'w-11 h-11 flex items-center justify-center rounded-full hover:bg-surface-2 text-text shrink-0';

export function WeekNav({ week, onOpenActions }: WeekNavProps) {
  const prev = getPrevWeek(week);
  const next = getNextWeek(week);
  const current = getCurrentWeek();
  const isCurrent = week === current;

  return (
    <header className="sticky top-0 z-20 glass-top safe-top">
      <div className="grid grid-cols-[auto_1fr_auto] items-center px-4 py-3">
        <Link
          href="/home"
          aria-label="Inicio"
          className={`${iconBtn} text-text-muted`}
        >
          <Home size={22} />
        </Link>

        <div className="flex items-center justify-center gap-1">
          <Link href={`/?week=${prev}`} aria-label="Semana anterior" className={iconBtn}>
            <ChevronLeft size={22} />
          </Link>
          <div className="flex items-center gap-2 min-w-[100px] justify-center">
            <span className="font-semibold text-base tabular-nums">{formatWeekLabel(week)}</span>
            {isCurrent ? (
              <span className="text-xs text-text-muted">Hoy</span>
            ) : (
              <Link
                href={`/?week=${current}`}
                className="text-xs text-accent font-medium px-2 py-0.5 rounded-full bg-accent/10 active:scale-95 transition-transform"
              >
                Hoy
              </Link>
            )}
          </div>
          <Link href={`/?week=${next}`} aria-label="Semana siguiente" className={iconBtn}>
            <ChevronRight size={22} />
          </Link>
        </div>

        <button
          type="button"
          onClick={onOpenActions}
          aria-label="Acciones de semana"
          className={iconBtn}
        >
          <MoreVertical size={22} />
        </button>
      </div>
    </header>
  );
}
