'use client';

import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';

type ToastKind = 'success' | 'error' | 'info';

interface ToastItem {
  id: number;
  message: string;
  kind: ToastKind;
}

interface ToastContextValue {
  show: (message: string, kind?: ToastKind) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

let nextId = 1;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const pathname = usePathname();
  const onChat = pathname?.startsWith('/chat') ?? false;

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const show = useCallback(
    (message: string, kind: ToastKind = 'info') => {
      const id = nextId++;
      setToasts((prev) => [...prev, { id, message, kind }]);
      window.setTimeout(() => dismiss(id), 4000);
    },
    [dismiss],
  );

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      <div
        className="fixed left-1/2 -translate-x-1/2 z-[100] flex flex-col items-center gap-2 pointer-events-none"
        style={{ bottom: `calc(env(safe-area-inset-bottom) + ${onChat ? 180 : 100}px)` }}
        aria-live="polite"
        aria-atomic="true"
      >
        {toasts.map((t) => {
          const Icon =
            t.kind === 'success' ? CheckCircle2 : t.kind === 'error' ? AlertCircle : Info;
          // iOS-style HUD: glass capsule, tinted glyph carries the tone.
          const tone =
            t.kind === 'success' ? 'text-success' : t.kind === 'error' ? 'text-danger' : 'text-accent';
          return (
            <div
              key={t.id}
              role="status"
              className={[
                'glass pointer-events-auto max-w-[88vw] flex items-center gap-2.5 pl-4 pr-2 py-2.5 rounded-full text-text',
                'animate-toast-in',
              ].join(' ')}
            >
              <Icon size={20} strokeWidth={2.25} className={['shrink-0', tone].join(' ')} />
              <span className="text-subhead font-semibold whitespace-nowrap truncate">{t.message}</span>
              <button
                type="button"
                onClick={() => dismiss(t.id)}
                aria-label="Cerrar aviso"
                className="ml-1 p-1 rounded-full text-text-muted active:opacity-50"
              >
                <X size={16} />
              </button>
            </div>
          );
        })}
      </div>
      <style jsx global>{`
        @keyframes toast-in {
          from {
            transform: translateY(16px) scale(0.92);
            opacity: 0;
          }
          to {
            transform: translateY(0) scale(1);
            opacity: 1;
          }
        }
        .animate-toast-in {
          animation: toast-in 0.36s cubic-bezier(0.34, 1.4, 0.64, 1);
        }
        @media (prefers-reduced-motion: reduce) {
          .animate-toast-in {
            animation: none;
          }
        }
      `}</style>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    return { show: () => undefined };
  }
  return ctx;
}
