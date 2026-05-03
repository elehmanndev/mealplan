import Link from 'next/link';
import type { Recipe } from '@/types';
import { FavoriteToggle } from './FavoriteToggle';

interface RecipeCardProps {
  recipe: Recipe;
}

export function RecipeCard({ recipe }: RecipeCardProps) {
  const meta: string[] = [];
  if (recipe.prep_time_min != null) meta.push(`${recipe.prep_time_min}min`);
  meta.push(`${recipe.base_servings} pax`);

  return (
    <Link
      href={`/recipes/${recipe.id}`}
      className="relative aspect-square rounded-2xl bg-surface flex flex-col items-center justify-center p-2 active:scale-[0.98] transition-transform"
    >
      <div className="absolute top-1 right-1">
        <FavoriteToggle recipeId={recipe.id} initial={recipe.is_favorite} />
      </div>
      <span className="text-4xl mb-1" aria-hidden="true">
        {recipe.emoji}
      </span>
      <span className="text-xs font-medium line-clamp-2 text-center leading-tight">{recipe.name}</span>
      <span className="text-[10px] text-text-muted mt-0.5">{meta.join(' · ')}</span>
    </Link>
  );
}
