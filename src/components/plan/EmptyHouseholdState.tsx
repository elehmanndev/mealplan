import Link from 'next/link';
import { Sparkles, BookOpen } from 'lucide-react';

/**
 * Shown at the top of `/` when the user's household has zero recipes. Two
 * CTAs: chat assistant (fastest) or manual recipe creation (full control).
 * Self-dismisses naturally — once the household has any recipe, this stops
 * rendering (the parent gates on `recipeCount === 0`).
 */
export function EmptyHouseholdState() {
  return (
    <div
      className="mx-3 mt-4 rounded-2xl p-5 border border-[color:var(--glass-border)] overflow-hidden relative"
      style={{
        background:
          'linear-gradient(135deg, rgba(99,102,241,0.12) 0%, rgba(124,58,237,0.10) 55%, rgba(168,85,247,0.10) 100%)',
      }}
    >
      <div className="relative space-y-3">
        <h2
          className="font-semibold tracking-tight text-text leading-snug"
          style={{ fontSize: 'clamp(18px, 4.6vw, 22px)' }}
        >
          ¡Empieza a planificar!
        </h2>
        <p className="text-sm text-text-muted leading-relaxed">
          Tu casa no tiene recetas todavía. Pídele una a la IA en un par de segundos,
          o créala a mano.
        </p>
        <div className="flex flex-col sm:flex-row gap-2 pt-1">
          <Link
            href="/chat"
            className="inline-flex items-center justify-center gap-2 h-11 px-4 rounded-2xl text-white font-medium text-sm active:scale-[0.985] transition-transform"
            style={{
              background:
                'linear-gradient(135deg, #6366F1 0%, #7C3AED 55%, #A855F7 100%)',
              boxShadow:
                '0 8px 20px -8px rgba(124, 58, 237, 0.55), 0 2px 6px -2px rgba(99, 102, 241, 0.4)',
            }}
          >
            <Sparkles size={16} />
            Pídeselo al chat
          </Link>
          <Link
            href="/recipes"
            className="inline-flex items-center justify-center gap-2 h-11 px-4 rounded-2xl bg-surface text-text font-medium text-sm ring-1 ring-[color:var(--glass-border)] active:scale-[0.985] transition-transform"
          >
            <BookOpen size={16} />
            Crear receta a mano
          </Link>
        </div>
      </div>
    </div>
  );
}
