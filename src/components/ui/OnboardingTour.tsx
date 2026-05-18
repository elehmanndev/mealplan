'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Calendar, Sparkles, Move, MousePointerClick, X } from 'lucide-react';

const SEEN_KEY = 'onboarding.tour.seen.v1';

interface Tip {
  icon: React.ReactNode;
  title: string;
  body: string;
}

const TIPS: Tip[] = [
  {
    icon: <MousePointerClick size={20} />,
    title: 'Toca un hueco para añadir',
    body: 'Cada día tiene comida y cena. Pulsa una casilla vacía y elige una receta — o varias.',
  },
  {
    icon: <Move size={20} />,
    title: 'Arrastra para reorganizar',
    body: 'Mantén pulsado un plato y arrástralo a otro día o turno. La lista de la compra se actualiza sola.',
  },
  {
    icon: <Sparkles size={20} />,
    title: 'El chat hace recetas por ti',
    body: 'Pídele "lasaña sin gluten" o pega un enlace — te monta la receta en segundos.',
  },
  {
    icon: <Calendar size={20} />,
    title: 'Cambia de semana arriba',
    body: 'Las flechas a los lados del título mueven entre semanas. El menú "···" copia o vacía la semana.',
  },
];

export function OnboardingTour() {
  const pathname = usePathname() ?? '';
  const search = useSearchParams();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    // Manual reopen via ?tour=1
    if (search?.get('tour') === '1') {
      setStep(0);
      setOpen(true);
      return;
    }
    // Auto-show only on the home page, only the first time, only after the
    // page has had a moment to render so we don't fight with the layout.
    if (pathname !== '/') return;
    let seen = true;
    try {
      seen = window.localStorage.getItem(SEEN_KEY) === '1';
    } catch {
      // ignore
    }
    if (seen) return;
    const timer = window.setTimeout(() => {
      setStep(0);
      setOpen(true);
    }, 500);
    return () => window.clearTimeout(timer);
  }, [pathname, search]);

  function close() {
    setOpen(false);
    try {
      window.localStorage.setItem(SEEN_KEY, '1');
    } catch {
      // ignore
    }
    if (search?.get('tour') === '1') {
      // Strip the param so a refresh doesn't reopen.
      const next = new URLSearchParams(search.toString());
      next.delete('tour');
      const qs = next.toString();
      router.replace(pathname + (qs ? `?${qs}` : ''));
    }
  }

  function next() {
    if (step < TIPS.length - 1) setStep(step + 1);
    else close();
  }

  function prev() {
    if (step > 0) setStep(step - 1);
  }

  if (!open) return null;
  const tip = TIPS[step];
  const isLast = step === TIPS.length - 1;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Cómo funciona MealPlan"
      className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={close}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-t-3xl sm:rounded-3xl bg-bg ring-1 ring-[color:var(--glass-border)] p-6 pb-8 safe-bottom"
      >
        <div className="flex items-start justify-between mb-1">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-text-muted">
            {step + 1} / {TIPS.length}
          </div>
          <button
            type="button"
            onClick={close}
            aria-label="Cerrar"
            className="p-1 -m-1 rounded-full text-text-muted hover:text-text"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex items-center gap-3 mb-3 mt-1">
          <div
            className="w-10 h-10 rounded-2xl flex items-center justify-center text-white shrink-0"
            style={{ background: 'linear-gradient(135deg, #6366F1 0%, #7C3AED 55%, #A855F7 100%)' }}
          >
            {tip.icon}
          </div>
          <h2 className="text-lg font-semibold text-text leading-snug">{tip.title}</h2>
        </div>

        <p className="text-sm text-text-muted leading-relaxed">{tip.body}</p>

        <div className="flex items-center gap-2 mt-6">
          <div className="flex-1 flex items-center gap-1.5">
            {TIPS.map((_, i) => (
              <span
                key={i}
                className={[
                  'h-1.5 rounded-full transition-all',
                  i === step ? 'w-6 bg-accent' : 'w-1.5 bg-text-muted/30',
                ].join(' ')}
              />
            ))}
          </div>
          {step > 0 && (
            <button
              type="button"
              onClick={prev}
              className="h-10 px-4 rounded-2xl text-sm font-medium text-text-muted hover:text-text transition-colors"
            >
              Atrás
            </button>
          )}
          <button
            type="button"
            onClick={next}
            className="h-10 px-5 rounded-2xl text-white text-sm font-medium active:scale-[0.985] transition-transform"
            style={{
              background: 'linear-gradient(135deg, #6366F1 0%, #7C3AED 55%, #A855F7 100%)',
            }}
          >
            {isLast ? 'Empezar' : 'Siguiente'}
          </button>
        </div>
      </div>
    </div>
  );
}
