'use client';

import { useState } from 'react';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { formatDate } from '@/lib/week';
import type { Slot } from '@/types';
import { WeekSlotList } from './WeekSlotList';

interface DaySlotPickerProps {
  open: boolean;
  onClose: () => void;
  onPick: (target: { date: string; slot: Slot }) => void;
  week: string;
  title?: string;
}

export function DaySlotPicker({ open, onClose, onPick, week, title = 'Elegir destino' }: DaySlotPickerProps) {
  const [currentWeek, setCurrentWeek] = useState(week);

  return (
    <BottomSheet open={open} onClose={onClose} title={title}>
      <WeekSlotList
        week={currentWeek}
        onWeekChange={setCurrentWeek}
        onPick={(date, slot) => onPick({ date: formatDate(date), slot })}
      />
    </BottomSheet>
  );
}
