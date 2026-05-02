import { describe, it, expect, beforeAll } from 'vitest';
import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';

// We need an isolated DB for these tests, so set DATABASE_PATH before importing modules that use it.
const TEST_DB = path.join(process.cwd(), '.test-shopping.db');
process.env.DATABASE_PATH = TEST_DB;

beforeAll(() => {
  if (fs.existsSync(TEST_DB)) fs.unlinkSync(TEST_DB);
});

describe('generateShoppingList', () => {
  it('aggregates ingredients across recipes scaled by servings', async () => {
    const { db } = await import('../db');
    const { generateShoppingList } = await import('../shopping');

    db.exec(`
      INSERT INTO recipes (id, name, base_servings) VALUES (1000, 'Test Pasta', 2);
      INSERT INTO recipes (id, name, base_servings) VALUES (1001, 'Test Salsa', 2);
      INSERT INTO ingredients (id, name, default_unit, shopping_category)
        VALUES (5000, 'TestTomate', 'g', 'verduras');
      INSERT INTO ingredients (id, name, default_unit, shopping_category)
        VALUES (5001, 'TestPasta', 'g', 'despensa');
      INSERT INTO recipe_ingredients (recipe_id, ingredient_id, quantity, unit) VALUES (1000, 5000, 100, 'g');
      INSERT INTO recipe_ingredients (recipe_id, ingredient_id, quantity, unit) VALUES (1000, 5001, 200, 'g');
      INSERT INTO recipe_ingredients (recipe_id, ingredient_id, quantity, unit) VALUES (1001, 5000, 50, 'g');
      INSERT INTO meal_plan (date, slot, recipe_id, servings) VALUES ('2025-11-17', 'comida', 1000, 4);
      INSERT INTO meal_plan (date, slot, recipe_id, servings) VALUES ('2025-11-17', 'cena', 1001, 2);
    `);

    const groups = generateShoppingList('2025-W47');
    const verduras = groups.find((g) => g.category === 'verduras');
    expect(verduras).toBeDefined();
    const tomate = verduras!.items.find((i) => i.name === 'TestTomate');
    // pasta (4 servings → ratio 2 → 200g) + salsa (2 servings → ratio 1 → 50g) = 250g
    expect(tomate?.quantity).toBe(250);
  });

  it('respects shopping_state for checked/removed', async () => {
    const { db } = await import('../db');
    const { generateShoppingList } = await import('../shopping');

    db.exec(`
      INSERT INTO shopping_state (week, ingredient_id, checked, removed) VALUES ('2025-W47', 5000, 1, 0);
      INSERT INTO shopping_state (week, ingredient_id, checked, removed) VALUES ('2025-W47', 5001, 0, 1);
    `);
    const groups = generateShoppingList('2025-W47');
    const allItems = groups.flatMap((g) => g.items);
    const tomate = allItems.find((i) => i.name === 'TestTomate');
    expect(tomate?.checked).toBe(true);
    const pastaItem = allItems.find((i) => i.name === 'TestPasta');
    expect(pastaItem).toBeUndefined();

    const groupsWithRemoved = generateShoppingList('2025-W47', { includeRemoved: true });
    const allWithRemoved = groupsWithRemoved.flatMap((g) => g.items);
    expect(allWithRemoved.find((i) => i.name === 'TestPasta')).toBeDefined();
  });

  it('includes shopping_extras', async () => {
    const { db } = await import('../db');
    const { generateShoppingList } = await import('../shopping');

    db.exec(
      `INSERT INTO shopping_extras (week, name, quantity, unit, shopping_category)
       VALUES ('2025-W47', 'Papel higiénico', 1, 'ud', 'otros')`,
    );
    const groups = generateShoppingList('2025-W47');
    const otros = groups.find((g) => g.category === 'otros');
    expect(otros?.items.some((i) => i.name === 'Papel higiénico')).toBe(true);
  });
});

// Cleanup test DB after suite
import { afterAll } from 'vitest';
afterAll(() => {
  try {
    if (fs.existsSync(TEST_DB)) fs.unlinkSync(TEST_DB);
    const wal = TEST_DB + '-wal';
    const shm = TEST_DB + '-shm';
    if (fs.existsSync(wal)) fs.unlinkSync(wal);
    if (fs.existsSync(shm)) fs.unlinkSync(shm);
  } catch {}
});

// Compatibility shim: better-sqlite3 isn't actually used directly here
void Database;
