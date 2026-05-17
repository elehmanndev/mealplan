import Link from 'next/link';
import { Calendar, BookOpen, ShoppingCart, Sparkles, Settings, ChevronRight } from 'lucide-react';
import { Wordmark } from '@/components/ui/Wordmark';
import { getCurrentWeek } from '@/lib/week';
import { requireHouseholdIdOrRedirect } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  await requireHouseholdIdOrRedirect();
  const week = getCurrentWeek();

  return (
    <main className="flex flex-col min-h-dvh bg-bg safe-top safe-bottom">
      <div className="flex-1 flex flex-col px-4 pt-16 pb-8 gap-12">
        <div className="flex flex-col gap-2 min-w-0">
          <h1>
            <Wordmark className="h-10 w-auto" />
          </h1>
          <p className="text-sm whitespace-nowrap">
            <span className="text-text-muted/70">The premise is simple — </span>
            <span className="text-text font-medium">plan once. Eat all week.</span>
          </p>
        </div>

        <div className="flex flex-col gap-4">
          <Link
            href={`/?week=${week}`}
            className="flex items-center justify-between bg-surface active:bg-accent rounded-2xl px-5 py-4 active:scale-[0.98] transition-all group"
          >
            <div className="flex items-center gap-4">
              <Calendar size={24} className="text-accent group-active:text-white" />
              <div className="flex flex-col gap-0.5">
                <div className="text-text group-active:text-white font-semibold text-base leading-tight">Plan semanal</div>
                <div className="text-text-muted group-active:text-white/70 text-sm leading-tight">Tus comidas en un vistazo</div>
              </div>
            </div>
            <ChevronRight size={18} className="text-text-muted group-active:text-white/70" />
          </Link>

          <Link
            href="/recipes"
            className="flex items-center justify-between bg-surface rounded-2xl px-5 py-4 active:scale-[0.98] transition-transform"
          >
            <div className="flex items-center gap-4">
              <BookOpen size={24} className="text-accent" />
              <div className="flex flex-col gap-0.5">
                <div className="text-text font-semibold text-base leading-tight">Recetas</div>
                <div className="text-text-muted text-sm leading-tight">El recetario de la abuela 2.0</div>
              </div>
            </div>
            <ChevronRight size={18} className="text-text-muted" />
          </Link>

          <Link
            href={`/shopping?week=${week}`}
            className="flex items-center justify-between bg-surface rounded-2xl px-5 py-4 active:scale-[0.98] transition-transform"
          >
            <div className="flex items-center gap-4">
              <ShoppingCart size={24} className="text-accent" />
              <div className="flex flex-col gap-0.5">
                <div className="text-text font-semibold text-base leading-tight">Lista de la compra</div>
                <div className="text-text-muted text-sm leading-tight">Lo que le falta a tu despensa</div>
              </div>
            </div>
            <ChevronRight size={18} className="text-text-muted" />
          </Link>

          <Link
            href="/chat"
            className="flex items-center justify-between bg-surface rounded-2xl px-5 py-4 active:scale-[0.98] transition-transform"
          >
            <div className="flex items-center gap-4">
              <Sparkles size={24} className="text-accent" />
              <div className="flex flex-col gap-0.5">
                <div className="text-text font-semibold text-base leading-tight">Chat</div>
                <div className="text-text-muted text-sm leading-tight">Crea recetas con IA</div>
              </div>
            </div>
            <ChevronRight size={18} className="text-text-muted" />
          </Link>

          <Link
            href="/settings"
            className="flex items-center justify-between bg-surface rounded-2xl px-5 py-4 active:scale-[0.98] transition-transform"
          >
            <div className="flex items-center gap-4">
              <Settings size={24} className="text-accent" />
              <div className="flex flex-col gap-0.5">
                <div className="text-text font-semibold text-base leading-tight">Ajustes</div>
                <div className="text-text-muted text-sm leading-tight">Preferencias y datos</div>
              </div>
            </div>
            <ChevronRight size={18} className="text-text-muted" />
          </Link>
        </div>
      </div>
    </main>
  );
}
