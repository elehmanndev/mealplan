'use client';

import { useState } from 'react';
import type { RecipeWithIngredients } from '@/types';
import { ServingsView } from './ServingsView';
import { AddToPlanButton } from './AddToPlanButton';

interface RecipeDetailClientProps {
  recipe: RecipeWithIngredients;
}

export function RecipeDetailClient({ recipe }: RecipeDetailClientProps) {
  const [servings, setServings] = useState(recipe.base_servings);

  return (
    <>
      <ServingsView recipe={recipe} servings={servings} setServings={setServings} />
      <div className="fixed bottom-0 inset-x-0 z-20 bg-bg/95 backdrop-blur-sm border-t border-neutral-800 px-4 pt-3 pb-[calc(env(safe-area-inset-bottom)+72px)]">
        <AddToPlanButton recipeId={recipe.id} servings={servings} />
      </div>
    </>
  );
}
