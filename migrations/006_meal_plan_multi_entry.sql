-- Allow multiple plan entries per (date, slot). Required so the user can
-- schedule "Ensaladilla + Pollastre filetejat" as two distinct recipes in the
-- same lunch slot, instead of being forced to invent a combined recipe.
--
-- SQLite doesn't support DROP CONSTRAINT, so we recreate the table.

CREATE TABLE meal_plan_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT NOT NULL,
  slot TEXT NOT NULL CHECK (slot IN ('comida', 'cena')),
  recipe_id INTEGER NOT NULL REFERENCES recipes(id),
  servings REAL NOT NULL CHECK (servings > 0)
);

INSERT INTO meal_plan_new (id, date, slot, recipe_id, servings)
  SELECT id, date, slot, recipe_id, servings FROM meal_plan;

DROP TABLE meal_plan;
ALTER TABLE meal_plan_new RENAME TO meal_plan;

CREATE INDEX idx_meal_plan_date ON meal_plan(date);
