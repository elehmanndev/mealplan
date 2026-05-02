'use client';

import Link from 'next/link';
import { useState } from 'react';
import { ChevronLeft, ChevronRight, MoreVertical } from 'lucide-react';
import { formatWeekLabel, getNextWeek, getPrevWeek } from '@/lib/week';
import { ShoppingActionsMenu } from './ShoppingActionsMenu';

interface ShoppingHeaderProps {
  week: string;
  showRemoved: boolean;
}

export function ShoppingHeader({ week, showRemoved }: ShoppingHeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const prev = getPrevWeek(week);
  const next = getNextWeek(week);

  return (
    <header className="sticky top-0 z-20 bg-bg/95 backdrop-blur supports-[backdrop-filter]:bg-bg/80 border-b border-neutral-800 safe-top">
      <div className="flex items-center justify-between px-2 py-2">
        <Link
          href={`/shopping?week=${prev}${showRemoved ? '&removed=1' : ''}`}
          aria-label="Semana anterior"
          className="min-w-touch min-h-touch flex items-center justify-center text-text-muted hover:text-text"
        >
          <ChevronLeft size={22} />
        </Link>

        <div className="flex-1 text-center text-base font-semibold truncate px-2">
          Lista de compra — {formatWeekLabel(week)}
        </div>

        <div className="flex items-center">
          <Link
            href={`/shopping?week=${next}${showRemoved ? '&removed=1' : ''}`}
            aria-label="Semana siguiente"
            className="min-w-touch min-h-touch flex items-center justify-center text-text-muted hover:text-text"
          >
            <ChevronRight size={22} />
          </Link>
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            aria-label="Más opciones"
            className="min-w-touch min-h-touch flex items-center justify-center text-text-muted hover:text-text"
          >
            <MoreVertical size={22} />
          </button>
        </div>
      </div>

      <ShoppingActionsMenu
        week={week}
        showRemoved={showRemoved}
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
      />
    </header>
  );
}
