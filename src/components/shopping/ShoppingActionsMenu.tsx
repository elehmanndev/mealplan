'use client';

import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { ClipboardCopy, RotateCcw } from 'lucide-react';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { ConfirmActions } from '@/components/ui/ConfirmActions';
import { ListRow, ListSection } from '@/components/ui/List';
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
        <ConfirmActions
          message="¿Desmarcar todos los items de esta semana?"
          confirmLabel="Desmarcar todo"
          onConfirm={handleResetConfirmed}
          onCancel={() => setMode('menu')}
          disabled={isPending}
        />
      ) : (
        <ListSection>
          <ListRow
            icon={ClipboardCopy}
            title="Copiar al portapapeles"
            value={copied ? 'Copiado' : undefined}
            onClick={handleCopy}
          />
          <ListRow
            icon={RotateCcw}
            iconBg="rgb(var(--warning))"
            title="Desmarcar todo"
            onClick={() => setMode('confirm-reset')}
          />
        </ListSection>
      )}
    </BottomSheet>
  );
}
