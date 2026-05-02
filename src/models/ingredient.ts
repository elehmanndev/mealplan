import { db } from '@/lib/db';
import type { Ingredient } from '@/types';

export function searchIngredients(query: string, limit = 10): Ingredient[] {
  if (!query.trim()) {
    return db
      .prepare('SELECT * FROM ingredients ORDER BY name LIMIT ?')
      .all(limit) as Ingredient[];
  }
  return db
    .prepare(
      `SELECT * FROM ingredients
       WHERE LOWER(name) LIKE ?
       ORDER BY
         CASE WHEN LOWER(name) LIKE ? THEN 0 ELSE 1 END,
         name
       LIMIT ?`,
    )
    .all(`%${query.toLowerCase()}%`, `${query.toLowerCase()}%`, limit) as Ingredient[];
}

export function findOrCreateIngredient(
  name: string,
  defaultUnit: string,
  shoppingCategory: string,
): number {
  const trimmed = name.trim();
  const existing = db
    .prepare('SELECT id FROM ingredients WHERE LOWER(name) = LOWER(?)')
    .get(trimmed) as { id: number } | undefined;
  if (existing) return existing.id;
  const result = db
    .prepare(
      'INSERT INTO ingredients (name, default_unit, shopping_category) VALUES (?, ?, ?)',
    )
    .run(trimmed, defaultUnit, shoppingCategory);
  return Number(result.lastInsertRowid);
}
