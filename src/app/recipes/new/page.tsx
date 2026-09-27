import { RecipeForm } from '@/components/recipes/RecipeForm';

export default function NewRecipePage() {
  return (
    <main className="min-h-dvh pb-16">
      <RecipeForm mode="create" />
    </main>
  );
}
