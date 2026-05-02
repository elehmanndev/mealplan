'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Copy, Trash2 } from 'lucide-react';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { clearWeekAction, duplicateWeekAction } from '@/actions/plan';
import { getPrevWeek } from '@/lib/week';

interface WeekActionsMenuProps {
  week: string;
  open: boolean;
  onClose: () => void;
  hasEntries: boolean;
}

export function WeekActionsMenu({ week, open, onClose, hasEntries }: WeekActionsMenuProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleDuplicatePrev = () => {
    let replace = false;
    if (hasEntries) {
      const ok = window.confirm(
        'La semana actual tiene comidas. ¿Reemplazar el plan actual con la semana anterior?',
      );
      if (!ok) return;
      replace = true;
    }
    startTransition(async () => {
      await duplicateWeekAction(getPrevWeek(week), week, replace);
      router.refresh();
      onClose();
    });
  };

  const handleClear = () => {
    if (!window.confirm('¿Borrar todas las comidas de la semana?')) return;
    startTransition(async () => {
      await clearWeekAction(week);
      router.refresh();
      onClose();
    });
  };

  return (
    <BottomSheet open={open} onClose={onClose} title="Acciones de semana">
      <ul className="space-y-1">
        <li>
          <button
            type="button"
            onClick={handleDuplicatePrev}
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
            onClick={handleClear}
            disabled={isPending || !hasEntries}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl bg-surface min-h-touch text-left active:scale-[0.99] transition-transform disabled:opacity-50"
          >
            <Trash2 size={20} className="text-red-400 shrink-0" />
            <span className="font-medium text-red-400">Limpiar semana</span>
          </button>
        </li>
      </ul>
    </BottomSheet>
  );
}
