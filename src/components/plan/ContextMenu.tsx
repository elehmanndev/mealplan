'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Copy, Eye, Move, Trash2, Users } from 'lucide-react';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Button } from '@/components/ui/Button';
import { ListRow, ListSection } from '@/components/ui/List';
import { Stepper } from '@/components/ui/Stepper';
import { ConfirmActions } from '@/components/ui/ConfirmActions';
import {
  duplicatePlanEntryAction,
  movePlanEntryAction,
  removePlanEntryAction,
  updatePlanServingsAction,
} from '@/actions/plan';
import { getCurrentWeek } from '@/lib/week';
import { useToast } from '@/components/ui/Toast';
import type { PlanEntry } from '@/types';
import { DaySlotPicker } from './DaySlotPicker';

interface ContextMenuProps {
  entry: PlanEntry;
  open: boolean;
  onClose: () => void;
  week: string;
}

type Mode = 'menu' | 'servings' | 'move' | 'duplicate' | 'confirm-delete';

export function ContextMenu({ entry, open, onClose, week }: ContextMenuProps) {
  const router = useRouter();
  const toast = useToast();
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
      try {
        await updatePlanServingsAction(entry.id, servings);
        router.refresh();
        handleClose();
      } catch {
        toast.show('No se pudo guardar', 'error');
      }
    });
  };

  const handleMove = ({ date, slot }: { date: string; slot: PlanEntry['slot'] }) => {
    startTransition(async () => {
      try {
        await movePlanEntryAction({ entry_id: entry.id, to_date: date, to_slot: slot });
        router.refresh();
        handleClose();
      } catch {
        toast.show('No se pudo mover', 'error');
      }
    });
  };

  const handleDuplicate = ({ date, slot }: { date: string; slot: PlanEntry['slot'] }) => {
    startTransition(async () => {
      try {
        await duplicatePlanEntryAction({ entry_id: entry.id, to_date: date, to_slot: slot });
        router.refresh();
        handleClose();
      } catch {
        toast.show('No se pudo duplicar', 'error');
      }
    });
  };

  const handleDeleteConfirmed = () => {
    startTransition(async () => {
      try {
        await removePlanEntryAction(entry.id);
        router.refresh();
        handleClose();
      } catch {
        toast.show('No se pudo eliminar', 'error');
      }
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
          <div className="bg-surface rounded-cell pl-4 pr-3 py-3 flex items-center justify-between">
            <span className="text-body">Comensales</span>
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
      ) : mode === 'confirm-delete' ? (
        <ConfirmActions
          message={<>¿Eliminar «{entry.recipe?.name ?? 'esta receta'}» del plan?</>}
          confirmLabel="Eliminar del plan"
          destructive
          onConfirm={handleDeleteConfirmed}
          onCancel={() => setMode('menu')}
          disabled={isPending}
        />
      ) : (
        <div className="space-y-5">
          <ListSection>
            <ListRow
              icon={Users}
              iconBg="rgb(var(--warning))"
              title="Editar comensales"
              value={<>{entry.servings} pax</>}
              onClick={() => setMode('servings')}
              disabled={isPending}
            />
            <ListRow
              icon={Move}
              title="Mover a..."
              onClick={() => setMode('move')}
              disabled={isPending}
            />
            <ListRow
              icon={Copy}
              iconBg="#5856D6"
              title="Duplicar a..."
              onClick={() => setMode('duplicate')}
              disabled={isPending}
            />
            <ListRow
              icon={Eye}
              iconBg="rgb(var(--success))"
              title="Ver receta"
              href={`/recipes/${entry.recipe_id}`}
              onClick={handleClose}
            />
          </ListSection>
          <ListSection>
            <ListRow
              icon={Trash2}
              destructive
              title="Eliminar del plan"
              onClick={() => setMode('confirm-delete')}
              disabled={isPending}
            />
          </ListSection>
        </div>
      )}
    </BottomSheet>
  );
}
