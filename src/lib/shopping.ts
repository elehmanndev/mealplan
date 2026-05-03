import { db } from './db';
import { formatDate, getWeekDates } from './week';
import { SHOPPING_CATEGORIES } from './shopping-types';
import { SUPERMARKETS } from './supermarkets';
import { PACKAGED_UNITS } from '@/types';
import type { Unit } from '@/types';
import type { ShoppingCategory, ShoppingGroup, ShoppingItem } from './shopping-types';

export { SHOPPING_CATEGORIES };
export type { ShoppingCategory, ShoppingGroup, ShoppingItem };

interface MealRow {
  servings: number;
  recipe_id: number;
  base_servings: number;
}

interface IngRow {
  quantity: number;
  unit: string;
  id: number;
  name: string;
  shopping_category: ShoppingCategory;
  supermarket: string | null;
  is_pantry: number;
}

interface StateRow {
  ingredient_id: number;
  checked: number;
  removed: number;
}

interface ExtraRow {
  id: number;
  name: string;
  quantity: number | null;
  unit: string | null;
  shopping_category: ShoppingCategory;
  checked: number;
  removed: number;
}

export function generateShoppingList(weekStr: string, options: { includeRemoved?: boolean } = {}): ShoppingGroup[] {
  const { includeRemoved = false } = options;
  const dates = getWeekDates(weekStr);
  const start = formatDate(dates[0]);
  const end = formatDate(dates[6]);

  const meals = db
    .prepare(
      `SELECT mp.servings, r.id as recipe_id, r.base_servings
       FROM meal_plan mp JOIN recipes r ON r.id = mp.recipe_id
       WHERE mp.date BETWEEN ? AND ?`,
    )
    .all(start, end) as MealRow[];

  const totals = new Map<string, ShoppingItem & { quantityNumber: number }>();

  for (const meal of meals) {
    const ratio = meal.servings / meal.base_servings;
    const ings = db
      .prepare(
        `SELECT ri.quantity, ri.unit, i.id, i.name, i.shopping_category, i.supermarket, i.is_pantry
         FROM recipe_ingredients ri JOIN ingredients i ON i.id = ri.ingredient_id
         WHERE ri.recipe_id = ?`,
      )
      .all(meal.recipe_id) as IngRow[];

    for (const ing of ings) {
      // Pantry staples (oil, salt, pepper) are part of the recipe but never
      // sum into the shopping list — the user has them already.
      if (ing.is_pantry) continue;

      const key = `${ing.id}-${ing.unit}`;
      const existing = totals.get(key);
      if (existing) {
        existing.quantityNumber += ing.quantity * ratio;
        existing.quantity = quantizeForUnit(existing.quantityNumber, existing.unit as Unit);
      } else {
        const q = ing.quantity * ratio;
        totals.set(key, {
          kind: 'recipe',
          id: ing.id,
          ingredientId: ing.id,
          name: ing.name,
          quantity: quantizeForUnit(q, ing.unit as Unit),
          quantityNumber: q,
          unit: ing.unit,
          category: ing.shopping_category,
          supermarket: ing.supermarket ?? null,
          checked: false,
          removed: false,
        });
      }
    }
  }

  const states = db
    .prepare('SELECT ingredient_id, checked, removed FROM shopping_state WHERE week = ?')
    .all(weekStr) as StateRow[];
  const stateMap = new Map(states.map((s) => [s.ingredient_id, s]));

  for (const item of totals.values()) {
    const s = stateMap.get(item.ingredientId!);
    if (s) {
      item.checked = !!s.checked;
      item.removed = !!s.removed;
    }
  }

  const extras = db
    .prepare(
      `SELECT id, name, quantity, unit, shopping_category, checked, removed
       FROM shopping_extras WHERE week = ?`,
    )
    .all(weekStr) as ExtraRow[];

  const extraItems: ShoppingItem[] = extras.map((e) => ({
    kind: 'extra',
    id: e.id,
    name: e.name,
    quantity: e.quantity,
    unit: e.unit,
    category: e.shopping_category,
    checked: !!e.checked,
    removed: !!e.removed,
  }));

  const all = [...totals.values(), ...extraItems];
  const visible = includeRemoved ? all : all.filter((i) => !i.removed);

  const supermarketOrder: Array<string | null> = [...SUPERMARKETS.map((s) => s.id), null];
  const groups: ShoppingGroup[] = supermarketOrder
    .map((sm) => ({
      supermarket: sm,
      label: SUPERMARKETS.find((s) => s.id === sm)?.label ?? 'Sin asignar',
      items: visible
        .filter((i) => (i.supermarket ?? null) === sm)
        .sort((a, b) => a.name.localeCompare(b.name, 'es')),
    }))
    .filter((g) => g.items.length > 0);

  return groups;
}

// For packaged units (lata, bandeja, bolsa, brick, paquete, ud, pieza, unidad)
// the user buys whole packages, so totals round UP — buying 1.5 cans means
// buying 2. For mass/volume (g, ml, kg, l) we just trim to a sensible
// precision; rounding 49g up to 50g would make you buy a tiny extra package.
function quantizeForUnit(n: number, unit: Unit): number {
  if (PACKAGED_UNITS.has(unit)) return Math.ceil(n);
  if (n >= 10) return Math.round(n);
  if (n >= 1) return Math.round(n * 10) / 10;
  return Math.round(n * 100) / 100;
}

export function shoppingListToText(groups: ShoppingGroup[]): string {
  const lines: string[] = [];
  for (const g of groups) {
    lines.push(`# ${g.label.toUpperCase()}`);
    for (const item of g.items) {
      const qty = item.quantity != null && item.unit ? `${item.quantity} ${item.unit} ` : '';
      lines.push(`- [${item.checked ? 'x' : ' '}] ${qty}${item.name}`);
    }
    lines.push('');
  }
  return lines.join('\n').trim();
}
