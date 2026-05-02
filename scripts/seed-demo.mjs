import Database from 'better-sqlite3';
import path from 'node:path';
import {
  startOfISOWeek,
  setISOWeek,
  setISOWeekYear,
  getISOWeek,
  getISOWeekYear,
  addDays,
  format,
} from 'date-fns';

const dbPath = process.env.DATABASE_PATH ?? path.join(process.cwd(), 'data', 'mealplan.db');
const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

const now = new Date();
const week = `${getISOWeekYear(now)}-W${String(getISOWeek(now)).padStart(2, '0')}`;
const anchor = new Date(Date.UTC(getISOWeekYear(now), 0, 4));
const start = startOfISOWeek(setISOWeek(setISOWeekYear(anchor, getISOWeekYear(now)), getISOWeek(now)));
const fmt = (d) => format(d, 'yyyy-MM-dd');

const recipes = [
  { name: 'Pasta carbonara', emoji: '🍝', category: 'pasta', base_servings: 2, prep_time_min: 20, ings: [['Pasta', 200, 'g'], ['Huevos', 2, 'ud'], ['Queso rallado', 50, 'g'], ['Sal', 1, 'pellizco']] },
  { name: 'Ensalada César', emoji: '🥗', category: 'ensalada', base_servings: 2, prep_time_min: 15, ings: [['Lechuga', 1, 'ud'], ['Pollo', 200, 'g'], ['Pan', 1, 'ud'], ['Queso rallado', 30, 'g']] },
  { name: 'Salmón al horno', emoji: '🐟', category: 'pescado', base_servings: 2, prep_time_min: 25, ings: [['Salmón', 300, 'g'], ['Limón', 1, 'ud'], ['Aceite de oliva', 20, 'ml']] },
  { name: 'Tortilla francesa', emoji: '🍳', category: 'huevos', base_servings: 1, prep_time_min: 5, ings: [['Huevos', 3, 'ud'], ['Sal', 1, 'pellizco']] },
  { name: 'Lentejas estofadas', emoji: '🥘', category: 'legumbres', base_servings: 4, prep_time_min: 45, ings: [['Lentejas', 400, 'g'], ['Cebolla', 1, 'ud'], ['Zanahoria', 2, 'ud'], ['Ajo', 2, 'diente']] },
  { name: 'Pollo al limón', emoji: '🍗', category: 'carne', base_servings: 2, prep_time_min: 30, ings: [['Pechuga de pollo', 400, 'g'], ['Limón', 1, 'ud'], ['Aceite de oliva', 30, 'ml']] },
  { name: 'Crema de calabacín', emoji: '🥣', category: 'sopa', base_servings: 4, prep_time_min: 30, ings: [['Calabacín', 3, 'ud'], ['Cebolla', 1, 'ud'], ['Caldo de pollo', 500, 'ml']] },
  { name: 'Arroz tres delicias', emoji: '🍚', category: 'arroz', base_servings: 2, prep_time_min: 20, ings: [['Arroz', 200, 'g'], ['Huevos', 2, 'ud'], ['Gambas', 100, 'g']] },
];

const findIng = db.prepare('SELECT id FROM ingredients WHERE LOWER(name) = LOWER(?)');
const insertIng = db.prepare(`INSERT INTO ingredients (name, default_unit, shopping_category) VALUES (?, ?, 'otros')`);
const insertRecipe = db.prepare(`
  INSERT INTO recipes (name, description, emoji, base_servings, category, prep_time_min, is_favorite)
  VALUES (?, ?, ?, ?, ?, ?, ?)
`);
const insertRi = db.prepare(`INSERT OR REPLACE INTO recipe_ingredients (recipe_id, ingredient_id, quantity, unit) VALUES (?, ?, ?, ?)`);
const insertPlan = db.prepare(`INSERT OR REPLACE INTO meal_plan (date, slot, recipe_id, servings) VALUES (?, ?, ?, ?)`);

db.exec('DELETE FROM meal_plan');

const tx = db.transaction(() => {
  const recipeIds = [];
  for (const r of recipes) {
    const res = insertRecipe.run(r.name, null, r.emoji, r.base_servings, r.category, r.prep_time_min, Math.random() < 0.3 ? 1 : 0);
    const id = Number(res.lastInsertRowid);
    recipeIds.push(id);
    for (const [ingName, qty, unit] of r.ings) {
      let ingRow = findIng.get(ingName);
      if (!ingRow) {
        const r2 = insertIng.run(ingName, unit);
        ingRow = { id: Number(r2.lastInsertRowid) };
      }
      insertRi.run(id, ingRow.id, qty, unit);
    }
  }

  for (let i = 0; i < 7; i++) {
    const date = fmt(addDays(start, i));
    if (Math.random() < 0.85) {
      const r = recipeIds[Math.floor(Math.random() * recipeIds.length)];
      insertPlan.run(date, 'comida', r, 2);
    }
    if (Math.random() < 0.75) {
      const r = recipeIds[Math.floor(Math.random() * recipeIds.length)];
      insertPlan.run(date, 'cena', r, 2);
    }
  }
});

tx();

const counts = {
  recipes: db.prepare('SELECT COUNT(*) as c FROM recipes').get().c,
  meal_plan: db.prepare('SELECT COUNT(*) as c FROM meal_plan').get().c,
};
console.log(`Seeded ${recipes.length} recipes for week ${week}`, counts);
