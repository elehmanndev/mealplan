'use client';

import type { ReactNode } from 'react';
import { formatDayLabel } from '@/lib/week';

interface DaySectionProps {
  date: Date;
  isToday: boolean;
  children: ReactNode;
}

export function DaySection({ date, isToday, children }: DaySectionProps) {
  return (
    <section
      className={[
        'py-3 px-3 border-l-4',
        isToday ? 'border-accent' : 'border-transparent',
      ].join(' ')}
    >
      <div className="flex items-center mb-2">
        <h3 className="text-sm font-semibold text-text-muted">{formatDayLabel(date)}</h3>
        {isToday && <span className="ml-2 text-accent text-xs font-semibold">◀ HOY</span>}
      </div>
      <div className="space-y-2">{children}</div>
    </section>
  );
}
