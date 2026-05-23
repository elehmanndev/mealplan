import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

// Isolated DB per the same convention as shopping.test.ts — must set
// DATABASE_PATH before importing anything that touches @/lib/db.
const TEST_DB = path.join(process.cwd(), '.test-ingredient.db');
process.env.DATABASE_PATH = TEST_DB;

beforeAll(() => {
  if (fs.existsSync(TEST_DB)) fs.unlinkSync(TEST_DB);
});

describe('normalizeIngredientName', () => {
  it('strips leading packaging words so the unit carries the packaging info', async () => {
    const { normalizeIngredientName } = await import('../ingredient');
    expect(normalizeIngredientName('Lata aceitunas negras sin hueso')).toBe(
      'Aceitunas negras sin hueso',
    );
    expect(normalizeIngredientName('Bandeja tomate cherry')).toBe('Tomate cherry');
    expect(normalizeIngredientName('Bolsa ensalada 4 estaciones')).toBe('Ensalada 4 estaciones');
    expect(normalizeIngredientName('Paquete espinacas')).toBe('Espinacas');
    expect(normalizeIngredientName('Brick caldo de pollo')).toBe('Caldo de pollo');
  });

  it('handles "de" / "con" between packaging word and the noun', async () => {
    const { normalizeIngredientName } = await import('../ingredient');
    expect(normalizeIngredientName('Bote de tomate frito')).toBe('Tomate frito');
    expect(normalizeIngredientName('Lata de atún')).toBe('Atún');
    expect(normalizeIngredientName('Tarrina con queso fresco')).toBe('Queso fresco');
  });

  it('leaves names without a leading packaging word untouched', async () => {
    const { normalizeIngredientName } = await import('../ingredient');
    // "Atún en lata" describes the product type — "lata" is not a leading
    // packaging prefix here, so the name should be preserved.
    expect(normalizeIngredientName('Atún en lata')).toBe('Atún en lata');
    expect(normalizeIngredientName('Salsa de tomate')).toBe('Salsa de tomate');
    expect(normalizeIngredientName('Pasta seca')).toBe('Pasta seca');
    expect(normalizeIngredientName('Aceitunas negras')).toBe('Aceitunas negras');
  });

  it('does not strip a bare packaging word with no following noun', async () => {
    const { normalizeIngredientName } = await import('../ingredient');
    expect(normalizeIngredientName('Lata')).toBe('Lata');
    expect(normalizeIngredientName('Bandeja')).toBe('Bandeja');
  });
});

describe('findOrCreateIngredient', () => {
  it('merges packaging-prefixed names into the canonical row', async () => {
    const { findOrCreateIngredient } = await import('../ingredient');
    const { db } = await import('@/lib/db');

    const canonicalId = findOrCreateIngredient('Aceitunas negras', 'g', 'despensa', 'lidl');
    // Subsequent imports calling it "Lata aceitunas negras" / "Bandeja aceitunas
    // negras" must collapse into the same id — that's the whole point.
    const fromLata = findOrCreateIngredient('Lata aceitunas negras', 'lata', 'despensa', 'lidl');
    const fromBandeja = findOrCreateIngredient(
      'Bandeja aceitunas negras',
      'bandeja',
      'despensa',
      'lidl',
    );
    expect(fromLata).toBe(canonicalId);
    expect(fromBandeja).toBe(canonicalId);

    // And the stored name on the row is the clean form, not whichever the
    // caller happened to use first.
    const row = db
      .prepare('SELECT name FROM ingredients WHERE id = ?')
      .get(canonicalId) as { name: string };
    expect(row.name).toBe('Aceitunas negras');
  });

  it('inserts a normalized name when no canonical row exists yet', async () => {
    const { findOrCreateIngredient } = await import('../ingredient');
    const { db } = await import('@/lib/db');

    const id = findOrCreateIngredient('Bandeja tomate cherry', 'bandeja', 'verduras', 'lidl');
    const row = db
      .prepare('SELECT name FROM ingredients WHERE id = ?')
      .get(id) as { name: string };
    expect(row.name).toBe('Tomate cherry');
  });
});

