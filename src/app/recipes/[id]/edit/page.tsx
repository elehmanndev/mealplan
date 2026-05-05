import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { getRecipe } from '@/models/recipe';
import { RecipeForm } from '@/components/recipes/RecipeForm';

export const dynamic = 'force-dynamic';

interface EditRecipePageProps {
  params: Promise<{ id: string }>;
}

export default async function EditRecipePage({ params }: EditRecipePageProps) {
  const { id } = await params;
  const recipeId = Number(id);
  if (!Number.isFinite(recipeId)) notFound();
  const recipe = getRecipe(recipeId);
  if (!recipe) notFound();

  return (
    <main className="min-h-dvh pb-24">
      <header className="sticky top-0 z-20 glass-top safe-top">
        <div className="flex items-center gap-2 px-4 py-3">
          <Link
            href={`/recipes/${recipeId}`}
            aria-label="Volver"
            className="min-w-touch min-h-touch flex items-center justify-center rounded-full text-text"
          >
            <ArrowLeft size={22} />
          </Link>
          <h1 className="flex-1 text-center text-base font-medium px-2">Editar receta</h1>
          <span className="min-w-touch" aria-hidden="true" />
        </div>
      </header>
      <section className="px-4 pt-4">
        <RecipeForm mode="edit" recipeId={recipeId} initial={recipe} />
      </section>
    </main>
  );
}
