import { z } from 'zod';
import { db } from '@/lib/db';
import { findOrCreateIngredient } from '@/models/ingredient';
import { RECIPE_CATEGORIES, RECIPE_TAGS, UNITS } from '@/types';
import { SHOPPING_CATEGORIES } from '@/lib/shopping-types';
import { SUPERMARKETS } from '@/lib/supermarkets';

const SUPERMARKET_IDS = SUPERMARKETS.map((s) => s.id) as [string, ...string[]];

const IngredientSchema = z.object({
  name: z.string().min(1),
  quantity: z.number().positive(),
  unit: z.enum(UNITS),
  shopping_category: z.enum(SHOPPING_CATEGORIES).optional(),
  supermarket: z.enum(SUPERMARKET_IDS).nullable().optional(),
  is_pantry: z.boolean().optional(),
});

export const RecipeInputSchema = z.object({
  name: z.string().min(1),
  description: z.string().nullable().optional(),
  emoji: z.string().optional(),
  servings: z.number().int().positive().optional(),
  base_servings: z.number().int().positive().optional(),
  category: z.enum(RECIPE_CATEGORIES).nullable().optional(),
  prep_time_min: z.number().int().positive().nullable().optional(),
  notes: z.string().nullable().optional(),
  tags: z.array(z.string()).optional(),
  ingredients: z.array(IngredientSchema).min(1),
});

export type RecipeInput = z.infer<typeof RecipeInputSchema>;

export interface ImportResult {
  imported: number;
  skipped: string[];
  insertedIds: number[];
}

export function importRecipes(recipes: RecipeInput[]): ImportResult {
  let imported = 0;
  const skipped: string[] = [];
  const insertedIds: number[] = [];

  const tx = db.transaction(() => {
    const existsStmt = db.prepare('SELECT id FROM recipes WHERE LOWER(name) = LOWER(?)');
    const insertRecipe = db.prepare(
      `INSERT INTO recipes (name, description, emoji, base_servings, category, prep_time_min, notes, is_favorite)
       VALUES (?, ?, ?, ?, ?, ?, ?, 0)`,
    );
    const insertIng = db.prepare(
      `INSERT OR REPLACE INTO recipe_ingredients (recipe_id, ingredient_id, quantity, unit)
       VALUES (?, ?, ?, ?)`,
    );
    const insertTag = db.prepare(
      'INSERT OR IGNORE INTO recipe_tags (recipe_id, tag) VALUES (?, ?)',
    );

    for (const r of recipes) {
      if (existsStmt.get(r.name.trim())) {
        skipped.push(r.name);
        continue;
      }
      const result = insertRecipe.run(
        r.name.trim(),
        r.description ?? null,
        r.emoji ?? '🍽️',
        r.base_servings ?? r.servings ?? 2,
        r.category ?? null,
        r.prep_time_min ?? null,
        r.notes ?? null,
      );
      const recipeId = Number(result.lastInsertRowid);
      for (const ing of r.ingredients) {
        const ingId = findOrCreateIngredient(
          ing.name,
          ing.unit,
          ing.shopping_category ?? 'otros',
          ing.supermarket ?? undefined,
          ing.is_pantry,
        );
        insertIng.run(recipeId, ingId, ing.quantity, ing.unit);
      }
      const validTags = (r.tags ?? []).filter((t): t is (typeof RECIPE_TAGS)[number] =>
        (RECIPE_TAGS as readonly string[]).includes(t),
      );
      for (const tag of new Set(validTags)) {
        insertTag.run(recipeId, tag);
      }
      imported++;
      insertedIds.push(recipeId);
    }
  });

  tx();
  return { imported, skipped, insertedIds };
}
