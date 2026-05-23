import { db } from '@/lib/db';
import type { Ingredient } from '@/types';

// Chat-imported / scraped recipes often prepend the packaging word to the
// ingredient name ("Lata aceitunas negras", "Bandeja tomate cherry"). Left
// alone, that creates a parallel catalog row alongside the canonical
// "Aceitunas negras" / "Tomate cherry" and the shopping list shows both
// lines. Strip the leading packaging word so the unit field carries the
// packaging info and the name is just the food.
const PACKAGING_PREFIX_RE =
  /^(lata|bandeja|bolsa|paquete|brick|bote|pack|tarrina|frasco|tarro|caja)( de| con)?\s+/i;

export function normalizeIngredientName(name: string): string {
  const trimmed = name.trim();
  const stripped = trimmed.replace(PACKAGING_PREFIX_RE, '');
  if (!stripped) return trimmed;
  return stripped.charAt(0).toUpperCase() + stripped.slice(1);
}

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
  supermarket?: string | null,
  isPantry?: boolean,
): number {
  const normalized = normalizeIngredientName(name);
  const existing = db
    .prepare('SELECT id FROM ingredients WHERE LOWER(name) = LOWER(?)')
    .get(normalized) as { id: number } | undefined;
  if (existing) {
    if (supermarket !== undefined) {
      db.prepare('UPDATE ingredients SET supermarket = ? WHERE id = ?').run(supermarket, existing.id);
    }
    if (isPantry === true) {
      db.prepare('UPDATE ingredients SET is_pantry = 1 WHERE id = ?').run(existing.id);
    }
    return existing.id;
  }
  const result = db
    .prepare(
      'INSERT INTO ingredients (name, default_unit, shopping_category, supermarket, is_pantry) VALUES (?, ?, ?, ?, ?)',
    )
    .run(normalized, defaultUnit, shoppingCategory, supermarket ?? null, isPantry ? 1 : 0);
  return Number(result.lastInsertRowid);
}
