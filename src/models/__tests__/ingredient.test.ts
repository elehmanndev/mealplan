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

afterAll(() => {
  try {
    if (fs.existsSync(TEST_DB)) fs.unlinkSync(TEST_DB);
    const wal = TEST_DB + '-wal';
    const shm = TEST_DB + '-shm';
    if (fs.existsSync(wal)) fs.unlinkSync(wal);
    if (fs.existsSync(shm)) fs.unlinkSync(shm);
  } catch {}
});
