'use client';

import type { RecipeWithIngredients } from '@/types';
import { Stepper } from '@/components/ui/Stepper';
import { formatQuantity, scaleQuantity } from '@/lib/scale';

interface ServingsViewProps {
  recipe: RecipeWithIngredients;
  servings: number;
  setServings: (n: number) => void;
}

export function ServingsView({ recipe, servings, setServings }: ServingsViewProps) {
  return (
    <div>
      <div className="flex justify-center">
        <Stepper
          size="lg"
          value={servings}
          onChange={setServings}
          min={1}
          max={20}
          label="Comensales"
        />
      </div>
      {recipe.ingredients.length > 0 ? (
        <ul className="space-y-2 mt-4">
          {recipe.ingredients.map((ing) => {
            const q = scaleQuantity(ing.quantity, recipe.base_servings, servings);
            return (
              <li
                key={ing.ingredient_id}
                className="flex justify-between items-baseline gap-3 px-4 py-3 bg-surface rounded-xl"
              >
                <span className="font-semibold tabular-nums">
                  {formatQuantity(q)} {ing.unit}
                </span>
                <span className="text-text-muted text-right">{ing.name}</span>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="text-center text-text-muted mt-6">Sin ingredientes</p>
      )}
    </div>
  );
}
