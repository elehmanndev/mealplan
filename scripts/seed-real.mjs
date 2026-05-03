#!/usr/bin/env node
// One-shot seed for Eric + partner's real recipes + plan for week 2026-W18/W19.
//
// Idempotent: wipes recipes / recipe_ingredients / recipe_tags / meal_plan,
// upserts ingredients (creating new ones, updating supermarket/is_pantry on
// existing), then inserts the 11 recipes and the 15 plan entries.
//
// Run inside the running mealplan container:
//   docker exec mealplan node scripts/seed-real.mjs
//
// Or with an explicit DB path from the Unraid host:
//   DATABASE_PATH=/mnt/user/appdata/mealplan/data/mealplan.db node scripts/seed-real.mjs

import Database from 'better-sqlite3';
import path from 'node:path';

const dbPath = process.env.DATABASE_PATH ?? path.join(process.cwd(), 'data', 'mealplan.db');
const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// ─── Ingredient catalog ────────────────────────────────────────────────────
// [name, default_unit, shopping_category, supermarket | null, is_pantry]
// is_pantry ingredients (oil/salt/pepper/mayo) appear on recipes but never on
// the shopping list — the user already has them.
const INGREDIENTS = [
  // Pantry staples (some already covered by mig 005, here for explicitness)
  ['Aceite de oliva', 'ml', 'despensa', 'lidl', true],
  ['Sal', 'pellizco', 'despensa', 'lidl', true],
  ['Pimienta negra', 'pellizco', 'despensa', 'lidl', true],
  ['Mayonesa', 'ml', 'despensa', 'lidl', true],

  // Vegetables
  ['Patata', 'pieza', 'verduras', 'lidl', false],
  ['Calabacín', 'pieza', 'verduras', 'lidl', false],
  ['Zanahoria', 'pieza', 'verduras', 'lidl', false],
  ['Cebolla', 'pieza', 'verduras', 'lidl', false],
  ['Pimiento rojo', 'pieza', 'verduras', 'lidl', false],
  ['Pimiento verde', 'pieza', 'verduras', 'lidl', false],
  ['Pimiento amarillo', 'pieza', 'verduras', 'lidl', false],
  ['Champiñón', 'g', 'verduras', 'lidl', false],
  ['Bandeja tomate cherry', 'bandeja', 'verduras', 'lidl', false],
  ['Bolsa ensalada 4 estaciones', 'bolsa', 'verduras', 'lidl', false],
  ['Bolsa ensalada brotes tiernos', 'bolsa', 'verduras', 'mercadona', false],
  ['Tomate rallado', 'paquete', 'verduras', 'lidl', false],

  // Meat / fish
  ['Pechuga de pollo', 'g', 'carne', 'bon-area', false],
  ['Solomillo de cerdo', 'pieza', 'carne', 'lidl', false],
  ['Panceta', 'g', 'carne', 'mercadona', false],
  ['Llonganissa', 'pieza', 'carne', 'bon-area', false],
  ['Embutido', 'paquete', 'carne', 'lidl', false],
  ['Atún en aceite de girasol', 'lata', 'pescado', 'lidl', false],

  // Dairy / eggs
  ['Huevos', 'pieza', 'lacteos', 'bon-area', false],
  ['Mozzarella Fior di Latte', 'g', 'lacteos', 'lidl', false],
  ['Grana Padano', 'g', 'lacteos', 'lidl', false],
  ['Nata para cocinar', 'brick', 'lacteos', 'lidl', false],

  // Pantry items (non-staple, do appear in shopping list)
  ['Espaguetis', 'g', 'despensa', 'mercadona', false],
  ['Tortiglioni', 'g', 'despensa', 'mercadona', false],
  ['Pasta colores Tulipa', 'g', 'despensa', 'mercadona', false],
  ['Harina Caputo Pizzeria', 'g', 'despensa', null, false],
  ['Harina integral', 'g', 'despensa', null, false],
  ['Agua', 'g', 'bebidas', null, false],
  ['Levadura fresca', 'g', 'despensa', 'lidl', false],
  ['Passata di pomodoro', 'g', 'despensa', 'mercadona', false],
  ['Lata aceitunas negras sin hueso', 'lata', 'despensa', 'lidl', false],
  ['Lata maíz dulce', 'lata', 'despensa', 'lidl', false],
  ['Pipas calabaza', 'g', 'despensa', 'mercadona', false],

  // Frozen
  ['Guisantes congelados', 'g', 'congelado', 'lidl', false],

  // Bakery
  ['Pan del pueblo', 'pieza', 'panaderia', 'mercadona', false],
  ['Fajitas de avena', 'pieza', 'panaderia', 'lidl', false],
];

