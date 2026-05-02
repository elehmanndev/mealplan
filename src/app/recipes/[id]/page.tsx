import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { getRecipe } from '@/models/recipe';
import { BottomNav } from '@/components/ui/BottomNav';
import { FavoriteToggle } from '@/components/recipes/FavoriteToggle';
import { RecipeMenu } from '@/components/recipes/RecipeMenu';
import { RecipeDetailClient } from '@/components/recipes/RecipeDetailClient';

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
      <header className="sticky top-0 z-20 bg-bg/95 backdrop-blur-sm border-b border-neutral-800">
        <div className="flex items-center gap-2 px-2 py-2">
          <Link
            href="/recipes"
            aria-label="Volver"
            className="min-w-touch min-h-touch flex items-center justify-center rounded-full text-text"
          >
            <ArrowLeft size={22} />
          </Link>
          <h1 className="flex-1 text-center text-base font-medium truncate px-2">
            {recipe.name}
          </h1>
          <FavoriteToggle recipeId={recipe.id} initial={recipe.is_favorite} />
          <RecipeMenu recipeId={recipe.id} />
        </div>
      </header>

      <section className="px-4 pt-6 text-center">
        <div className="text-7xl mb-4" aria-hidden="true">
          {recipe.emoji}
        </div>
        <h2 className="text-2xl font-bold">{recipe.name}</h2>
        <div className="flex items-center justify-center gap-3 mt-2 text-sm text-text-muted">
          {recipe.category && (
            <span className="inline-flex items-center px-3 h-7 rounded-full bg-surface-2 capitalize">
              {recipe.category}
            </span>
          )}
          {recipe.prep_time_min != null && <span>⏱ {recipe.prep_time_min} min</span>}
        </div>
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

      <BottomNav />
    </main>
  );
}