describe('findDuplicateIngredientGroups', () => {
  it('clusters rows whose normalized names collide', async () => {
    const { db } = await import('@/lib/db');
    const { findDuplicateIngredientGroups } = await import('../ingredient');

    // Insert two rows that should cluster (the prefix-polluted "Lata X" came
    // from before the normalization fix landed) plus an unrelated row.
    db.prepare(
      'INSERT INTO ingredients (name, default_unit, shopping_category) VALUES (?, ?, ?)',
    ).run('Lata aceitunas negras dup', 'lata', 'despensa');
    db.prepare(
      'INSERT INTO ingredients (name, default_unit, shopping_category) VALUES (?, ?, ?)',
    ).run('Aceitunas negras dup', 'g', 'despensa');
    db.prepare(
      'INSERT INTO ingredients (name, default_unit, shopping_category) VALUES (?, ?, ?)',
    ).run('Garbanzos solo', 'g', 'despensa');

    const groups = findDuplicateIngredientGroups();
    const aceitunasGroup = groups.find((g) => g.key === 'aceitunas negras dup');
    expect(aceitunasGroup).toBeDefined();
    expect(aceitunasGroup?.rows.map((r) => r.name).sort()).toEqual([
      'Aceitunas negras dup',
      'Lata aceitunas negras dup',
    ]);
    expect(groups.some((g) => g.rows.some((r) => r.name === 'Garbanzos solo'))).toBe(false);
  });
});

