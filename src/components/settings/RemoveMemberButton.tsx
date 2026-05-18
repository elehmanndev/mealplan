'use client';

import { useState, useTransition } from 'react';
import { Trash2 } from 'lucide-react';
import { removeMemberAction } from '@/actions/household';
import { useToast } from '@/components/ui/Toast';

interface RemoveMemberButtonProps {
  userId: number;
  memberLabel: string;
}

/**
 * Two-tap "trash → confirm" inline pattern. Mobile-friendly: no modal, just
 * a visual swap of the icon button into a "Quitar" / "Cancelar" pair that
 * times out after 4s if the user moves on.
 */
export function RemoveMemberButton({ userId, memberLabel }: RemoveMemberButtonProps) {
  const toast = useToast();
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();

  function arm() {
    setConfirming(true);
    window.setTimeout(() => setConfirming(false), 4000);
  }

  function execute() {
    startTransition(async () => {
      try {
        await removeMemberAction(userId);
        toast.show(`${memberLabel} ya no es miembro`, 'success');
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'No se pudo expulsar al miembro';
        toast.show(msg, 'error');
      } finally {
        setConfirming(false);
      }
    });
  }

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={arm}
        aria-label={`Quitar a ${memberLabel}`}
        className="shrink-0 inline-flex items-center justify-center w-9 h-9 rounded-full text-text-muted hover:text-red-400 transition-colors"
      >
        <Trash2 size={16} />
      </button>
    );
  }

  return (
    <div className="shrink-0 flex items-center gap-1">
      <button
        type="button"
        onClick={() => setConfirming(false)}
        disabled={pending}
        className="text-xs text-text-muted px-2 h-9 rounded-full hover:text-text transition-colors disabled:opacity-50"
      >
        Cancelar
      </button>
      <button
        type="button"
        onClick={execute}
        disabled={pending}
        className="text-xs font-medium text-white bg-red-500 px-3 h-9 rounded-full active:scale-95 transition-transform disabled:opacity-50"
      >
        {pending ? 'Quitando…' : 'Quitar'}
      </button>
    </div>
  );
}
