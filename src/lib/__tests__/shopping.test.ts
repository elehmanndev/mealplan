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
    expect(tomate?.parts).toEqual([{ quantity: 250, unit: 'g' }]);
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
    expect(allItems.find((i) => i.name === 'TestAceitunas')?.parts).toEqual([
      { quantity: 1, unit: 'lata' },
    ]);
    // 0.5, packaged → ceil(0.5) = 1
    expect(allItems.find((i) => i.name === 'TestCherry')?.parts).toEqual([
      { quantity: 1, unit: 'bandeja' },
    ]);
    // 100g, NOT packaged → 100
    expect(allItems.find((i) => i.name === 'TestHarina')?.parts).toEqual([
      { quantity: 100, unit: 'g' },
    ]);
  });

  it('merges equivalent discrete-unit aliases (ud / pieza / unidad)', async () => {
    // Imported / chat-generated recipes can record the same "one piece" unit as
    // any of `ud`, `pieza`, or `unidad`. The shopping list must collapse them
    // into a single line instead of showing "Zanahoria 2 ud" + "Zanahoria 6 pieza".
    const { db } = await import('../db');
    const { generateShoppingList } = await import('../shopping');

    db.exec(`
      INSERT INTO recipes (id, household_id, name, base_servings) VALUES (1400, ${HID}, 'Recipe Ud', 2);
      INSERT INTO recipes (id, household_id, name, base_servings) VALUES (1401, ${HID}, 'Recipe Pieza', 2);
      INSERT INTO recipes (id, household_id, name, base_servings) VALUES (1402, ${HID}, 'Recipe Unidad', 2);
      INSERT INTO ingredients (id, name, default_unit, shopping_category, supermarket)
        VALUES (5400, 'TestZanahoria', 'ud', 'verduras', 'lidl');
      INSERT INTO recipe_ingredients (recipe_id, ingredient_id, quantity, unit) VALUES (1400, 5400, 2, 'ud');
      INSERT INTO recipe_ingredients (recipe_id, ingredient_id, quantity, unit) VALUES (1401, 5400, 6, 'pieza');
      INSERT INTO recipe_ingredients (recipe_id, ingredient_id, quantity, unit) VALUES (1402, 5400, 1, 'unidad');
      INSERT INTO meal_plan (household_id, date, slot, recipe_id, servings) VALUES (${HID}, '2026-04-13', 'comida', 1400, 2);
      INSERT INTO meal_plan (household_id, date, slot, recipe_id, servings) VALUES (${HID}, '2026-04-13', 'cena', 1401, 2);
      INSERT INTO meal_plan (household_id, date, slot, recipe_id, servings) VALUES (${HID}, '2026-04-14', 'comida', 1402, 2);
    `);

    // Saturday-week opening on 2026-04-11 covers Mon 2026-04-13 + Tue 2026-04-14.
    const groups = generateShoppingList(HID, '2026-04-11');
    const allItems = groups.flatMap((g) => g.items);
    const zanahorias = allItems.filter((i) => i.name === 'TestZanahoria');
    expect(zanahorias).toHaveLength(1);
    expect(zanahorias[0].parts).toEqual([{ quantity: 9, unit: 'ud' }]);
  });

  it('shows one row with multiple parts when the same ingredient appears in different units', async () => {
    // Same ingredient ("Aceitunas negras") used as a `lata` in one recipe and
    // as `g` in another must collapse into ONE shopping line carrying both
    // parts — "100 g + 1 lata" — not two separate rows.
    const { db } = await import('../db');
    const { generateShoppingList } = await import('../shopping');

    db.exec(`
      INSERT INTO recipes (id, household_id, name, base_servings) VALUES (1500, ${HID}, 'Ensalada', 2);
      INSERT INTO recipes (id, household_id, name, base_servings) VALUES (1501, ${HID}, 'Pizza', 2);
      INSERT INTO ingredients (id, name, default_unit, shopping_category, supermarket)
        VALUES (5500, 'TestAceitunasNegras', 'lata', 'despensa', 'lidl');
      INSERT INTO recipe_ingredients (recipe_id, ingredient_id, quantity, unit) VALUES (1500, 5500, 100, 'g');
      INSERT INTO recipe_ingredients (recipe_id, ingredient_id, quantity, unit) VALUES (1501, 5500, 1, 'lata');
      INSERT INTO meal_plan (household_id, date, slot, recipe_id, servings) VALUES (${HID}, '2026-05-04', 'comida', 1500, 2);
      INSERT INTO meal_plan (household_id, date, slot, recipe_id, servings) VALUES (${HID}, '2026-05-04', 'cena', 1501, 2);
    `);

    // Saturday-week opening on 2026-05-02 covers Mon 2026-05-04.
    const groups = generateShoppingList(HID, '2026-05-02');
    const allItems = groups.flatMap((g) => g.items);
    const item = allItems.filter((i) => i.name === 'TestAceitunasNegras');
    expect(item).toHaveLength(1);
    // Parts sorted by UNITS tuple order — g (mass) before lata (packaged).
    expect(item[0].parts).toEqual([
      { quantity: 100, unit: 'g' },
      { quantity: 1, unit: 'lata' },
    ]);
  });

  it('collapses two catalog rows whose names normalize to the same food', async () => {
    // The catalog accumulated legacy duplicates ("Aceitunas test" alongside
    // "Lata aceitunas test") before the prefix-stripping fix landed. Users
    // can't all be expected to clean those up by hand — the shopping list
    // must merge them in display so the same food shows on one line, with
    // both contributions as separate parts.
    const { db } = await import('../db');
    const { generateShoppingList } = await import('../shopping');

    db.exec(`
      INSERT INTO recipes (id, household_id, name, base_servings) VALUES (1600, ${HID}, 'Tapa', 2);
      INSERT INTO recipes (id, household_id, name, base_servings) VALUES (1601, ${HID}, 'Pizza dup', 2);
      INSERT INTO ingredients (id, name, default_unit, shopping_category, supermarket)
        VALUES (5600, 'Aceitunas test', 'g', 'despensa', 'lidl');
      INSERT INTO ingredients (id, name, default_unit, shopping_category, supermarket)
        VALUES (5601, 'Lata aceitunas test', 'lata', 'despensa', 'lidl');
      INSERT INTO recipe_ingredients (recipe_id, ingredient_id, quantity, unit) VALUES (1600, 5600, 100, 'g');
      INSERT INTO recipe_ingredients (recipe_id, ingredient_id, quantity, unit) VALUES (1601, 5601, 1, 'lata');
      INSERT INTO meal_plan (household_id, date, slot, recipe_id, servings) VALUES (${HID}, '2026-06-01', 'comida', 1600, 2);
      INSERT INTO meal_plan (household_id, date, slot, recipe_id, servings) VALUES (${HID}, '2026-06-01', 'cena', 1601, 2);
    `);

    // Saturday-week opening on 2026-05-30 covers Mon 2026-06-01.
    const groups = generateShoppingList(HID, '2026-05-30');
    const allItems = groups.flatMap((g) => g.items);
    const merged = allItems.filter((i) => i.name === 'Aceitunas test');
    expect(merged).toHaveLength(1);
    // Both ingredient ids appear so toggle/remove can write state to each;
    // otherwise stale state on the second row would resurrect on re-render.
    expect(merged[0].ingredientIds).toEqual([5600, 5601]);
    expect(merged[0].parts).toEqual([
      { quantity: 100, unit: 'g' },
      { quantity: 1, unit: 'lata' },
    ]);
    // The display name comes from the catalog row that's already in canonical
    // form, not from the prefix-polluted "Lata aceitunas test".
    expect(merged[0].name).toBe('Aceitunas test');
    // Polluted row should NOT also appear as a separate item.
    expect(allItems.some((i) => i.name === 'Lata aceitunas test')).toBe(false);
  });

  it('marks the merged row checked when state exists on either underlying catalog row', async () => {
    // State from before the merge could be sitting on either id — we OR
    // them together so the user's earlier check isn't silently dropped.
    const { db } = await import('../db');
    const { generateShoppingList } = await import('../shopping');

    db.exec(
      `INSERT INTO shopping_state (household_id, week, ingredient_id, checked, removed)
       VALUES (${HID}, '2026-05-30', 5601, 1, 0)`,
    );
    const groups = generateShoppingList(HID, '2026-05-30');
    const merged = groups.flatMap((g) => g.items).find((i) => i.name === 'Aceitunas test');
    expect(merged?.checked).toBe(true);
  });

  it('toggling shopping_state on a multi-unit ingredient checks the whole row', async () => {
    // Continuation of the multi-unit fixture: shopping_state is keyed by
    // (household, week, ingredient_id) with no unit, so one toggle must mark
    // the consolidated row checked regardless of how many parts it has.
    const { db } = await import('../db');
    const { generateShoppingList } = await import('../shopping');

    db.exec(
      `INSERT INTO shopping_state (household_id, week, ingredient_id, checked, removed)
       VALUES (${HID}, '2026-05-02', 5500, 1, 0)`,
    );
    const groups = generateShoppingList(HID, '2026-05-02');
    const item = groups.flatMap((g) => g.items).find((i) => i.name === 'TestAceitunasNegras');
    expect(item?.checked).toBe(true);
    expect(item?.parts).toHaveLength(2);
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
    expect(allItems.find((i) => i.name === 'TestShared')?.parts).toEqual([
      { quantity: 250, unit: 'g' },
    ]);
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