// ─── Recipes ───────────────────────────────────────────────────────────────
// Pizza dough (1 batch = 6 pizzas) is a separate recipe; the Pizza recipe
// expands 1/3 of the batch (= 2 pizzas, base_servings=2) into its own ingredients.
const RECIPES = [
  {
    name: 'Carbonara',
    emoji: '🍝',
    category: 'pasta',
    base_servings: 2,
    prep_time_min: 20,
    tags: ['Pasta', 'Comidas'],
    ingredients: [
      ['Espaguetis', 200, 'g'],
      ['Panceta', 150, 'g'],
      ['Huevos', 4, 'pieza'],
      ['Grana Padano', 125, 'g'],
      ['Aceite de oliva', 1, 'cucharada'],
      ['Sal', 1, 'pellizco'],
      ['Pimienta negra', 1, 'pellizco'],
    ],
  },
  {
    name: 'Pizza',
    emoji: '🍕',
    category: 'otros',
    base_servings: 2,
    prep_time_min: 90,
    tags: ['Cenas'],
    notes: 'Masa expandida proporcionalmente: usa 1/3 de un batch (1 batch da 6 pizzas).',
    ingredients: [
      ['Harina Caputo Pizzeria', 333, 'g'],
      ['Harina integral', 50, 'g'],
      ['Agua', 263, 'g'],
      ['Levadura fresca', 1.33, 'g'],
      ['Sal', 9.33, 'g'],
      ['Mozzarella Fior di Latte', 125, 'g'],
      ['Passata di pomodoro', 200, 'g'],
      ['Grana Padano', 30, 'g'],
    ],
  },
  {
    name: 'Masa de pizza',
    emoji: '🥖',
    category: 'otros',
    base_servings: 6,
    prep_time_min: 60,
    notes: '1 batch = 6 pizzas. Sub-receta — la Pizza usa estos mismos ingredientes ya proporcionados.',
    tags: [],
    ingredients: [
      ['Harina Caputo Pizzeria', 1000, 'g'],
      ['Harina integral', 150, 'g'],
      ['Agua', 790, 'g'],
      ['Sal', 28, 'g'],
      ['Levadura fresca', 4, 'g'],
    ],
  },
  {
    name: 'Solomillo al Pepe',
    emoji: '🥩',
    category: 'carne',
    base_servings: 2,
    prep_time_min: 30,
    tags: ['Comidas'],
    ingredients: [
      ['Solomillo de cerdo', 1, 'pieza'],
      ['Nata para cocinar', 1, 'brick'],
      ['Champiñón', 200, 'g'],
      ['Tortiglioni', 200, 'g'],
      ['Aceite de oliva', 1, 'cucharada'],
      ['Sal', 1, 'pellizco'],
      ['Pimienta negra', 1, 'pellizco'],
    ],
  },
  {
    name: 'Amanida llonganissa',
    emoji: '🥗',
    category: 'ensalada',
    base_servings: 2,
    prep_time_min: 10,
    tags: ['Ensaladas', 'Cenas'],
    ingredients: [
      ['Llonganissa', 2, 'pieza'],
      ['Bolsa ensalada 4 estaciones', 0.5, 'bolsa'],
      ['Bolsa ensalada brotes tiernos', 0.5, 'bolsa'],
      ['Bandeja tomate cherry', 0.5, 'bandeja'],
      ['Lata aceitunas negras sin hueso', 0.5, 'lata'],
      ['Pipas calabaza', 100, 'g'],
      ['Aceite de oliva', 1, 'cucharada'],
      ['Sal', 1, 'pellizco'],
      ['Pimienta negra', 1, 'pellizco'],
    ],
  },
  {
    name: 'Amanida pasta',
    emoji: '🥗',
    category: 'pasta',
    base_servings: 2,
    prep_time_min: 15,
    tags: ['Ensaladas', 'Pasta', 'Comidas'],
    ingredients: [
      ['Pasta colores Tulipa', 200, 'g'],
      ['Atún en aceite de girasol', 1, 'lata'],
      ['Bandeja tomate cherry', 0.5, 'bandeja'],
      ['Lata maíz dulce', 0.5, 'lata'],
      ['Lata aceitunas negras sin hueso', 0.5, 'lata'],
      ['Huevos', 3, 'pieza'],
      ['Aceite de oliva', 1, 'cucharada'],
      ['Sal', 1, 'pellizco'],
      ['Pimienta negra', 1, 'pellizco'],
    ],
  },
  {
    name: 'Truita de patates i carbassó',
    emoji: '🍳',
    category: 'huevos',
    base_servings: 2,
    prep_time_min: 25,
    tags: ['Cenas'],
    ingredients: [
      ['Patata', 3, 'pieza'],
      ['Calabacín', 2, 'pieza'],
      ['Huevos', 6, 'pieza'],
      ['Aceite de oliva', 50, 'ml'],
      ['Sal', 1, 'pellizco'],
      ['Pimienta negra', 1, 'pellizco'],
    ],
  },
  {
    name: 'Ensaladilla',
    emoji: '🥔',
    category: 'verdura',
    base_servings: 2,
    prep_time_min: 30,
    tags: ['Comidas'],
    ingredients: [
      ['Patata', 3, 'pieza'],
      ['Zanahoria', 3, 'pieza'],
      ['Guisantes congelados', 250, 'g'],
      ['Atún en aceite de girasol', 2, 'lata'],
      ['Mayonesa', 100, 'ml'],
    ],
  },
  {
    name: 'Pollastre filetejat',
    emoji: '🍗',
    category: 'carne',
    base_servings: 2,
    prep_time_min: 15,
    tags: ['Comidas'],
    ingredients: [
      ['Pechuga de pollo', 300, 'g'],
      ['Aceite de oliva', 1, 'cucharada'],
      ['Sal', 1, 'pellizco'],
      ['Pimienta negra', 1, 'pellizco'],
    ],
  },
  {
    name: 'Pa amb tomàquet',
    emoji: '🍞',
    category: 'otros',
    base_servings: 2,
    prep_time_min: 5,
    tags: ['Cenas'],
    notes: 'El embutido varía cada semana — voy completándolo en la lista.',
    ingredients: [
      ['Pan del pueblo', 1, 'pieza'],
      ['Tomate rallado', 1, 'paquete'],
      ['Embutido', 1, 'paquete'],
      ['Aceite de oliva', 1, 'cucharada'],
      ['Sal', 1, 'pellizco'],
    ],
  },
  {
    name: 'Fajitas',
    emoji: '🌯',
    category: 'carne',
    base_servings: 2,
    prep_time_min: 25,
    tags: ['Cenas'],
    ingredients: [
      ['Fajitas de avena', 4, 'pieza'],
      ['Pimiento rojo', 1, 'pieza'],
      ['Pimiento amarillo', 1, 'pieza'],
      ['Pimiento verde', 1, 'pieza'],
      ['Cebolla', 1, 'pieza'],
      ['Pechuga de pollo', 400, 'g'],
      ['Aceite de oliva', 1, 'cucharada'],
      ['Sal', 1, 'pellizco'],
      ['Pimienta negra', 1, 'pellizco'],
    ],
  },
];

