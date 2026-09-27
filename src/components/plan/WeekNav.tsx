'use client';

import Link from 'next/link';
import { ChevronLeft, ChevronRight, Ellipsis } from 'lucide-react';
import { formatWeekRange, getCurrentWeek, getNextWeek, getPrevWeek } from '@/lib/week';
import { NavBar, NavBarButton } from '@/components/ui/NavBar';

interface WeekNavProps {
  week: string;
  onOpenActions: () => void;
}

const stepBtn =
  'w-9 h-9 flex items-center justify-center rounded-full bg-fill text-accent active:bg-[var(--fill-pressed)] transition-colors';

/**
 * Large-title "Plan" bar with a Calendar.app-style week switcher beneath:
 * ‹ 26 sep – 2 oct › plus a "Hoy" capsule when browsing another week.
 */
export function WeekNav({ week, onOpenActions }: WeekNavProps) {
  const prev = getPrevWeek(week);
  const next = getNextWeek(week);
  const current = getCurrentWeek();
  const isCurrent = week === current;

  return (
    <NavBar
      title="Plan"
      large
      leading={
        <Link
          href="/home"
          className="h-11 px-2 flex items-center text-body text-accent active:opacity-50 transition-opacity"
        >
          Inicio
        </Link>
      }
      trailing={
        <NavBarButton label="Acciones de semana" onClick={onOpenActions}>
          <Ellipsis size={24} strokeWidth={2.25} />
        </NavBarButton>
      }
      bottom={
        <div className="flex items-center gap-2 px-4">
          <Link href={`/?week=${prev}`} aria-label="Semana anterior" className={stepBtn}>
            <ChevronLeft size={20} strokeWidth={2.5} />
          </Link>
          <div className="flex-1 text-center text-headline tabular-nums">{formatWeekRange(week)}</div>
          {!isCurrent && (
            <Link
              href={`/?week=${current}`}
              className="h-9 px-3.5 rounded-full bg-fill text-accent text-subhead font-semibold flex items-center active:bg-[var(--fill-pressed)]"
            >
              Hoy
            </Link>
          )}
          <Link href={`/?week=${next}`} aria-label="Semana siguiente" className={stepBtn}>
            <ChevronRight size={20} strokeWidth={2.5} />
          </Link>
        </div>
      }
    />
  );
}
