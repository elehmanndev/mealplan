'use client';

import { useState, useTransition } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Button } from '@/components/ui/Button';
import { addToPlanAction } from '@/actions/plan';
import {
  formatDate,
  formatDayLabel,
  formatWeekLabel,
  getCurrentWeek,
  getNextWeek,
  getPrevWeek,
  getWeekDates,
} from '@/lib/week';
import type { Slot } from '@/types';

interface AddToPlanButtonProps {
  recipeId: number;
  servings: number;
}

export function AddToPlanButton({ recipeId, servings }: AddToPlanButtonProps) {
  const [open, setOpen] = useState(false);
  const [week, setWeek] = useState(() => getCurrentWeek());
  const [toast, setToast] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const dates = getWeekDates(week);

  const handleAdd = (date: Date, slot: Slot) => {
    startTransition(async () => {
      try {
        await addToPlanAction({
          date: formatDate(date),
          slot,
          recipe_id: recipeId,
          servings,
        });
        setToast('Añadido al plan');
        setTimeout(() => {
          setToast(null);
          setOpen(false);
        }, 800);
      } catch {
        setToast('Error al añadir');
        setTimeout(() => setToast(null), 1500);
      }
    });
  };

  return (
    <>
      <Button variant="primary" size="lg" fullWidth onClick={() => setOpen(true)}>
        Añadir al plan
      </Button>
      <BottomSheet open={open} onClose={() => setOpen(false)} title="Añadir al plan" fullHeight>
        {toast && (
          <div className="sticky top-0 z-10 mb-3 px-4 py-2 bg-accent text-white rounded-xl text-center font-medium">
            {toast}
          </div>
        )}
        <div className="flex items-center justify-between mb-4">
          <button
            type="button"
            onClick={() => setWeek(getPrevWeek(week))}
            aria-label="Semana anterior"
            className="min-w-touch min-h-touch flex items-center justify-center rounded-full bg-surface-2"
          >
            <ChevronLeft size={22} />
          </button>
          <span className="font-semibold text-lg">{formatWeekLabel(week)}</span>
          <button
            type="button"
            onClick={() => setWeek(getNextWeek(week))}
            aria-label="Semana siguiente"
            className="min-w-touch min-h-touch flex items-center justify-center rounded-full bg-surface-2"
          >
            <ChevronRight size={22} />
          </button>
        </div>
        <div className="space-y-3">
          {dates.map((date) => (
            <div key={formatDate(date)} className="bg-surface rounded-2xl p-3">
              <div className="text-xs font-medium text-text-muted mb-2">
                {formatDayLabel(date)}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="secondary"
                  size="md"
                  onClick={() => handleAdd(date, 'comida')}
                  disabled={isPending}
                >
                  🥘 Comida
                </Button>
                <Button
                  variant="secondary"
                  size="md"
                  onClick={() => handleAdd(date, 'cena')}
                  disabled={isPending}
                >
                  🌙 Cena
                </Button>
              </div>
            </div>
          ))}
        </div>
      </BottomSheet>
    </>
  );
}