// ─── Plan entries — week of Sat 2026-05-02 ─────────────────────────────────
// All recipes are base_servings=2 and plan servings=2 (ratio 1), since they're
// all "comida para 2 personas". TU/TH lunch hold two entries each (Ensaladilla
// + Pollastre filetejat) — multi-entry-per-slot enabled by mig 006.
const PLAN_ENTRIES = [
  ['2026-05-02', 'comida', 'Carbonara'],
  ['2026-05-02', 'cena', 'Pizza'],
  ['2026-05-03', 'comida', 'Solomillo al Pepe'],
  ['2026-05-03', 'cena', 'Amanida llonganissa'],
  ['2026-05-04', 'comida', 'Amanida pasta'],
  ['2026-05-04', 'cena', 'Truita de patates i carbassó'],
  ['2026-05-05', 'comida', 'Ensaladilla'],
  ['2026-05-05', 'comida', 'Pollastre filetejat'],
  ['2026-05-05', 'cena', 'Amanida llonganissa'],
  ['2026-05-06', 'comida', 'Amanida pasta'],
  ['2026-05-06', 'cena', 'Pa amb tomàquet'],
  ['2026-05-07', 'comida', 'Ensaladilla'],
  ['2026-05-07', 'comida', 'Pollastre filetejat'],
  ['2026-05-07', 'cena', 'Fajitas'],
  ['2026-05-08', 'cena', 'Pizza'],
];

