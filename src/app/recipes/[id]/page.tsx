import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { getRecipe } from '@/models/recipe';
import { getCurrentWeek } from '@/lib/week';
import { BottomNav } from '@/components/ui/BottomNav';
import { FavoriteToggle } from '@/components/recipes/FavoriteToggle';
import { RecipeMenu } from '@/components/recipes/RecipeMenu';
import { RecipeDetailClient } from '@/components/recipes/RecipeDetailClient';

export const dynamic = 'force-dynamic';

interface RecipeDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function RecipeDetailPage({ params }: RecipeDetailPageProps) {
  const { id } = await params;
  const recipeId = Number(id);
  if (!Number.isFinite(recipeId)) notFound();
  const recipe = getRecipe(recipeId);
  if (!recipe) notFound();

  return (
    <main className="min-h-dvh pb-32">
      <header className="sticky top-0 z-20 glass-top safe-top">
        <div className="flex items-center gap-2 px-4 py-3">
          <Link
            href="/recipes"
            aria-label="Volver"
            className="min-w-touch min-h-touch flex items-center justify-center rounded-full text-text"
          >
            <ArrowLeft size={22} />
          </Link>
          <div className="flex-1" aria-hidden />
          <FavoriteToggle recipeId={recipe.id} initial={recipe.is_favorite} />
          <RecipeMenu recipeId={recipe.id} />
        </div>
      </header>

      <section className="px-4 pt-6 text-center">
        <div className="text-7xl mb-4" aria-hidden="true">
          {recipe.emoji}
        </div>
        <h1 className="text-2xl font-bold leading-tight tracking-tight line-clamp-2 px-2">
          {recipe.name}
        </h1>
        {(recipe.prep_time_min != null || recipe.base_servings) && (
          <p className="text-sm text-text-muted mt-1">
            {recipe.prep_time_min != null ? `${recipe.prep_time_min} min · ` : ''}
            {recipe.base_servings} pax
          </p>
        )}
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

      <section className="px-4 mt-6">
        <RecipeDetailClient recipe={recipe} />
      </section>

      {recipe.description && (
        <section className="px-4 mt-6">
          <h3 className="text-sm text-text-muted mb-2">Descripción</h3>
          <p className="bg-surface rounded-2xl p-4 whitespace-pre-wrap">{recipe.description}</p>
        </section>
      )}

      {recipe.notes && (
        <section className="px-4 mt-4">
          <h3 className="text-sm text-text-muted mb-2">Notas</h3>
          <p className="bg-surface rounded-2xl p-4 whitespace-pre-wrap">{recipe.notes}</p>
        </section>
      )}

      <BottomNav currentWeek={getCurrentWeek()} />
    </main>
  );
}
