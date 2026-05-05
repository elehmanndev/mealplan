'use client';

import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Copy, Trash2 } from 'lucide-react';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { clearWeekAction, duplicateWeekAction } from '@/actions/plan';
import { getPrevWeek } from '@/lib/week';

interface WeekActionsMenuProps {
  week: string;
  open: boolean;
  onClose: () => void;
  hasEntries: boolean;
}

type Mode = 'menu' | 'confirm-duplicate' | 'confirm-clear';

export function WeekActionsMenu({ week, open, onClose, hasEntries }: WeekActionsMenuProps) {
  const router = useRouter();
  const toast = useToast();
  const [mode, setMode] = useState<Mode>('menu');
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!open) setMode('menu');
  }, [open]);

  const handleDuplicateClicked = () => {
    if (hasEntries) {
      setMode('confirm-duplicate');
      return;
    }
    runDuplicate(false);
  };

  const runDuplicate = (replace: boolean) => {
    startTransition(async () => {
      try {
        await duplicateWeekAction(getPrevWeek(week), week, replace);
        router.refresh();
        onClose();
      } catch {
        toast.show('No se pudo duplicar', 'error');
      }
    });
  };

  const runClear = () => {
    startTransition(async () => {
      try {
        await clearWeekAction(week);
        router.refresh();
        onClose();
      } catch {
        toast.show('No se pudo limpiar', 'error');
      }
    });
  };

  return (
    <BottomSheet open={open} onClose={onClose} title="Acciones de semana">
      {mode === 'confirm-duplicate' ? (
        <div className="space-y-4">
          <p className="text-text-muted">
            La semana actual tiene comidas. ¿Reemplazarlas con las de la semana anterior?
          </p>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="md"
              fullWidth
              onClick={() => setMode('menu')}
              disabled={isPending}
            >
              Cancelar
            </Button>
            <Button
              variant="primary"
              size="md"
              fullWidth
              onClick={() => runDuplicate(true)}
              disabled={isPending}
            >
              Reemplazar
            </Button>
          </div>
        </div>
      ) : mode === 'confirm-clear' ? (
        <div className="space-y-4">
          <p className="text-text-muted">¿Borrar todas las comidas de la semana?</p>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="md"
              fullWidth
              onClick={() => setMode('menu')}
              disabled={isPending}
            >
              Cancelar
            </Button>
            <Button
              variant="danger"
              size="md"
              fullWidth
              onClick={runClear}
              disabled={isPending}
            >
              Limpiar
            </Button>
          </div>
        </div>
      ) : (
        <ul className="space-y-1">
          <li>
            <button
              type="button"
              onClick={handleDuplicateClicked}
              disabled={isPending}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl bg-surface min-h-touch text-left active:scale-[0.99] transition-transform disabled:opacity-50"
            >
              <Copy size={20} className="text-text-muted shrink-0" />
              <span className="font-medium">Duplicar semana anterior aquí</span>
            </button>
          </li>
          <li>
            <button
              type="button"
              onClick={() => setMode('confirm-clear')}
              disabled={isPending || !hasEntries}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl bg-surface min-h-touch text-left active:scale-[0.99] transition-transform disabled:opacity-50"
            >
              <Trash2 size={20} className="text-red-400 shrink-0" />
              <span className="font-medium text-red-400">Limpiar semana</span>
            </button>
          </li>
        </ul>
      )}
    </BottomSheet>
  );
}
