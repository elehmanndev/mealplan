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
      {/* Floats just above the tab bar, like a bottom toolbar action. */}
      <div
        className="fixed inset-x-0 z-20 px-6 pointer-events-none"
        style={{ bottom: 'calc(max(12px, env(safe-area-inset-bottom) - 10px) + 74px)' }}
      >
        <div className="pointer-events-auto max-w-md mx-auto shadow-glass rounded-full">
          <AddToPlanButton recipeId={recipe.id} servings={servings} />
        </div>
      </div>
    </>
  );
}
