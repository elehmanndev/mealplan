import { notFound } from 'next/navigation';
import { getRecipe } from '@/models/recipe';
import { RecipeForm } from '@/components/recipes/RecipeForm';
import { requireHouseholdIdOrRedirect } from '@/lib/auth';

export const dynamic = 'force-dynamic';

interface EditRecipePageProps {
  params: Promise<{ id: string }>;
}

export default async function EditRecipePage({ params }: EditRecipePageProps) {
  const householdId = await requireHouseholdIdOrRedirect();
  const { id } = await params;
  const recipeId = Number(id);
  if (!Number.isFinite(recipeId)) notFound();
  const recipe = getRecipe(householdId, recipeId);
  if (!recipe) notFound();

  return (
    <main className="min-h-dvh pb-16">
      <RecipeForm mode="edit" recipeId={recipeId} initial={recipe} />
    </main>
  );
}