describe('mergeIngredients', () => {
  it('moves recipe_ingredients from dupe to canonical and deletes the dupe row', async () => {
    const { db } = await import('@/lib/db');
    const { mergeIngredients } = await import('../ingredient');

    // Seed: one recipe, one canonical ingredient row, one duplicate row with
    // a different recipe_ingredients pointer.
    db.exec(`
      INSERT INTO households (id, name) VALUES (777, 'TestHH');
      INSERT INTO recipes (id, household_id, name, base_servings) VALUES (8000, 777, 'TestRecipe', 2);
      INSERT INTO ingredients (id, name, default_unit, shopping_category) VALUES (9000, 'Tomate cherry canon', 'g', 'verduras');
      INSERT INTO ingredients (id, name, default_unit, shopping_category) VALUES (9001, 'Bandeja tomate cherry canon', 'bandeja', 'verduras');
      INSERT INTO recipe_ingredients (recipe_id, ingredient_id, quantity, unit) VALUES (8000, 9001, 1, 'bandeja');
    `);

    const report = mergeIngredients(9000, [9001]);
    expect(report.recipeIngredientRowsMoved).toBe(1);
    expect(report.recipeIngredientConflictsSummed).toBe(0);
    expect(report.recipeIngredientConflictsDropped).toBe(0);

    // The recipe now points at the canonical row, with the dupe's qty/unit
    // preserved (unit moved unchanged — the merge doesn't unit-convert).
    const moved = db
      .prepare('SELECT ingredient_id, quantity, unit FROM recipe_ingredients WHERE recipe_id = 8000')
      .all() as { ingredient_id: number; quantity: number; unit: string }[];
    expect(moved).toEqual([{ ingredient_id: 9000, quantity: 1, unit: 'bandeja' }]);

    // Dupe row gone.
    expect(db.prepare('SELECT id FROM ingredients WHERE id = 9001').get()).toBeUndefined();
  });

  it('sums quantities when canonical and dupe collide on the same recipe in the same unit', async () => {
    const { db } = await import('@/lib/db');
    const { mergeIngredients } = await import('../ingredient');

    db.exec(`
      INSERT INTO recipes (id, household_id, name, base_servings) VALUES (8001, 777, 'TestSum', 2);
      INSERT INTO ingredients (id, name, default_unit, shopping_category) VALUES (9100, 'Harina canon', 'g', 'despensa');
      INSERT INTO ingredients (id, name, default_unit, shopping_category) VALUES (9101, 'Paquete harina canon', 'g', 'despensa');
      INSERT INTO recipe_ingredients (recipe_id, ingredient_id, quantity, unit) VALUES (8001, 9100, 200, 'g');
      INSERT INTO recipe_ingredients (recipe_id, ingredient_id, quantity, unit) VALUES (8001, 9101, 50, 'g');
    `);

    const report = mergeIngredients(9100, [9101]);
    expect(report.recipeIngredientConflictsSummed).toBe(1);
    expect(report.recipeIngredientRowsMoved).toBe(0);

    const merged = db
      .prepare('SELECT quantity, unit FROM recipe_ingredients WHERE recipe_id = 8001 AND ingredient_id = 9100')
      .get() as { quantity: number; unit: string };
    expect(merged).toEqual({ quantity: 250, unit: 'g' });
  });

  it('drops the dupe row when canonical and dupe collide on the same recipe in different units', async () => {
    // Mixed-unit aggregation belongs to the shopping list, not inside a
    // single recipe — keep the canonical row's value and drop the dupe's.
    const { db } = await import('@/lib/db');
    const { mergeIngredients } = await import('../ingredient');

    db.exec(`
      INSERT INTO recipes (id, household_id, name, base_servings) VALUES (8002, 777, 'TestMixed', 2);
      INSERT INTO ingredients (id, name, default_unit, shopping_category) VALUES (9200, 'Aceitunas canon', 'g', 'despensa');
      INSERT INTO ingredients (id, name, default_unit, shopping_category) VALUES (9201, 'Lata aceitunas canon', 'lata', 'despensa');
      INSERT INTO recipe_ingredients (recipe_id, ingredient_id, quantity, unit) VALUES (8002, 9200, 100, 'g');
      INSERT INTO recipe_ingredients (recipe_id, ingredient_id, quantity, unit) VALUES (8002, 9201, 1, 'lata');
    `);

    const report = mergeIngredients(9200, [9201]);
    expect(report.recipeIngredientConflictsDropped).toBe(1);

    const remaining = db
      .prepare('SELECT quantity, unit FROM recipe_ingredients WHERE recipe_id = 8002')
      .all() as { quantity: number; unit: string }[];
    // Only the canonical's original row survives.
    expect(remaining).toEqual([{ quantity: 100, unit: 'g' }]);
  });

  it('moves shopping_state rows and drops dupe state on per-week collisions', async () => {
    const { db } = await import('@/lib/db');
    const { mergeIngredients } = await import('../ingredient');

    db.exec(`
      INSERT INTO ingredients (id, name, default_unit, shopping_category) VALUES (9300, 'StateCanon', 'g', 'despensa');
      INSERT INTO ingredients (id, name, default_unit, shopping_category) VALUES (9301, 'StateDup', 'g', 'despensa');
      INSERT INTO shopping_state (household_id, week, ingredient_id, checked, removed) VALUES (777, '2026-01-03', 9301, 1, 0);
      INSERT INTO shopping_state (household_id, week, ingredient_id, checked, removed) VALUES (777, '2026-01-10', 9300, 0, 0);
      INSERT INTO shopping_state (household_id, week, ingredient_id, checked, removed) VALUES (777, '2026-01-10', 9301, 1, 0);
    `);

    const report = mergeIngredients(9300, [9301]);
    expect(report.shoppingStateRowsMoved).toBe(1); // 2026-01-03 moves
    expect(report.shoppingStateConflictsDropped).toBe(1); // 2026-01-10 collides

    const states = db
      .prepare(
        'SELECT week, ingredient_id, checked FROM shopping_state WHERE household_id = 777 ORDER BY week',
      )
      .all() as { week: string; ingredient_id: number; checked: number }[];
    expect(states).toEqual([
      { week: '2026-01-03', ingredient_id: 9300, checked: 1 },
      // The pre-existing canonical row for 2026-01-10 wins; dupe row gone.
      { week: '2026-01-10', ingredient_id: 9300, checked: 0 },
    ]);
  });

  it('refuses to merge when canonical id appears in the dupe list', async () => {
    const { mergeIngredients } = await import('../ingredient');
    expect(() => mergeIngredients(9300, [9300])).toThrow();
  });

  it('refuses to merge unknown dupe ids', async () => {
    const { mergeIngredients } = await import('../ingredient');
    expect(() => mergeIngredients(9300, [99999])).toThrow();
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
