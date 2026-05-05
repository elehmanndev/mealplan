'use client';

import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
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
        style={{ bottom: 'calc(env(safe-area-inset-bottom) + 96px)' }}
        aria-live="polite"
        aria-atomic="true"
      >
        {toasts.map((t) => {
          const Icon =
            t.kind === 'success' ? CheckCircle2 : t.kind === 'error' ? AlertCircle : Info;
          const tone =
            t.kind === 'success'
              ? 'bg-accent text-white'
              : t.kind === 'error'
                ? 'bg-red-600 text-white'
                : 'bg-surface text-text';
          return (
            <div
              key={t.id}
              role="status"
              className={[
                'pointer-events-auto max-w-[88vw] flex items-center gap-2 px-4 py-2.5 rounded-full shadow-lg',
                'animate-toast-in',
                tone,
              ].join(' ')}
            >
              <Icon size={18} className="shrink-0" />
              <span className="text-sm font-medium">{t.message}</span>
              <button
                type="button"
                onClick={() => dismiss(t.id)}
                aria-label="Cerrar aviso"
                className="ml-1 -mr-1 p-1 rounded-full opacity-70 hover:opacity-100"
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
            transform: translateY(20px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
        .animate-toast-in {
          animation: toast-in 0.18s cubic-bezier(0.32, 0.72, 0, 1);
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
