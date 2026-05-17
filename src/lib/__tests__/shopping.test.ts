import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';

// We need an isolated DB for these tests, so set DATABASE_PATH before importing modules that use it.
const TEST_DB = path.join(process.cwd(), '.test-shopping.db');
process.env.DATABASE_PATH = TEST_DB;

// Household 1 ("Casa Lehmann") is created by migration 009 against the test
// DB on first init, so every fixture below scopes to it.
const HID = 1;

beforeAll(() => {
  if (fs.existsSync(TEST_DB)) fs.unlinkSync(TEST_DB);
});

describe('generateShoppingList', () => {
  it('aggregates ingredients across recipes scaled by servings', async () => {
    const { db } = await import('../db');
    const { generateShoppingList } = await import('../shopping');

    db.exec(`
      INSERT INTO recipes (id, household_id, name, base_servings) VALUES (1000, ${HID}, 'Test Pasta', 2);
      INSERT INTO recipes (id, household_id, name, base_servings) VALUES (1001, ${HID}, 'Test Salsa', 2);
      INSERT INTO ingredients (id, name, default_unit, shopping_category, supermarket)
        VALUES (5000, 'TestTomate', 'g', 'verduras', 'mercadona');
      INSERT INTO ingredients (id, name, default_unit, shopping_category, supermarket)
        VALUES (5001, 'TestPasta', 'g', 'despensa', 'mercadona');
      INSERT INTO recipe_ingredients (recipe_id, ingredient_id, quantity, unit) VALUES (1000, 5000, 100, 'g');
      INSERT INTO recipe_ingredients (recipe_id, ingredient_id, quantity, unit) VALUES (1000, 5001, 200, 'g');
      INSERT INTO recipe_ingredients (recipe_id, ingredient_id, quantity, unit) VALUES (1001, 5000, 50, 'g');
      INSERT INTO meal_plan (household_id, date, slot, recipe_id, servings) VALUES (${HID}, '2025-11-17', 'comida', 1000, 4);
      INSERT INTO meal_plan (household_id, date, slot, recipe_id, servings) VALUES (${HID}, '2025-11-17', 'cena', 1001, 2);
    `);

    // Saturday-week opening on 2025-11-15 covers Mon 2025-11-17.
    const groups = generateShoppingList(HID, '2025-11-15');
    const allItems = groups.flatMap((g) => g.items);
    const tomate = allItems.find((i) => i.name === 'TestTomate');
    // pasta (4 servings → ratio 2 → 200g) + salsa (2 servings → ratio 1 → 50g) = 250g
    expect(tomate?.quantity).toBe(250);
  });

  it('respects shopping_state for checked/removed', async () => {
    const { db } = await import('../db');
    const { generateShoppingList } = await import('../shopping');

    db.exec(`
      INSERT INTO shopping_state (household_id, week, ingredient_id, checked, removed) VALUES (${HID}, '2025-11-15', 5000, 1, 0);
      INSERT INTO shopping_state (household_id, week, ingredient_id, checked, removed) VALUES (${HID}, '2025-11-15', 5001, 0, 1);
    `);
    const groups = generateShoppingList(HID, '2025-11-15');
    const allItems = groups.flatMap((g) => g.items);
    const tomate = allItems.find((i) => i.name === 'TestTomate');
    expect(tomate?.checked).toBe(true);
    const pastaItem = allItems.find((i) => i.name === 'TestPasta');
    expect(pastaItem).toBeUndefined();

    const groupsWithRemoved = generateShoppingList(HID, '2025-11-15', { includeRemoved: true });
    const allWithRemoved = groupsWithRemoved.flatMap((g) => g.items);
    expect(allWithRemoved.find((i) => i.name === 'TestPasta')).toBeDefined();
  });

  it('includes shopping_extras', async () => {
    const { db } = await import('../db');
    const { generateShoppingList } = await import('../shopping');

    db.exec(
      `INSERT INTO shopping_extras (household_id, week, name, quantity, unit, shopping_category)
       VALUES (${HID}, '2025-11-15', 'Papel higiénico', 1, 'ud', 'otros')`,
    );
    const groups = generateShoppingList(HID, '2025-11-15');
    const allItems = groups.flatMap((g) => g.items);
    expect(allItems.some((i) => i.name === 'Papel higiénico')).toBe(true);
  });

  it('skips is_pantry ingredients (oil/salt/pepper)', async () => {
    const { db } = await import('../db');
    const { generateShoppingList } = await import('../shopping');

    db.exec(`
      INSERT INTO recipes (id, household_id, name, base_servings) VALUES (1100, ${HID}, 'Test Pantry Recipe', 2);
      INSERT INTO ingredients (id, name, default_unit, shopping_category, supermarket, is_pantry)
        VALUES (5100, 'TestAceite', 'ml', 'despensa', 'lidl', 1);
      INSERT INTO ingredients (id, name, default_unit, shopping_category, supermarket, is_pantry)
        VALUES (5101, 'TestArroz', 'g', 'despensa', 'lidl', 0);
      INSERT INTO recipe_ingredients (recipe_id, ingredient_id, quantity, unit) VALUES (1100, 5100, 30, 'ml');
      INSERT INTO recipe_ingredients (recipe_id, ingredient_id, quantity, unit) VALUES (1100, 5101, 200, 'g');
      INSERT INTO meal_plan (household_id, date, slot, recipe_id, servings) VALUES (${HID}, '2026-01-05', 'comida', 1100, 2);
    `);

    // Saturday-week opening on 2026-01-03 covers Mon 2026-01-05.
    const groups = generateShoppingList(HID, '2026-01-03');
    const allItems = groups.flatMap((g) => g.items);
    expect(allItems.find((i) => i.name === 'TestAceite')).toBeUndefined();
    expect(allItems.find((i) => i.name === 'TestArroz')).toBeDefined();
  });

  it('rounds packaged units up (lata, bandeja, ud, pieza...) but not g/ml', async () => {
    const { db } = await import('../db');
    const { generateShoppingList } = await import('../shopping');

    db.exec(`
      INSERT INTO recipes (id, household_id, name, base_servings) VALUES (1200, ${HID}, 'Half Cans', 2);
      INSERT INTO recipes (id, household_id, name, base_servings) VALUES (1201, ${HID}, 'Half Tray', 2);
      INSERT INTO ingredients (id, name, default_unit, shopping_category, supermarket)
        VALUES (5200, 'TestAceitunas', 'lata', 'despensa', 'lidl');
      INSERT INTO ingredients (id, name, default_unit, shopping_category, supermarket)
        VALUES (5201, 'TestCherry', 'bandeja', 'verduras', 'lidl');
      INSERT INTO ingredients (id, name, default_unit, shopping_category, supermarket)
        VALUES (5202, 'TestHarina', 'g', 'despensa', 'lidl');
      INSERT INTO recipe_ingredients (recipe_id, ingredient_id, quantity, unit) VALUES (1200, 5200, 0.5, 'lata');
      INSERT INTO recipe_ingredients (recipe_id, ingredient_id, quantity, unit) VALUES (1200, 5202, 100, 'g');
      INSERT INTO recipe_ingredients (recipe_id, ingredient_id, quantity, unit) VALUES (1201, 5200, 0.5, 'lata');
      INSERT INTO recipe_ingredients (recipe_id, ingredient_id, quantity, unit) VALUES (1201, 5201, 0.5, 'bandeja');
      INSERT INTO meal_plan (household_id, date, slot, recipe_id, servings) VALUES (${HID}, '2026-02-09', 'comida', 1200, 2);
      INSERT INTO meal_plan (household_id, date, slot, recipe_id, servings) VALUES (${HID}, '2026-02-09', 'cena', 1201, 2);
    `);

    // Saturday-week opening on 2026-02-07 covers Mon 2026-02-09.
    const groups = generateShoppingList(HID, '2026-02-07');
    const allItems = groups.flatMap((g) => g.items);
    // 0.5 + 0.5 = 1.0, packaged → 1
    expect(allItems.find((i) => i.name === 'TestAceitunas')?.quantity).toBe(1);
    // 0.5, packaged → ceil(0.5) = 1
    expect(allItems.find((i) => i.name === 'TestCherry')?.quantity).toBe(1);
    // 100g, NOT packaged → 100
    expect(allItems.find((i) => i.name === 'TestHarina')?.quantity).toBe(100);
  });

  it('aggregates same ingredient across multiple plan entries in the same slot', async () => {
    // Multi-entry-per-slot regression: if Ensaladilla and Pollastre both appear
    // in the same lunch slot, their shared ingredients must still sum correctly.
    const { db } = await import('../db');
    const { generateShoppingList } = await import('../shopping');

    db.exec(`
      INSERT INTO recipes (id, household_id, name, base_servings) VALUES (1300, ${HID}, 'Recipe A', 2);
      INSERT INTO recipes (id, household_id, name, base_servings) VALUES (1301, ${HID}, 'Recipe B', 2);
      INSERT INTO ingredients (id, name, default_unit, shopping_category, supermarket)
        VALUES (5300, 'TestShared', 'g', 'verduras', 'lidl');
      INSERT INTO recipe_ingredients (recipe_id, ingredient_id, quantity, unit) VALUES (1300, 5300, 100, 'g');
      INSERT INTO recipe_ingredients (recipe_id, ingredient_id, quantity, unit) VALUES (1301, 5300, 150, 'g');
      INSERT INTO meal_plan (household_id, date, slot, recipe_id, servings) VALUES (${HID}, '2026-03-09', 'comida', 1300, 2);
      INSERT INTO meal_plan (household_id, date, slot, recipe_id, servings) VALUES (${HID}, '2026-03-09', 'comida', 1301, 2);
    `);

    // Saturday-week opening on 2026-03-07 covers Mon 2026-03-09.
    const groups = generateShoppingList(HID, '2026-03-07');
    const allItems = groups.flatMap((g) => g.items);
    expect(allItems.find((i) => i.name === 'TestShared')?.quantity).toBe(250);
  });
});

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
