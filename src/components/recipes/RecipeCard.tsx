import Link from 'next/link';
import type { Recipe } from '@/types';
import { FavoriteToggle } from './FavoriteToggle';

interface RecipeCardProps {
  recipe: Recipe;
}

/** Photos/App Store-style tile: emoji "artwork" on a soft plate, title + meta below. */
export function RecipeCard({ recipe }: RecipeCardProps) {
  const meta: string[] = [];
  if (recipe.prep_time_min != null) meta.push(`${recipe.prep_time_min} min`);
  meta.push(`${recipe.base_servings} pax`);

  return (
    <div className="relative">
      <Link
        href={`/recipes/${recipe.id}`}
        aria-label={recipe.name}
        className="block rounded-[22px] bg-surface p-2 pb-3 active:scale-[0.97] transition-transform duration-200 ease-ios"
      >
        <span
          className="flex aspect-[4/3] items-center justify-center rounded-[16px] bg-fill text-[52px] leading-none"
          aria-hidden="true"
        >
          {recipe.emoji}
        </span>
        <span className="mt-2 block px-1.5 text-subhead font-semibold leading-tight truncate">
          {recipe.name}
        </span>
        <span className="block px-1.5 mt-0.5 text-footnote text-text-muted">{meta.join(' · ')}</span>
      </Link>
      <div className="absolute top-2 right-2 z-10">
        <FavoriteToggle recipeId={recipe.id} initial={recipe.is_favorite} compact />
      </div>
    </div>
  );
}
