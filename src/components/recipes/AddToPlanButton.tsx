'use client';

import { useState, useTransition } from 'react';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Button } from '@/components/ui/Button';
import { addToPlanAction } from '@/actions/plan';
import { formatDate, getCurrentWeek } from '@/lib/week';
import { useToast } from '@/components/ui/Toast';
import { WeekSlotList } from '@/components/plan/WeekSlotList';
import type { Slot } from '@/types';

interface AddToPlanButtonProps {
  recipeId: number;
  servings: number;
}

export function AddToPlanButton({ recipeId, servings }: AddToPlanButtonProps) {
  const [open, setOpen] = useState(false);
  const [week, setWeek] = useState(() => getCurrentWeek());
  const toast = useToast();
  const [isPending, startTransition] = useTransition();

  const handleAdd = (date: Date, slot: Slot) => {
    startTransition(async () => {
      try {
        await addToPlanAction({
          date: formatDate(date),
          slot,
          recipe_id: recipeId,
          servings,
        });
        toast.show('Añadido al plan', 'success');
        setOpen(false);
      } catch {
        toast.show('No se pudo añadir', 'error');
      }
    });
  };

  return (
    <>
      <Button variant="primary" size="lg" fullWidth onClick={() => setOpen(true)}>
        Añadir al plan
      </Button>
      <BottomSheet open={open} onClose={() => setOpen(false)} title="Añadir al plan">
        <WeekSlotList week={week} onWeekChange={setWeek} onPick={handleAdd} disabled={isPending} />
      </BottomSheet>
    </>
  );
}
