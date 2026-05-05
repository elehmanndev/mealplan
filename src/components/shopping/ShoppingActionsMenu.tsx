'use client';

import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { ClipboardCopy, RotateCcw } from 'lucide-react';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { resetChecksAction } from '@/actions/shopping';

interface ShoppingActionsMenuProps {
  week: string;
  open: boolean;
  onClose: () => void;
}

type Mode = 'menu' | 'confirm-reset';

export function ShoppingActionsMenu({ week, open, onClose }: ShoppingActionsMenuProps) {
  const router = useRouter();
  const toast = useToast();
  const [mode, setMode] = useState<Mode>('menu');
  const [isPending, startTransition] = useTransition();
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!open) setMode('menu');
  }, [open]);

  async function handleCopy() {
    try {
      const res = await fetch(`/api/shopping/text?week=${encodeURIComponent(week)}`);
      const data = (await res.json()) as { text: string };
      await navigator.clipboard.writeText(data.text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.show('No se pudo copiar', 'error');
    }
  }

  function handleResetConfirmed() {
    startTransition(async () => {
      try {
        await resetChecksAction(week);
        router.refresh();
        onClose();
      } catch {
        toast.show('No se pudo reiniciar', 'error');
      }
    });
  }

  return (
    <BottomSheet open={open} onClose={onClose} title="Opciones">
      {mode === 'confirm-reset' ? (
        <div className="space-y-4">
          <p className="text-text-muted">¿Reiniciar todos los checks de esta semana?</p>
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
              onClick={handleResetConfirmed}
              disabled={isPending}
            >
              Reiniciar
            </Button>
          </div>
        </div>
      ) : (
        <ul className="flex flex-col">
          <li>
            <button
              type="button"
              onClick={handleCopy}
              className="w-full flex items-center gap-3 min-h-touch px-2 py-3 text-left hover:bg-surface-2 rounded-xl"
            >
              <ClipboardCopy size={20} className="text-text-muted" />
              <span className="flex-1">Copiar al portapapeles</span>
              {copied && <span className="text-accent text-sm">Copiado ✓</span>}
            </button>
          </li>
          <li>
            <button
              type="button"
              onClick={() => setMode('confirm-reset')}
              className="w-full flex items-center gap-3 min-h-touch px-2 py-3 text-left hover:bg-surface-2 rounded-xl"
            >
              <RotateCcw size={20} className="text-text-muted" />
              <span>Reset checks</span>
            </button>
          </li>
        </ul>
      )}
    </BottomSheet>
  );
}
