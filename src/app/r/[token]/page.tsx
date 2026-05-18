import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ChevronLeft, Clock, Users } from 'lucide-react';
import { getRecipeByShareToken } from '@/models/recipe';
import { SUPERMARKETS } from '@/lib/supermarkets';

export const dynamic = 'force-dynamic';

interface SharedRecipePageProps {
  params: Promise<{ token: string }>;
}

export async function generateMetadata({ params }: SharedRecipePageProps) {
  const { token } = await params;
  const recipe = getRecipeByShareToken(token);
  if (!recipe) return { title: 'Receta no encontrada — MealPlan' };
  return {
    title: `${recipe.name} — MealPlan`,
    description: recipe.description ?? `Receta para ${recipe.base_servings} personas`,
  };
}

export default async function SharedRecipePage({ params }: SharedRecipePageProps) {
  const { token } = await params;
  // Token-based read-only view. No auth, no household leakage. If the owner
  // revokes the token, this 404s on the next render.
  if (!/^[A-Za-z0-9_-]{16,64}$/.test(token)) notFound();
  const recipe = getRecipeByShareToken(token);
  if (!recipe) notFound();

  return (
    <main className="min-h-dvh pb-12">
      <header className="sticky top-0 z-20 glass-top safe-top">
        <div className="flex items-center gap-2 px-4 py-3">
          <Link
            href="/login"
            aria-label="Ir a la app"
            className="min-w-touch min-h-touch flex items-center justify-center rounded-full text-text"
          >
            <ChevronLeft size={22} />
          </Link>
          <div className="flex-1 text-center text-xs uppercase tracking-wider text-text-muted">
            Receta compartida
          </div>
          <div className="min-w-touch min-h-touch" aria-hidden />
        </div>
      </header>

      <section className="px-4 pt-6 text-center max-w-2xl mx-auto">
        <div className="text-7xl mb-4" aria-hidden="true">
          {recipe.emoji}
        </div>
        <h1 className="text-2xl font-bold leading-tight tracking-tight line-clamp-2 px-2">
          {recipe.name}
        </h1>
        <div className="flex items-center justify-center gap-3 text-sm text-text-muted mt-2">
          {recipe.prep_time_min != null && (
            <span className="inline-flex items-center gap-1">
              <Clock size={14} /> {recipe.prep_time_min} min
            </span>
          )}
          <span className="inline-flex items-center gap-1">
            <Users size={14} /> {recipe.base_servings} pax
          </span>
        </div>
        {recipe.tags.length > 0 && (
          <div className="flex flex-wrap items-center justify-center gap-2 mt-3 text-sm text-text-muted">
            {recipe.tags.map((tag) => (
              <span key={tag} className="inline-flex items-center px-3 h-7 rounded-full bg-surface-2">
                {tag}
              </span>
            ))}
          </div>
        )}
      </section>

      {recipe.ingredients.length > 0 && (
        <section className="px-4 mt-8 max-w-2xl mx-auto">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-text-muted mb-3 px-1">
            Ingredientes
          </h3>
          <ul className="bg-surface rounded-2xl divide-y divide-[color:var(--glass-border)] overflow-hidden">
            {recipe.ingredients.map((ing) => {
              const sm = SUPERMARKETS.find((s) => s.id === ing.supermarket);
              return (
                <li key={ing.ingredient_id} className="flex items-center gap-3 px-4 py-3">
                  <div className="flex-1 min-w-0">
                    <div className="text-text">{ing.name}</div>
                  </div>
                  <span className="text-text-muted tabular-nums text-sm shrink-0">
                    {ing.quantity} {ing.unit}
                  </span>
                  {sm && (
                    <span className={`text-[10px] font-semibold uppercase tracking-wider rounded-full px-2 py-0.5 ${sm.pillClass}`}>
                      {sm.label}
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {recipe.description && (
        <section className="px-4 mt-6 max-w-2xl mx-auto">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-text-muted mb-2 px-1">
            Descripción
          </h3>
          <p className="bg-surface rounded-2xl p-4 whitespace-pre-wrap text-text">
            {recipe.description}
          </p>
        </section>
      )}

      {recipe.notes && (
        <section className="px-4 mt-4 max-w-2xl mx-auto">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-text-muted mb-2 px-1">
            Notas
          </h3>
          <p className="bg-surface rounded-2xl p-4 whitespace-pre-wrap text-text">{recipe.notes}</p>
        </section>
      )}

      <footer className="mt-12 px-4 max-w-2xl mx-auto">
        <Link
          href="/login"
          className="block w-full text-center h-12 leading-[3rem] rounded-2xl text-white font-medium text-sm"
          style={{ background: 'linear-gradient(135deg, #6366F1 0%, #7C3AED 55%, #A855F7 100%)' }}
        >
          Hacer mi propio plan en MealPlan
        </Link>
        <div className="flex items-center justify-center gap-3 text-[11px] text-text-muted/70 mt-4">
          <Link href="/privacy" className="hover:text-text-muted transition-colors">Privacidad</Link>
          <span className="opacity-40">·</span>
          <Link href="/terms" className="hover:text-text-muted transition-colors">Términos</Link>
        </div>
      </footer>
    </main>
  );
}
