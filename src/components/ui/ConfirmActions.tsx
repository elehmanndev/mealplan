'use client';

import type { ReactNode } from 'react';

interface ConfirmActionsProps {
  message: ReactNode;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  destructive?: boolean;
  disabled?: boolean;
}

/**
 * UIAlertController(.actionSheet) body: a grouped block with the message and
 * the confirm action, then a separate bold "Cancelar" block below.
 */
export function ConfirmActions({
  message,
  confirmLabel,
  onConfirm,
  onCancel,
  destructive = false,
  disabled,
}: ConfirmActionsProps) {
  const action =
    'w-full h-[56px] text-[20px] tracking-[-0.45px] pressable disabled:opacity-40 disabled:pointer-events-none';
  return (
    <div className="space-y-2">
      <div className="rounded-cell bg-surface overflow-hidden">
        <p className="px-6 py-4 text-center text-footnote text-text-muted">{message}</p>
        <button
          type="button"
          onClick={onConfirm}
          disabled={disabled}
          className={[action, 'border-t-[0.5px] border-separator', destructive ? 'text-danger' : 'text-accent'].join(' ')}
        >
          {confirmLabel}
        </button>
      </div>
      <button
        type="button"
        onClick={onCancel}
        disabled={disabled}
        className={[action, 'rounded-cell bg-surface text-accent font-semibold'].join(' ')}
      >
        Cancelar
      </button>
    </div>
  );
}
