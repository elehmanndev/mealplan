'use client';

import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Button } from '@/components/ui/Button';
import {
  formatDate,
  formatDayLabel,
  formatWeekLabel,
  getNextWeek,
  getPrevWeek,
  getWeekDates,
} from '@/lib/week';
import type { Slot } from '@/types';

interface DaySlotPickerProps {
  open: boolean;
  onClose: () => void;
  onPick: (target: { date: string; slot: Slot }) => void;
  week: string;
  title?: string;
}

export function DaySlotPicker({ open, onClose, onPick, week, title = 'Elegir destino' }: DaySlotPickerProps) {
  const [currentWeek, setCurrentWeek] = useState(week);
  const dates = getWeekDates(currentWeek);

  const handlePick = (date: Date, slot: Slot) => {
    onPick({ date: formatDate(date), slot });
  };

  return (
    <BottomSheet open={open} onClose={onClose} title={title} fullHeight>
      <div className="flex items-center justify-between mb-4">
        <button
          type="button"
          onClick={() => setCurrentWeek(getPrevWeek(currentWeek))}
          aria-label="Semana anterior"
          className="min-w-touch min-h-touch flex items-center justify-center rounded-full bg-surface-2"
        >
          <ChevronLeft size={22} />
        </button>
        <span className="font-semibold text-lg">{formatWeekLabel(currentWeek)}</span>
        <button
          type="button"
          onClick={() => setCurrentWeek(getNextWeek(currentWeek))}
          aria-label="Semana siguiente"
          className="min-w-touch min-h-touch flex items-center justify-center rounded-full bg-surface-2"
        >
          <ChevronRight size={22} />
        </button>
      </div>
      <div className="space-y-3">
        {dates.map((date) => (
          <div key={formatDate(date)} className="bg-surface rounded-2xl p-3">
            <div className="text-xs font-medium text-text-muted mb-2">{formatDayLabel(date)}</div>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="secondary" size="md" onClick={() => handlePick(date, 'comida')}>
                🥘 Comida
              </Button>
              <Button variant="secondary" size="md" onClick={() => handlePick(date, 'cena')}>
                🌙 Cena
              </Button>
            </div>
          </div>
        ))}
      </div>
    </BottomSheet>
  );
}
