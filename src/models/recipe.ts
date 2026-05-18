import { db } from '@/lib/db';
import type { Recipe, RecipeWithIngredients, RecipeIngredient } from '@/types';
import type { RecipeInput } from '@/schemas';
import { findOrCreateIngredient } from './ingredient';

interface RecipeRow {
  id: number;
  name: string;
  description: string | null;
  emoji: string;
  base_servings: number;
  category: string | null;
  prep_time_min: number | null;
  notes: string | null;
  is_favorite: number;
  created_at: string;
}

function getTagsForRecipe(id: number): string[] {
  return (db.prepare('SELECT tag FROM recipe_tags WHERE recipe_id = ? ORDER BY tag').all(id) as { tag: string }[]).map(
    (r) => r.tag,
  );
}

function rowToRecipe(r: RecipeRow): Recipe {
  return {
    ...r,
    is_favorite: !!r.is_favorite,
    category: r.category as Recipe['category'],
    tags: getTagsForRecipe(r.id),
  };
}

function replaceTags(recipeId: number, tags: string[]) {
  db.prepare('DELETE FROM recipe_tags WHERE recipe_id = ?').run(recipeId);
  const insert = db.prepare('INSERT INTO recipe_tags (recipe_id, tag) VALUES (?, ?)');
  for (const tag of new Set(tags)) {
    insert.run(recipeId, tag);
  }
}

// recipe_ingredients and recipe_tags are NOT scoped directly — they live
// behind a recipes.household_id check, with ON DELETE CASCADE for the
// recipe row. Writes happen inside transactions that have already verified
// the parent recipe belongs to the caller's household.

interface RecipeRowWithToken extends RecipeRow {
  share_token: string | null;
}

export function getRecipeShareToken(householdId: number, id: number): string | null {
  const row = db
    .prepare('SELECT share_token FROM recipes WHERE id = ? AND household_id = ?')
    .get(id, householdId) as { share_token: string | null } | undefined;
  return row?.share_token ?? null;
}

export function setRecipeShareToken(
  householdId: number,
  id: number,
  token: string | null,
): void {
  const res = db
    .prepare('UPDATE recipes SET share_token = ? WHERE id = ? AND household_id = ?')
    .run(token, id, householdId);
  if (res.changes === 0) throw new Error('Recipe not found in this household');
}

/**
 * Look up a recipe by its share token without requiring auth. Returns the
 * full recipe with ingredients, or null if the token doesn't match (revoked
 * or never existed). The household is intentionally NOT exposed.
 */
export function getRecipeByShareToken(token: string): RecipeWithIngredients | null {
  const row = db
    .prepare('SELECT * FROM recipes WHERE share_token = ?')
    .get(token) as RecipeRowWithToken | undefined;
  if (!row) return null;
  const ings = db
    .prepare(
      `SELECT ri.ingredient_id, i.name, ri.quantity, ri.unit, i.shopping_category, i.supermarket
       FROM recipe_ingredients ri JOIN ingredients i ON i.id = ri.ingredient_id
       WHERE ri.recipe_id = ? ORDER BY i.name`,
    )
    .all(row.id) as RecipeIngredient[];
  return { ...rowToRecipe(row), ingredients: ings };
}

export function countRecipes(householdId: number): number {
  const row = db
    .prepare('SELECT COUNT(*) as c FROM recipes WHERE household_id = ?')
    .get(householdId) as { c: number };
  return row.c;
}

export function listRecipes(
  householdId: number,
  opts: { search?: string; tags?: string[]; favoritesOnly?: boolean } = {},
): Recipe[] {
  const where: string[] = ['household_id = ?'];
  const params: unknown[] = [householdId];
  if (opts.search) {
    where.push('LOWER(name) LIKE ?');
    params.push(`%${opts.search.toLowerCase()}%`);
  }
  if (opts.tags && opts.tags.length > 0) {
    const placeholders = opts.tags.map(() => '?').join(',');
    where.push(
      `id IN (SELECT recipe_id FROM recipe_tags WHERE tag IN (${placeholders}) GROUP BY recipe_id HAVING COUNT(DISTINCT tag) = ?)`,
    );
    params.push(...opts.tags, opts.tags.length);
  }
  if (opts.favoritesOnly) where.push('is_favorite = 1');
  const sql =
    `SELECT * FROM recipes WHERE ${where.join(' AND ')}` +
    ` ORDER BY is_favorite DESC, name ASC`;
  return (db.prepare(sql).all(...params) as RecipeRow[]).map(rowToRecipe);
}

export function getRecipe(householdId: number, id: number): RecipeWithIngredients | null {
  const row = db
    .prepare('SELECT * FROM recipes WHERE id = ? AND household_id = ?')
    .get(id, householdId) as RecipeRow | undefined;
  if (!row) return null;
  const ings = db
    .prepare(
      `SELECT ri.ingredient_id, i.name, ri.quantity, ri.unit, i.shopping_category, i.supermarket
       FROM recipe_ingredients ri JOIN ingredients i ON i.id = ri.ingredient_id
       WHERE ri.recipe_id = ? ORDER BY i.name`,
    )
    .all(id) as RecipeIngredient[];
  return { ...rowToRecipe(row), ingredients: ings };
}

