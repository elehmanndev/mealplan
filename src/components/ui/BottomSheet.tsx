'use client';

import { useEffect, type ReactNode } from 'react';
import { X } from 'lucide-react';

interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  fullHeight?: boolean;
}

export function BottomSheet({ open, onClose, title, children, fullHeight = false }: BottomSheetProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col">
      <button
        aria-label="Cerrar"
        onClick={onClose}
        className="flex-1 bg-black/60 backdrop-blur-sm"
      />
      <div
        className={[
          'bg-surface rounded-t-3xl shadow-2xl',
          'animate-slide-up',
          fullHeight ? 'h-[92dvh]' : 'max-h-[85dvh]',
          'flex flex-col',
        ].join(' ')}
        style={{ animation: 'slide-up 0.25s cubic-bezier(0.32, 0.72, 0, 1)' }}
      >
        <div className="flex items-center justify-between px-4 pt-4 pb-2 shrink-0">
          <div className="w-10 h-1 rounded-full bg-neutral-600 mx-auto absolute left-1/2 -translate-x-1/2 top-2" />
          <h2 className="text-lg font-semibold mt-2">{title}</h2>
          <button
            onClick={onClose}
            aria-label="Cerrar"
            className="min-w-touch min-h-touch flex items-center justify-center -mr-2 text-text-muted hover:text-text"
          >
            <X size={22} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto safe-bottom px-4 pb-4">{children}</div>
      </div>
      <style jsx>{`
        @keyframes slide-up {
          from {
            transform: translateY(100%);
          }
          to {
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
