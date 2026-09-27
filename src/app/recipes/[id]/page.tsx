import { notFound } from 'next/navigation';
import { Clock, Users } from 'lucide-react';
import { getRecipe, getRecipeShareToken } from '@/models/recipe';
import { getCurrentWeek } from '@/lib/week';
import { BottomNav } from '@/components/ui/BottomNav';
import { NavBar } from '@/components/ui/NavBar';
import { ListSection } from '@/components/ui/List';
import { FavoriteToggle } from '@/components/recipes/FavoriteToggle';
import { RecipeMenu } from '@/components/recipes/RecipeMenu';
import { RecipeDetailClient } from '@/components/recipes/RecipeDetailClient';
import { requireHouseholdIdOrRedirect } from '@/lib/auth';

export const dynamic = 'force-dynamic';

interface RecipeDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function RecipeDetailPage({ params }: RecipeDetailPageProps) {
  const householdId = await requireHouseholdIdOrRedirect();
  const { id } = await params;
  const recipeId = Number(id);
  if (!Number.isFinite(recipeId)) notFound();
  const recipe = getRecipe(householdId, recipeId);
  if (!recipe) notFound();
  const shareToken = getRecipeShareToken(householdId, recipe.id);

  return (
    <main className="min-h-dvh pb-48">
      <NavBar
        title={recipe.name}
        back={{ href: '/recipes', label: 'Recetas' }}
        revealTitleOnScrollPast="recipe-title"
        trailing={
          <>
            <FavoriteToggle recipeId={recipe.id} initial={recipe.is_favorite} />
            <RecipeMenu recipeId={recipe.id} recipeName={recipe.name} initialShareToken={shareToken} />
          </>
        }
      />

      <section className="px-4 pt-4 pb-2 flex flex-col items-center text-center">
        <div
          className="w-28 h-28 rounded-[30px] bg-surface flex items-center justify-center text-[64px] leading-none mb-4"
          aria-hidden="true"
        >
          {recipe.emoji}
        </div>
        <h2 id="recipe-title" className="text-title1 line-clamp-2 px-2">{recipe.name}</h2>
        <div className="flex items-center justify-center gap-3 text-subhead text-text-muted mt-1.5">
          {recipe.prep_time_min != null && (
            <span className="inline-flex items-center gap-1">
              <Clock size={15} /> {recipe.prep_time_min} min
            </span>
          )}
          <span className="inline-flex items-center gap-1">
            <Users size={15} /> {recipe.base_servings} pax
          </span>
        </div>
        {recipe.tags.length > 0 && (
          <div className="flex flex-wrap items-center justify-center gap-1.5 mt-3">
            {recipe.tags.map((tag) => (
              <span key={tag} className="inline-flex items-center px-3 h-7 rounded-full bg-fill text-footnote font-medium">
                {tag}
              </span>
            ))}
          </div>
        )}
      </section>

      <div className="px-4 mt-4 space-y-7">
        <RecipeDetailClient recipe={recipe} />

        {recipe.description && (
          <ListSection header="Descripción">
            <p className="px-4 py-3 text-body whitespace-pre-wrap">{recipe.description}</p>
          </ListSection>
        )}

        {recipe.notes && (
          <ListSection header="Notas">
            <p className="px-4 py-3 text-body whitespace-pre-wrap">{recipe.notes}</p>
          </ListSection>
        )}
      </div>

      <BottomNav currentWeek={getCurrentWeek()} />
    </main>
  );
}
