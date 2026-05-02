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

function rowToRecipe(r: RecipeRow): Recipe {
  return {
    ...r,
    is_favorite: !!r.is_favorite,
    category: r.category as Recipe['category'],
  };
}

export function listRecipes(opts: { search?: string; category?: string; favoritesOnly?: boolean } = {}): Recipe[] {
  const where: string[] = [];
  const params: unknown[] = [];
  if (opts.search) {
    where.push('LOWER(name) LIKE ?');
    params.push(`%${opts.search.toLowerCase()}%`);
  }
  if (opts.category) {
    where.push('category = ?');
    params.push(opts.category);
  }
  if (opts.favoritesOnly) where.push('is_favorite = 1');
  const sql =
    `SELECT * FROM recipes` +
    (where.length ? ` WHERE ${where.join(' AND ')}` : '') +
    ` ORDER BY is_favorite DESC, name ASC`;
  return (db.prepare(sql).all(...params) as RecipeRow[]).map(rowToRecipe);
}

export function getRecipe(id: number): RecipeWithIngredients | null {
  const row = db.prepare('SELECT * FROM recipes WHERE id = ?').get(id) as RecipeRow | undefined;
  if (!row) return null;
  const ings = db
    .prepare(
      `SELECT ri.ingredient_id, i.name, ri.quantity, ri.unit, i.shopping_category
       FROM recipe_ingredients ri JOIN ingredients i ON i.id = ri.ingredient_id
       WHERE ri.recipe_id = ? ORDER BY i.name`,
    )
    .all(id) as RecipeIngredient[];
  return { ...rowToRecipe(row), ingredients: ings };
}

export function createRecipe(input: RecipeInput): number {
  const tx = db.transaction((data: RecipeInput) => {
    const result = db
      .prepare(
        `INSERT INTO recipes (name, description, emoji, base_servings, category, prep_time_min, notes, is_favorite)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
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
      );
    const recipeId = Number(result.lastInsertRowid);
    for (const ing of data.ingredients) {
      const ingId =
        ing.ingredient_id ??
        findOrCreateIngredient(ing.name, ing.unit, ing.shopping_category ?? 'otros');
      db.prepare(
        `INSERT OR REPLACE INTO recipe_ingredients (recipe_id, ingredient_id, quantity, unit)
         VALUES (?, ?, ?, ?)`,
      ).run(recipeId, ingId, ing.quantity, ing.unit);
    }
    return recipeId;
  });
  return tx(input);
}

export function updateRecipe(id: number, input: RecipeInput): void {
  const tx = db.transaction((data: RecipeInput) => {
    db.prepare(
      `UPDATE recipes SET name = ?, description = ?, emoji = ?, base_servings = ?,
                          category = ?, prep_time_min = ?, notes = ?, is_favorite = ?
       WHERE id = ?`,
    ).run(
      data.name,
      data.description ?? null,
      data.emoji,
      data.base_servings,
      data.category ?? null,
      data.prep_time_min ?? null,
      data.notes ?? null,
      data.is_favorite ? 1 : 0,
      id,
    );
    db.prepare('DELETE FROM recipe_ingredients WHERE recipe_id = ?').run(id);
    for (const ing of data.ingredients) {
      const ingId =
        ing.ingredient_id ??
        findOrCreateIngredient(ing.name, ing.unit, ing.shopping_category ?? 'otros');
      db.prepare(
        `INSERT OR REPLACE INTO recipe_ingredients (recipe_id, ingredient_id, quantity, unit)
         VALUES (?, ?, ?, ?)`,
      ).run(id, ingId, ing.quantity, ing.unit);
    }
  });
  tx(input);
}

export function deleteRecipe(id: number): void {
  db.prepare('DELETE FROM recipes WHERE id = ?').run(id);
}

export function toggleFavoriteRecipe(id: number): void {
  db.prepare('UPDATE recipes SET is_favorite = 1 - is_favorite WHERE id = ?').run(id);
}

export function duplicateRecipe(id: number): number {
  const tx = db.transaction((srcId: number) => {
    const src = db.prepare('SELECT * FROM recipes WHERE id = ?').get(srcId) as RecipeRow | undefined;
    if (!src) throw new Error('Recipe not found');
    const res = db
      .prepare(
        `INSERT INTO recipes (name, description, emoji, base_servings, category, prep_time_min, notes, is_favorite)
         VALUES (?, ?, ?, ?, ?, ?, ?, 0)`,
      )
      .run(
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
    return newId;
  });
  return tx(id);
}