// ─── Apply ─────────────────────────────────────────────────────────────────
const findIng = db.prepare('SELECT id FROM ingredients WHERE LOWER(name) = LOWER(?)');
const insertIng = db.prepare(
  `INSERT INTO ingredients (name, default_unit, shopping_category, supermarket, is_pantry)
   VALUES (?, ?, ?, ?, ?)`,
);
const updateIng = db.prepare(
  `UPDATE ingredients SET default_unit = ?, shopping_category = ?, supermarket = ?, is_pantry = ?
   WHERE id = ?`,
);

function upsertIngredient(name, unit, category, supermarket, isPantry) {
  const existing = findIng.get(name);
  if (existing) {
    updateIng.run(unit, category, supermarket, isPantry ? 1 : 0, existing.id);
    return existing.id;
  }
  const res = insertIng.run(name, unit, category, supermarket, isPantry ? 1 : 0);
  return Number(res.lastInsertRowid);
}

const insertRecipe = db.prepare(
  `INSERT INTO recipes (name, emoji, base_servings, category, prep_time_min, notes, is_favorite)
   VALUES (?, ?, ?, ?, ?, ?, 0)`,
);
const insertRi = db.prepare(
  `INSERT INTO recipe_ingredients (recipe_id, ingredient_id, quantity, unit)
   VALUES (?, ?, ?, ?)`,
);
const insertTag = db.prepare(`INSERT INTO recipe_tags (recipe_id, tag) VALUES (?, ?)`);
const insertPlan = db.prepare(
  `INSERT INTO meal_plan (date, slot, recipe_id, servings) VALUES (?, ?, ?, 2)`,
);

const tx = db.transaction(() => {
  // Wipe what we own — meal_plan, recipe_ingredients, recipe_tags, recipes.
  // Ingredients are kept (just upserted).
  db.exec('DELETE FROM meal_plan');
  db.exec('DELETE FROM recipe_ingredients');
  db.exec('DELETE FROM recipe_tags');
  db.exec('DELETE FROM recipes');

  // Upsert ingredients.
  const ingIds = new Map();
  for (const [name, unit, category, supermarket, isPantry] of INGREDIENTS) {
    ingIds.set(name, upsertIngredient(name, unit, category, supermarket, isPantry));
  }

  // Insert recipes.
  const recipeIds = new Map();
  for (const r of RECIPES) {
    const res = insertRecipe.run(
      r.name,
      r.emoji,
      r.base_servings,
      r.category ?? null,
      r.prep_time_min ?? null,
      r.notes ?? null,
    );
    const id = Number(res.lastInsertRowid);
    recipeIds.set(r.name, id);
    for (const [ingName, qty, unit] of r.ingredients) {
      const ingId = ingIds.get(ingName);
      if (!ingId) throw new Error(`Recipe '${r.name}' references unknown ingredient '${ingName}'`);
      insertRi.run(id, ingId, qty, unit);
    }
    for (const tag of r.tags ?? []) insertTag.run(id, tag);
  }

  // Insert plan entries.
  for (const [date, slot, recipeName] of PLAN_ENTRIES) {
    const recipeId = recipeIds.get(recipeName);
    if (!recipeId) throw new Error(`Plan entry references unknown recipe '${recipeName}'`);
    insertPlan.run(date, slot, recipeId);
  }
});

tx();

const counts = {
  ingredients: db.prepare('SELECT COUNT(*) as c FROM ingredients').get().c,
  pantry: db.prepare('SELECT COUNT(*) as c FROM ingredients WHERE is_pantry = 1').get().c,
  recipes: db.prepare('SELECT COUNT(*) as c FROM recipes').get().c,
  recipe_ingredients: db.prepare('SELECT COUNT(*) as c FROM recipe_ingredients').get().c,
  recipe_tags: db.prepare('SELECT COUNT(*) as c FROM recipe_tags').get().c,
  meal_plan: db.prepare('SELECT COUNT(*) as c FROM meal_plan').get().c,
};

console.log('seed-real complete:', counts);
