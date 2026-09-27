'use client';

import type { RecipeWithIngredients } from '@/types';
import { Stepper } from '@/components/ui/Stepper';
import { ListRow, ListSection } from '@/components/ui/List';
import { formatAmount, scaleQuantity } from '@/lib/scale';

interface ServingsViewProps {
  recipe: RecipeWithIngredients;
  servings: number;
  setServings: (n: number) => void;
}

export function ServingsView({ recipe, servings, setServings }: ServingsViewProps) {
  return (
    <ListSection header="Ingredientes">
      <div className="list-row flex items-center pl-4">
        <div className="list-row-content flex-1 flex items-center justify-between py-2 pr-3">
          <span className="text-body">Comensales</span>
          <Stepper value={servings} onChange={setServings} min={1} max={20} />
        </div>
      </div>
      {recipe.ingredients.length > 0 ? (
        recipe.ingredients.map((ing) => {
          const q =
            ing.unit === 'al_gusto'
              ? ing.quantity
              : scaleQuantity(ing.quantity, recipe.base_servings, servings);
          return <ListRow key={ing.ingredient_id} title={ing.name} value={formatAmount(q, ing.unit)} />;
        })
      ) : (
        <p className="list-row px-4 py-3 text-body text-text-muted">Sin ingredientes</p>
      )}
    </ListSection>
  );
}