export function createRecipe(householdId: number, input: RecipeInput): number {
  const tx = db.transaction((data: RecipeInput) => {
    const result = db
      .prepare(
        `INSERT INTO recipes (household_id, name, description, emoji, base_servings, category, prep_time_min, notes, is_favorite)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        householdId,
        data.name,
        data.description ?? null,
        data.emoji,
        data.base_servings,
        data.category ?? null,
        data.prep_time_min ?? null,
        data.notes ?? null,
        data.is_favorite ? 1 : 0,
      );
    const recipeId = Number(result.lastInsertRowid);
    for (const ing of data.ingredients) {
      const ingId =
        ing.ingredient_id ??
        findOrCreateIngredient(ing.name, ing.unit, ing.shopping_category ?? 'otros', ing.supermarket);
      if (ing.ingredient_id && ing.supermarket !== undefined) {
        db.prepare('UPDATE ingredients SET supermarket = ? WHERE id = ?').run(ing.supermarket, ing.ingredient_id);
      }
      db.prepare(
        `INSERT OR REPLACE INTO recipe_ingredients (recipe_id, ingredient_id, quantity, unit)
         VALUES (?, ?, ?, ?)`,
      ).run(recipeId, ingId, ing.quantity, ing.unit);
    }
    replaceTags(recipeId, data.tags ?? []);
    return recipeId;
  });
  return tx(input);
}

export function updateRecipe(householdId: number, id: number, input: RecipeInput): void {
  const tx = db.transaction((data: RecipeInput) => {
    const res = db
      .prepare(
        `UPDATE recipes SET name = ?, description = ?, emoji = ?, base_servings = ?,
                            category = ?, prep_time_min = ?, notes = ?, is_favorite = ?
         WHERE id = ? AND household_id = ?`,
      )
      .run(
        data.name,
        data.description ?? null,
        data.emoji,
        data.base_servings,
        data.category ?? null,
        data.prep_time_min ?? null,
        data.notes ?? null,
        data.is_favorite ? 1 : 0,
        id,
        householdId,
      );
    if (res.changes === 0) throw new Error('Recipe not found in this household');
    db.prepare('DELETE FROM recipe_ingredients WHERE recipe_id = ?').run(id);
    for (const ing of data.ingredients) {
      const ingId =
        ing.ingredient_id ??
        findOrCreateIngredient(ing.name, ing.unit, ing.shopping_category ?? 'otros', ing.supermarket);
      if (ing.ingredient_id && ing.supermarket !== undefined) {
        db.prepare('UPDATE ingredients SET supermarket = ? WHERE id = ?').run(ing.supermarket, ing.ingredient_id);
      }
      db.prepare(
        `INSERT OR REPLACE INTO recipe_ingredients (recipe_id, ingredient_id, quantity, unit)
         VALUES (?, ?, ?, ?)`,
      ).run(id, ingId, ing.quantity, ing.unit);
    }
    replaceTags(id, data.tags ?? []);
  });
  tx(input);
}

export function deleteRecipe(householdId: number, id: number): void {
  const res = db
    .prepare('DELETE FROM recipes WHERE id = ? AND household_id = ?')
    .run(id, householdId);
  if (res.changes === 0) throw new Error('Recipe not found in this household');
}

export function toggleFavoriteRecipe(householdId: number, id: number): void {
  const res = db
    .prepare('UPDATE recipes SET is_favorite = 1 - is_favorite WHERE id = ? AND household_id = ?')
    .run(id, householdId);
  if (res.changes === 0) throw new Error('Recipe not found in this household');
}

export function duplicateRecipe(householdId: number, id: number): number {
  const tx = db.transaction((srcId: number) => {
    const src = db
      .prepare('SELECT * FROM recipes WHERE id = ? AND household_id = ?')
      .get(srcId, householdId) as RecipeRow | undefined;
    if (!src) throw new Error('Recipe not found in this household');
    const res = db
      .prepare(
        `INSERT INTO recipes (household_id, name, description, emoji, base_servings, category, prep_time_min, notes, is_favorite)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)`,
      )
      .run(
        householdId,
        `${src.name} (copia)`,
        src.description,
        src.emoji,
        src.base_servings,
        src.category,
        src.prep_time_min,
        src.notes,
      );
    const newId = Number(res.lastInsertRowid);
    db.prepare(
      `INSERT INTO recipe_ingredients (recipe_id, ingredient_id, quantity, unit)
       SELECT ?, ingredient_id, quantity, unit FROM recipe_ingredients WHERE recipe_id = ?`,
    ).run(newId, srcId);
    db.prepare(
      `INSERT INTO recipe_tags (recipe_id, tag) SELECT ?, tag FROM recipe_tags WHERE recipe_id = ?`,
    ).run(newId, srcId);
    return newId;
  });
  return tx(id);
}
