'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Copy, Eye, Move, Trash2, Users } from 'lucide-react';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Button } from '@/components/ui/Button';
import { Stepper } from '@/components/ui/Stepper';
import {
  duplicatePlanEntryAction,
  movePlanEntryAction,
  removePlanEntryAction,
  updatePlanServingsAction,
} from '@/actions/plan';
import { getCurrentWeek } from '@/lib/week';
import type { PlanEntry } from '@/types';
import { DaySlotPicker } from './DaySlotPicker';

interface ContextMenuProps {
  entry: PlanEntry;
  open: boolean;
  onClose: () => void;
  week: string;
}

type Mode = 'menu' | 'servings' | 'move' | 'duplicate';

export function ContextMenu({ entry, open, onClose, week }: ContextMenuProps) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>('menu');
  const [servings, setServings] = useState(entry.servings);
  const [isPending, startTransition] = useTransition();

  const handleClose = () => {
    setMode('menu');
    onClose();
  };

  const handleSaveServings = () => {
    if (servings === entry.servings) {
      setMode('menu');
      return;
    }
    startTransition(async () => {
      await updatePlanServingsAction(entry.id, servings);
      router.refresh();
      handleClose();
    });
  };

  const handleMove = ({ date, slot }: { date: string; slot: PlanEntry['slot'] }) => {
    startTransition(async () => {
      await movePlanEntryAction({ entry_id: entry.id, to_date: date, to_slot: slot });
      router.refresh();
      handleClose();
    });
  };

  const handleDuplicate = ({ date, slot }: { date: string; slot: PlanEntry['slot'] }) => {
    startTransition(async () => {
      await duplicatePlanEntryAction({ entry_id: entry.id, to_date: date, to_slot: slot });
      router.refresh();
      handleClose();
    });
  };

  const handleDelete = () => {
    if (!window.confirm('¿Eliminar del plan?')) return;
    startTransition(async () => {
      await removePlanEntryAction(entry.id);
      router.refresh();
      handleClose();
    });
  };

  if (mode === 'move') {
    return (
      <DaySlotPicker
        open={open}
        onClose={handleClose}
        onPick={handleMove}
        week={week || getCurrentWeek()}
        title="Mover a..."
      />
    );
  }

  if (mode === 'duplicate') {
    return (
      <DaySlotPicker
        open={open}
        onClose={handleClose}
        onPick={handleDuplicate}
        week={week || getCurrentWeek()}
        title="Duplicar a..."
      />
    );
  }

  return (
    <BottomSheet open={open} onClose={handleClose} title={entry.recipe?.name ?? 'Plan'}>
      {mode === 'servings' ? (
        <div className="space-y-4">
          <div className="bg-surface rounded-2xl p-4 flex items-center justify-between">
            <span className="text-sm font-medium">Comensales</span>
            <Stepper value={servings} onChange={setServings} min={1} max={20} size="lg" />
          </div>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="md"
              fullWidth
              onClick={() => {
                setServings(entry.servings);
                setMode('menu');
              }}
            >
              Cancelar
            </Button>
            <Button
              variant="primary"
              size="md"
              fullWidth
              onClick={handleSaveServings}
              disabled={isPending}
            >
              Guardar
            </Button>
          </div>
        </div>
      ) : (
        <ul className="space-y-1">
          <li>
            <button
              type="button"
              onClick={() => setMode('servings')}
              disabled={isPending}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl bg-surface min-h-touch text-left active:scale-[0.99] transition-transform disabled:opacity-50"
            >
              <Users size={20} className="text-text-muted shrink-0" />
              <span className="font-medium flex-1">Editar comensales</span>
              <span className="text-sm text-text-muted">{entry.servings} pax</span>
            </button>
          </li>
          <li>
            <button
              type="button"
              onClick={() => setMode('move')}
              disabled={isPending}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl bg-surface min-h-touch text-left active:scale-[0.99] transition-transform disabled:opacity-50"
            >
              <Move size={20} className="text-text-muted shrink-0" />
              <span className="font-medium">Mover a...</span>
            </button>
          </li>
          <li>
            <button
              type="button"
              onClick={() => setMode('duplicate')}
              disabled={isPending}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl bg-surface min-h-touch text-left active:scale-[0.99] transition-transform disabled:opacity-50"
            >
              <Copy size={20} className="text-text-muted shrink-0" />
              <span className="font-medium">Duplicar a...</span>
            </button>
          </li>
          <li>
            <Link
              href={`/recipes/${entry.recipe_id}`}
              onClick={handleClose}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl bg-surface min-h-touch text-left active:scale-[0.99] transition-transform"
            >
              <Eye size={20} className="text-text-muted shrink-0" />
              <span className="font-medium">Ver receta</span>
            </Link>
          </li>
          <li>
            <button
              type="button"
              onClick={handleDelete}
              disabled={isPending}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl bg-surface min-h-touch text-left active:scale-[0.99] transition-transform disabled:opacity-50"
            >
              <Trash2 size={20} className="text-red-400 shrink-0" />
              <span className="font-medium text-red-400">Eliminar del plan</span>
            </button>
          </li>
        </ul>
      )}
    </BottomSheet>
  );
}
