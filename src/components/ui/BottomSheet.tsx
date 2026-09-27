'use client';

import { useEffect, useRef, useState, type PointerEvent, type ReactNode } from 'react';
import { X } from 'lucide-react';

interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  fullHeight?: boolean;
}

// Drag distance (px) past which releasing the grabber dismisses the sheet.
const DISMISS_THRESHOLD = 110;

/**
 * iOS 26 sheet: floats inset from the screen edges with device-like corner
 * radius, grabber on top, centered title, circular glass close button.
 * Swipe the header down to dismiss (UISheetPresentationController feel).
 */
export function BottomSheet({ open, onClose, title, children, fullHeight = false }: BottomSheetProps) {
  const [dragY, setDragY] = useState(0);
  const dragStart = useRef<number | null>(null);

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

  useEffect(() => {
    if (!open) setDragY(0);
  }, [open]);

  if (!open) return null;

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('button')) return;
    dragStart.current = e.clientY;
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (dragStart.current == null) return;
    const dy = e.clientY - dragStart.current;
    // Rubber-band upward drags, follow the finger downward.
    setDragY(dy > 0 ? dy : dy / 6);
  };
  const onPointerUp = () => {
    if (dragStart.current == null) return;
    dragStart.current = null;
    if (dragY > DISMISS_THRESHOLD) onClose();
    else setDragY(0);
  };

  const dragging = dragStart.current != null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      <button
        aria-label="Cerrar"
        onClick={onClose}
        className="absolute inset-0 sheet-backdrop"
        style={{ background: 'var(--backdrop)' }}
      />
      <div
        data-sheet
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={[
          'sheet-panel relative mx-2 rounded-sheet flex flex-col overflow-hidden',
          fullHeight ? 'h-[92dvh]' : 'max-h-[85dvh]',
        ].join(' ')}
        style={{
          marginBottom: 'max(8px, calc(env(safe-area-inset-bottom) - 20px))',
          background: 'rgb(var(--sheet))',
          boxShadow: '0 -1px 0 var(--glass-edge), 0 20px 60px rgba(0,0,0,0.3)',
          transform: dragY ? `translateY(${dragY}px)` : undefined,
          transition: dragging ? 'none' : 'transform 320ms cubic-bezier(0.32, 0.72, 0, 1)',
        }}
      >
        <div
          className="relative shrink-0 touch-none select-none"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          <div className="mx-auto mt-[5px] h-[5px] w-9 rounded-full bg-text-tertiary" aria-hidden />
          <div className="grid grid-cols-[44px_1fr_44px] items-center px-4 pt-2 pb-3 gap-2">
            <span aria-hidden />
            <h2 className="text-headline text-center truncate">{title}</h2>
            <button
              onClick={onClose}
              aria-label="Cerrar"
              className="w-9 h-9 justify-self-end rounded-full bg-fill flex items-center justify-center text-text-muted active:scale-90 transition-transform"
            >
              <X size={18} strokeWidth={2.5} />
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto overscroll-contain px-4 pb-5">{children}</div>
      </div>
      <style jsx>{`
        .sheet-panel {
          animation: sheet-up 0.42s cubic-bezier(0.32, 0.72, 0, 1);
        }
        .sheet-backdrop {
          animation: sheet-fade 0.3s ease-out;
        }
        @keyframes sheet-up {
          from {
            transform: translateY(100%);
          }
          to {
            transform: translateY(0);
          }
        }
        @keyframes sheet-fade {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}
