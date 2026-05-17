-- Widen shopping_state's primary key to include household_id.
--
-- The original PK (week, ingredient_id) collides across households once a
-- second household exists. SQLite can't alter PKs in place, so we recreate.

CREATE TABLE shopping_state_new (
  household_id INTEGER NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  week TEXT NOT NULL,
  ingredient_id INTEGER NOT NULL REFERENCES ingredients(id),
  checked INTEGER NOT NULL DEFAULT 0,
  removed INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (household_id, week, ingredient_id)
);

INSERT INTO shopping_state_new (household_id, week, ingredient_id, checked, removed, updated_at)
  SELECT household_id, week, ingredient_id, checked, removed, updated_at FROM shopping_state;

DROP TABLE shopping_state;
ALTER TABLE shopping_state_new RENAME TO shopping_state;

-- Index on household_id alone supports the per-household list queries; the
-- composite PK covers the per-(week, ingredient) writes.
CREATE INDEX idx_shopping_state_household ON shopping_state(household_id);
