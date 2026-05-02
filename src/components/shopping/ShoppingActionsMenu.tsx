'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { ClipboardCopy, RotateCcw, Eye, EyeOff } from 'lucide-react';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { resetChecksAction } from '@/actions/shopping';

interface ShoppingActionsMenuProps {
  week: string;
  showRemoved: boolean;
  open: boolean;
  onClose: () => void;
}

export function ShoppingActionsMenu({ week, showRemoved, open, onClose }: ShoppingActionsMenuProps) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      const res = await fetch(`/api/shopping/text?week=${encodeURIComponent(week)}`);
      const data = (await res.json()) as { text: string };
      await navigator.clipboard.writeText(data.text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // ignore
    }
  }

  function handleReset() {
    if (!window.confirm('¿Reiniciar todos los checks de esta semana?')) return;
    startTransition(async () => {
      await resetChecksAction(week);
      router.refresh();
      onClose();
    });
  }

  function handleToggleRemoved() {
    const url = showRemoved ? `/shopping?week=${week}` : `/shopping?week=${week}&removed=1`;
    router.replace(url);
    onClose();
  }

  return (
    <BottomSheet open={open} onClose={onClose} title="Opciones">
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
            onClick={handleReset}
            className="w-full flex items-center gap-3 min-h-touch px-2 py-3 text-left hover:bg-surface-2 rounded-xl"
          >
            <RotateCcw size={20} className="text-text-muted" />
            <span>Reset checks</span>
          </button>
        </li>
        <li>
          <button
            type="button"
            onClick={handleToggleRemoved}
            className="w-full flex items-center gap-3 min-h-touch px-2 py-3 text-left hover:bg-surface-2 rounded-xl"
          >
            {showRemoved ? (
              <EyeOff size={20} className="text-text-muted" />
            ) : (
              <Eye size={20} className="text-text-muted" />
            )}
            <span>{showRemoved ? 'Ocultar eliminados' : 'Mostrar eliminados'}</span>
          </button>
        </li>
      </ul>
    </BottomSheet>
  );
}
