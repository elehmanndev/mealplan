-- Pantry flag for ingredients that should NOT appear in the shopping list
-- (oil, salt, pepper, etc. — staples the user already has). They still appear
-- as recipe ingredients; they just don't inflate the shopping list.
ALTER TABLE ingredients ADD COLUMN is_pantry INTEGER NOT NULL DEFAULT 0;

UPDATE ingredients SET is_pantry = 1 WHERE LOWER(name) IN
  ('aceite de oliva', 'sal', 'pimienta negra');
