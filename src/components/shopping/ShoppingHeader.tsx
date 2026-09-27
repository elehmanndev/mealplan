'use client';

import Link from 'next/link';
import { useState } from 'react';
import { ChevronLeft, ChevronRight, Ellipsis } from 'lucide-react';
import { formatWeekRange, getCurrentWeek, getNextWeek, getPrevWeek } from '@/lib/week';
import { NavBar, NavBarButton } from '@/components/ui/NavBar';
import { ShoppingActionsMenu } from './ShoppingActionsMenu';

interface ShoppingHeaderProps {
  week: string;
}

const stepBtn =
  'w-9 h-9 flex items-center justify-center rounded-full bg-fill text-accent active:bg-[var(--fill-pressed)] transition-colors';

export function ShoppingHeader({ week }: ShoppingHeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const prev = getPrevWeek(week);
  const next = getNextWeek(week);
  const current = getCurrentWeek();

  return (
    <>
      <NavBar
        title="Lista"
        large
        trailing={
          <NavBarButton label="Más opciones" onClick={() => setMenuOpen(true)}>
            <Ellipsis size={24} strokeWidth={2.25} />
          </NavBarButton>
        }
        bottom={
          <div className="flex items-center gap-2 px-4">
            <Link href={`/shopping?week=${prev}`} aria-label="Semana anterior" className={stepBtn}>
              <ChevronLeft size={20} strokeWidth={2.5} />
            </Link>
            <div className="flex-1 text-center text-headline tabular-nums">{formatWeekRange(week)}</div>
            {week !== current && (
              <Link
                href={`/shopping?week=${current}`}
                className="h-9 px-3.5 rounded-full bg-fill text-accent text-subhead font-semibold flex items-center active:bg-[var(--fill-pressed)]"
              >
                Hoy
              </Link>
            )}
            <Link href={`/shopping?week=${next}`} aria-label="Semana siguiente" className={stepBtn}>
              <ChevronRight size={20} strokeWidth={2.5} />
            </Link>
          </div>
        }
      />
      <ShoppingActionsMenu week={week} open={menuOpen} onClose={() => setMenuOpen(false)} />
    </>
  );
}
