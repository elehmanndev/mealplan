'use client';

import Link from 'next/link';
import { useState } from 'react';
import { ChevronLeft, ChevronRight, MoreVertical } from 'lucide-react';
import { formatWeekLabel, getNextWeek, getPrevWeek } from '@/lib/week';
import { ShoppingActionsMenu } from './ShoppingActionsMenu';

interface ShoppingHeaderProps {
  week: string;
}

export function ShoppingHeader({ week }: ShoppingHeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const prev = getPrevWeek(week);
  const next = getNextWeek(week);

  return (
    <header className="sticky top-0 z-20 glass-top safe-top">
      <div className="flex items-center justify-between px-4 py-3">
        <Link
          href={`/shopping?week=${prev}`}
          aria-label="Semana anterior"
          className="w-11 h-11 flex items-center justify-center rounded-full text-text-muted hover:bg-surface-2 hover:text-text"
        >
          <ChevronLeft size={22} />
        </Link>

        <div className="flex-1 text-center text-base font-semibold truncate px-2">
          Lista de compra — {formatWeekLabel(week)}
        </div>

        <div className="flex items-center">
          <Link
            href={`/shopping?week=${next}`}
            aria-label="Semana siguiente"
            className="w-11 h-11 flex items-center justify-center rounded-full text-text-muted hover:bg-surface-2 hover:text-text"
          >
            <ChevronRight size={22} />
          </Link>
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            aria-label="Más opciones"
            className="w-11 h-11 flex items-center justify-center rounded-full text-text-muted hover:bg-surface-2 hover:text-text"
          >
            <MoreVertical size={22} />
          </button>
        </div>
      </div>

      <ShoppingActionsMenu week={week} open={menuOpen} onClose={() => setMenuOpen(false)} />
    </header>
  );
}
