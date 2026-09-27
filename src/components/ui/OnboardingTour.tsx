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
      className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center p-2"
      style={{ background: 'var(--backdrop)' }}
      onClick={close}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-sheet p-6 pb-6"
        style={{ background: 'rgb(var(--sheet))', boxShadow: '0 20px 60px rgba(0,0,0,0.3)', marginBottom: 'max(0px, calc(env(safe-area-inset-bottom) - 28px))' }}
      >
        <div className="flex items-start justify-between mb-1">
          <div className="text-footnote text-text-muted tabular-nums">
            {step + 1} / {TIPS.length}
          </div>
          <button
            type="button"
            onClick={close}
            aria-label="Cerrar"
            className="w-8 h-8 -mt-1 -mr-1 rounded-full bg-fill flex items-center justify-center text-text-muted active:scale-90 transition-transform"
          >
            <X size={16} strokeWidth={2.5} />
          </button>
        </div>

        <div className="flex items-center gap-3 mb-3 mt-1">
          <div
            className="w-10 h-10 rounded-[10px] flex items-center justify-center text-white shrink-0 bg-accent"
          >
            {tip.icon}
          </div>
          <h2 className="text-title3 text-text">{tip.title}</h2>
        </div>

        <p className="text-body text-text-muted">{tip.body}</p>

        <div className="flex items-center gap-2 mt-6">
          <div className="flex-1 flex items-center gap-1.5">
            {TIPS.map((_, i) => (
              <span
                key={i}
                className={[
                  'h-2 rounded-full transition-colors',
                  i === step ? 'w-2 bg-text' : 'w-2 bg-text-tertiary',
                ].join(' ')}
              />
            ))}
          </div>
          {step > 0 && (
            <button
              type="button"
              onClick={prev}
              className="h-11 px-4 rounded-full text-body text-accent active:opacity-50"
            >
              Atrás
            </button>
          )}
          <button
            type="button"
            onClick={next}
            className="h-11 px-5 rounded-full bg-accent text-white text-body font-semibold active:opacity-80 transition-opacity"
          >
            {isLast ? 'Empezar' : 'Siguiente'}
          </button>
        </div>
      </div>
    </div>
  );
}
