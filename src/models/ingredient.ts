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

// Used by the catalog-merge tool to group catalog rows whose normalized name
// matches. Case-insensitive on the normalized form so "Aceitunas negras" and
// "aceitunas negras" cluster too.
function dedupKey(name: string): string {
  return normalizeIngredientName(name).toLowerCase();
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

export interface IngredientWithUsage extends Ingredient {
  recipeCount: number;
}

// Lists every catalog row alongside the number of recipes referencing it.
// The catalog is intentionally global (shared across households) — see
// CLAUDE.md — so this is not scoped by household.
export function listIngredientsWithUsage(): IngredientWithUsage[] {
  return db
    .prepare(
      `SELECT i.*, COALESCE(c.recipe_count, 0) AS recipeCount
       FROM ingredients i
       LEFT JOIN (
         SELECT ingredient_id, COUNT(DISTINCT recipe_id) AS recipe_count
         FROM recipe_ingredients
         GROUP BY ingredient_id
       ) c ON c.ingredient_id = i.id
       ORDER BY LOWER(i.name)`,
    )
    .all() as IngredientWithUsage[];
}

export interface DuplicateGroup {
  key: string;
  rows: IngredientWithUsage[];
}

// Groups catalog rows whose names collapse to the same normalized form
// (e.g. "Aceitunas negras" + "Lata aceitunas negras"). Only groups with
// more than one row are returned, sorted with the most-used row first so
// the UI can suggest it as the canonical merge target.
export function findDuplicateIngredientGroups(): DuplicateGroup[] {
  const rows = listIngredientsWithUsage();
  const buckets = new Map<string, IngredientWithUsage[]>();
  for (const r of rows) {
    const k = dedupKey(r.name);
    let bucket = buckets.get(k);
    if (!bucket) {
      bucket = [];
      buckets.set(k, bucket);
    }
    bucket.push(r);
  }
  const groups: DuplicateGroup[] = [];
  for (const [key, rs] of buckets) {
    if (rs.length < 2) continue;
    rs.sort((a, b) => b.recipeCount - a.recipeCount || a.id - b.id);
    groups.push({ key, rows: rs });
  }
  groups.sort((a, b) => a.rows[0].name.localeCompare(b.rows[0].name));
  return groups;
}

export interface MergeReport {
  canonicalId: number;
  mergedIds: number[];
  recipeIngredientRowsMoved: number;
  recipeIngredientConflictsSummed: number;
  recipeIngredientConflictsDropped: number;
  shoppingStateRowsMoved: number;
  shoppingStateConflictsDropped: number;
}

// Catalog-merge: collapse one or more duplicate ingredient rows into a single
// canonical row. Updates every recipe_ingredients row that pointed at a dupe
// to point at the canonical instead, then deletes the dupe rows.
//
// Conflict handling on recipe_ingredients (PK is (recipe_id, ingredient_id)):
//   - If the recipe already has the canonical row in the SAME unit, sum the
//     quantities (so "200 g + 1 lata" inside one recipe stays correct).
//   - If the recipe has the canonical row in a DIFFERENT unit, drop the dupe
//     row; mixed-unit aggregation belongs to the shopping list, not the
//     recipe (which renders only one unit per ingredient).
//
// Conflict handling on shopping_state (PK is (household_id, week, ingredient_id)):
//   - Keep whatever's already on the canonical row; drop the dupe state row.
//     Recomputing the shopping list will regenerate the right items anyway.
export function mergeIngredients(canonicalId: number, dupeIds: number[]): MergeReport {
  if (dupeIds.length === 0) {
    return {
      canonicalId,
      mergedIds: [],
      recipeIngredientRowsMoved: 0,
      recipeIngredientConflictsSummed: 0,
      recipeIngredientConflictsDropped: 0,
      shoppingStateRowsMoved: 0,
      shoppingStateConflictsDropped: 0,
    };
  }
  if (dupeIds.includes(canonicalId)) {
    throw new Error('canonical id cannot be in dupe list');
  }
  const placeholders = dupeIds.map(() => '?').join(',');
  const found = db
    .prepare(`SELECT id FROM ingredients WHERE id IN (${placeholders})`)
    .all(...dupeIds) as { id: number }[];
  if (found.length !== dupeIds.length) {
    throw new Error('one or more dupe ingredient ids not found');
  }
  const canonical = db
    .prepare('SELECT id FROM ingredients WHERE id = ?')
    .get(canonicalId) as { id: number } | undefined;
  if (!canonical) throw new Error('canonical ingredient id not found');

  const report: MergeReport = {
    canonicalId,
    mergedIds: [...dupeIds],
    recipeIngredientRowsMoved: 0,
    recipeIngredientConflictsSummed: 0,
    recipeIngredientConflictsDropped: 0,
    shoppingStateRowsMoved: 0,
    shoppingStateConflictsDropped: 0,
  };

  const tx = db.transaction(() => {
    for (const dupeId of dupeIds) {
      const dupeRecipeRows = db
        .prepare('SELECT recipe_id, quantity, unit FROM recipe_ingredients WHERE ingredient_id = ?')
        .all(dupeId) as { recipe_id: number; quantity: number; unit: string }[];

      for (const r of dupeRecipeRows) {
        const conflict = db
          .prepare(
            'SELECT quantity, unit FROM recipe_ingredients WHERE recipe_id = ? AND ingredient_id = ?',
          )
          .get(r.recipe_id, canonicalId) as { quantity: number; unit: string } | undefined;

        if (conflict) {
          if (conflict.unit === r.unit) {
            db.prepare(
              'UPDATE recipe_ingredients SET quantity = quantity + ? WHERE recipe_id = ? AND ingredient_id = ?',
            ).run(r.quantity, r.recipe_id, canonicalId);
            report.recipeIngredientConflictsSummed++;
          } else {
            report.recipeIngredientConflictsDropped++;
          }
          db.prepare(
            'DELETE FROM recipe_ingredients WHERE recipe_id = ? AND ingredient_id = ?',
          ).run(r.recipe_id, dupeId);
        } else {
          db.prepare(
            'UPDATE recipe_ingredients SET ingredient_id = ? WHERE recipe_id = ? AND ingredient_id = ?',
          ).run(canonicalId, r.recipe_id, dupeId);
          report.recipeIngredientRowsMoved++;
        }
      }

      const dupeStateRows = db
        .prepare(
          'SELECT household_id, week, checked, removed FROM shopping_state WHERE ingredient_id = ?',
        )
        .all(dupeId) as { household_id: number; week: string; checked: number; removed: number }[];

      for (const s of dupeStateRows) {
        const conflict = db
          .prepare(
            'SELECT 1 FROM shopping_state WHERE household_id = ? AND week = ? AND ingredient_id = ?',
          )
          .get(s.household_id, s.week, canonicalId);
        if (conflict) {
          db.prepare(
            'DELETE FROM shopping_state WHERE household_id = ? AND week = ? AND ingredient_id = ?',
          ).run(s.household_id, s.week, dupeId);
          report.shoppingStateConflictsDropped++;
        } else {
          db.prepare(
            'UPDATE shopping_state SET ingredient_id = ? WHERE household_id = ? AND week = ? AND ingredient_id = ?',
          ).run(canonicalId, s.household_id, s.week, dupeId);
          report.shoppingStateRowsMoved++;
        }
      }

      db.prepare('DELETE FROM ingredients WHERE id = ?').run(dupeId);
    }
  });

  tx();
  return report;
}
