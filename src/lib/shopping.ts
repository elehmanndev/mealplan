import { db } from './db';
import { formatDate, getWeekDates } from './week';
import { SHOPPING_CATEGORIES } from './shopping-types';
import { SUPERMARKETS } from './supermarkets';
import { PACKAGED_UNITS, UNITS } from '@/types';
import type { Unit } from '@/types';
import { normalizeIngredientName } from '@/models/ingredient';
import type { ShoppingCategory, ShoppingGroup, ShoppingItem, ShoppingItemPart } from './shopping-types';

// Catalog rows whose normalized lower-cased name matches share a shopping
// row. Stripping packaging prefix + casefold means "Aceitunas negras",
// "Lata aceitunas negras", and "aceitunas negras" all collapse to the same
// key so the user sees one line in the list even when the catalog still
// holds dupes from before the normalization fix.
function dedupKey(name: string): string {
  return normalizeIngredientName(name).toLowerCase();
}

export { SHOPPING_CATEGORIES };
export type { ShoppingCategory, ShoppingGroup, ShoppingItem, ShoppingItemPart };

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

export function generateShoppingList(
  householdId: number,
  weekStr: string,
  options: { includeRemoved?: boolean } = {},
): ShoppingGroup[] {
  const { includeRemoved = false } = options;
  const dates = getWeekDates(weekStr);
  const start = formatDate(dates[0]);
  const end = formatDate(dates[6]);

  const meals = db
    .prepare(
      `SELECT mp.servings, r.id as recipe_id, r.base_servings
       FROM meal_plan mp JOIN recipes r ON r.id = mp.recipe_id
       WHERE mp.household_id = ? AND mp.date BETWEEN ? AND ?`,
    )
    .all(householdId, start, end) as MealRow[];

  interface AggregatedIngredient {
    // Display name comes from the catalog row whose stored name is already
    // canonical (no packaging prefix); falls back to the lowest id if none.
    displayName: string;
    displayCategory: ShoppingCategory;
    displaySupermarket: string | null;
    // Tie-break helpers — the canonical row's id is preferred for the React
    // key + first-cited identity. All ingredient ids end up in ingredientIds.
    bestRowId: number;
    bestRowIsCanonical: boolean;
    ingredientIds: Set<number>;
    checked: boolean;
    removed: boolean;
    // Each entry is the running raw total for one canonical unit. We quantize
    // only at the end so repeated additions don't compound rounding error.
    perUnit: Map<string, number>;
  }

  // Key by normalized name (case-insensitive) instead of ingredient_id so
  // legacy duplicate catalog rows ("Aceitunas negras" + "Lata aceitunas
  // negras") still produce one shopping line, with both contributions
  // appearing as separate parts (e.g. "100 g + 1 lata").
  const totals = new Map<string, AggregatedIngredient>();

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

      // `ud`, `pieza`, `unidad` all mean "one discrete piece" — collapse to
      // `ud` so the same ingredient doesn't produce parallel parts.
      const unit = canonicalUnit(ing.unit);
      const key = dedupKey(ing.name);
      const isCanonical = normalizeIngredientName(ing.name) === ing.name.trim();
      let entry = totals.get(key);
      if (!entry) {
        entry = {
          displayName: normalizeIngredientName(ing.name),
          displayCategory: ing.shopping_category,
          displaySupermarket: ing.supermarket ?? null,
          bestRowId: ing.id,
          bestRowIsCanonical: isCanonical,
          ingredientIds: new Set([ing.id]),
          checked: false,
          removed: false,
          perUnit: new Map(),
        };
        totals.set(key, entry);
      } else {
        entry.ingredientIds.add(ing.id);
        // Prefer the catalog row that's already canonical for display fields;
        // among canonicals (or among non-canonicals) prefer the lowest id so
        // the rendering stays stable across requests.
        const preferThisRow =
          (isCanonical && !entry.bestRowIsCanonical) ||
          (isCanonical === entry.bestRowIsCanonical && ing.id < entry.bestRowId);
        if (preferThisRow) {
          entry.displayName = normalizeIngredientName(ing.name);
          entry.displayCategory = ing.shopping_category;
          entry.displaySupermarket = ing.supermarket ?? null;
          entry.bestRowId = ing.id;
          entry.bestRowIsCanonical = isCanonical;
        }
      }
      entry.perUnit.set(unit, (entry.perUnit.get(unit) ?? 0) + ing.quantity * ratio);
    }
  }

  const states = db
    .prepare(
      'SELECT ingredient_id, checked, removed FROM shopping_state WHERE household_id = ? AND week = ?',
    )
    .all(householdId, weekStr) as StateRow[];
  const stateMap = new Map(states.map((s) => [s.ingredient_id, s]));

  for (const entry of totals.values()) {
    // ANY-checked / ANY-removed across the merged catalog rows. Toggling
    // writes the new value to every id in the group, so this OR only
    // matters when state from before the merge was written to a non-best
    // ingredient_id — we still respect it instead of silently dropping it.
    for (const id of entry.ingredientIds) {
      const s = stateMap.get(id);
      if (!s) continue;
      if (s.checked) entry.checked = true;
      if (s.removed) entry.removed = true;
    }
  }

  const recipeItems: ShoppingItem[] = Array.from(totals.values()).map((entry) => ({
    kind: 'recipe',
    id: entry.bestRowId,
    ingredientIds: Array.from(entry.ingredientIds).sort((a, b) => a - b),
    name: entry.displayName,
    parts: sortParts(
      Array.from(entry.perUnit.entries()).map(([unit, qty]) => ({
        quantity: quantizeForUnit(qty, unit as Unit),
        unit,
      })),
    ),
    category: entry.displayCategory,
    supermarket: entry.displaySupermarket,
    checked: entry.checked,
    removed: entry.removed,
  }));

  const extras = db
    .prepare(
      `SELECT id, name, quantity, unit, shopping_category, checked, removed
       FROM shopping_extras WHERE household_id = ? AND week = ?`,
    )
    .all(householdId, weekStr) as ExtraRow[];

  const extraItems: ShoppingItem[] = extras.map((e) => ({
    kind: 'extra',
    id: e.id,
    ingredientIds: [],
    name: e.name,
    parts: e.quantity != null && e.unit ? [{ quantity: e.quantity, unit: e.unit }] : [],
    category: e.shopping_category,
    checked: !!e.checked,
    removed: !!e.removed,
  }));

  const all = [...recipeItems, ...extraItems];
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

const UNIT_ALIASES: Record<string, Unit> = {
  pieza: 'ud',
  unidad: 'ud',
};

function canonicalUnit(unit: string): string {
  return UNIT_ALIASES[unit] ?? unit;
}

// Order parts by UNITS tuple position so mass/volume render before packaged
// units before cooking measures — "200 g + 1 lata" reads more naturally than
// "1 lata + 200 g".
const UNIT_ORDER = new Map<string, number>(UNITS.map((u, i) => [u, i]));
function sortParts(parts: ShoppingItemPart[]): ShoppingItemPart[] {
  return parts.sort(
    (a, b) => (UNIT_ORDER.get(a.unit) ?? 999) - (UNIT_ORDER.get(b.unit) ?? 999),
  );
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
      const qty =
        item.parts.length > 0
          ? item.parts.map((p) => `${p.quantity} ${p.unit}`).join(' + ') + ' '
          : '';
      lines.push(`- [${item.checked ? 'x' : ' '}] ${qty}${item.name}`);
    }
    lines.push('');
  }
  return lines.join('\n').trim();
}
