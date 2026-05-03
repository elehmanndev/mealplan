import Link from 'next/link';
import { Calendar, BookOpen, ShoppingCart, ChevronRight } from 'lucide-react';
import { BottomNav } from '@/components/ui/BottomNav';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { Logo } from '@/components/ui/Logo';
import { getCurrentWeek } from '@/lib/week';

export default function HomePage() {
  const week = getCurrentWeek();

  return (
    <main className="flex flex-col min-h-screen bg-bg safe-top pb-24">
      <div className="flex-1 flex flex-col px-4 pt-12 gap-8">
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-col gap-2 min-w-0">
            <h1 className="flex items-center gap-2.5 text-3xl font-bold text-text">
              <Logo className="w-8 h-8 text-accent shrink-0" />
              MealPlan
            </h1>
            <p className="text-sm whitespace-nowrap">
              <span className="text-text-muted/70">The premise is simple — </span>
              <span className="text-text font-medium">plan once. Eat all week.</span>
            </p>
          </div>
          <ThemeToggle />
        </div>

        <div className="flex flex-col gap-3">
          <Link
            href={`/?week=${week}`}
            className="flex items-center justify-between bg-accent rounded-2xl px-5 py-4 active:scale-[0.98] transition-transform"
          >
            <div className="flex items-center gap-4">
              <Calendar size={28} className="text-white" />
              <div className="flex flex-col gap-0.5">
                <div className="text-white font-semibold text-base leading-tight">Plan semanal</div>
                <div className="text-white/70 text-sm leading-tight">Tus comidas en un vistazo</div>
              </div>
            </div>
            <ChevronRight size={20} className="text-white/70" />
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
        </div>
      </div>

      <BottomNav currentWeek={week} />
    </main>
  );
}
