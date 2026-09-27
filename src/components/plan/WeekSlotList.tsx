'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { formatDate, formatDayLabel, formatWeekRange, getNextWeek, getPrevWeek, getWeekDates, isSameDay } from '@/lib/week';
import type { Slot } from '@/types';

interface WeekSlotListProps {
  week: string;
  onWeekChange: (week: string) => void;
  onPick: (date: Date, slot: Slot) => void;
  disabled?: boolean;
}

const stepBtn =
  'w-9 h-9 flex items-center justify-center rounded-full bg-fill text-accent active:bg-[var(--fill-pressed)] transition-colors';

/**
 * Week switcher + one inset-grouped row per day with "Comida" / "Cena"
 * capsule buttons. Shared by "Mover a…", "Duplicar a…" and "Añadir al plan".
 */
export function WeekSlotList({ week, onWeekChange, onPick, disabled }: WeekSlotListProps) {
  const dates = getWeekDates(week);
  const today = new Date();
  const pill =
    'h-8 px-3.5 rounded-full bg-fill text-accent text-subhead font-semibold active:bg-[var(--fill-pressed)] disabled:opacity-40 transition-colors';

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <button type="button" onClick={() => onWeekChange(getPrevWeek(week))} aria-label="Semana anterior" className={stepBtn}>
          <ChevronLeft size={20} strokeWidth={2.5} />
        </button>
        <span className="flex-1 text-center text-headline tabular-nums">{formatWeekRange(week)}</span>
        <button type="button" onClick={() => onWeekChange(getNextWeek(week))} aria-label="Semana siguiente" className={stepBtn}>
          <ChevronRight size={20} strokeWidth={2.5} />
        </button>
      </div>
      <div className="list-group rounded-cell bg-surface overflow-hidden">
        {dates.map((date) => {
          const isToday = isSameDay(date, today);
          const label = formatDayLabel(date).toLowerCase();
          return (
            <div key={formatDate(date)} className="list-row flex items-center pl-4">
              <div className="list-row-content flex-1 flex items-center gap-2 py-2.5 pr-3">
                <span className={['flex-1 text-body capitalize truncate', isToday ? 'text-accent font-semibold' : ''].join(' ')}>
                  {label}
                </span>
                <button type="button" className={pill} onClick={() => onPick(date, 'comida')} disabled={disabled}>
                  Comida
                </button>
                <button type="button" className={pill} onClick={() => onPick(date, 'cena')} disabled={disabled}>
                  Cena
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
