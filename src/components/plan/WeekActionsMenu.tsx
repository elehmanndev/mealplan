'use client';

import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Copy, Trash2 } from 'lucide-react';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { ListRow, ListSection } from '@/components/ui/List';
import { ConfirmActions } from '@/components/ui/ConfirmActions';
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
        <ConfirmActions
          message="La semana actual tiene comidas. ¿Reemplazarlas con las de la semana anterior?"
          confirmLabel="Reemplazar"
          onConfirm={() => runDuplicate(true)}
          onCancel={() => setMode('menu')}
          disabled={isPending}
        />
      ) : mode === 'confirm-clear' ? (
        <ConfirmActions
          message="¿Borrar todas las comidas de la semana?"
          confirmLabel="Limpiar semana"
          destructive
          onConfirm={runClear}
          onCancel={() => setMode('menu')}
          disabled={isPending}
        />
      ) : (
        <div className="space-y-5">
          <ListSection>
            <ListRow
              icon={Copy}
              iconBg="#5856D6"
              title="Duplicar semana anterior aquí"
              onClick={handleDuplicateClicked}
              disabled={isPending}
            />
          </ListSection>
          <ListSection>
            <ListRow
              icon={Trash2}
              destructive
              title="Limpiar semana"
              onClick={() => setMode('confirm-clear')}
              disabled={isPending || !hasEntries}
            />
          </ListSection>
        </div>
      )}
    </BottomSheet>
  );
}
