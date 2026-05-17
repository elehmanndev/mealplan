-- Multi-tenant foundation.
--
-- Introduces users / households / memberships / invites. Every row-owning
-- table gets a household_id. Existing rows are backfilled into a single
-- "Casa Lehmann" household (id 1); the owner is claimed on first sign-in
-- via a server-side callback that matches MEALPLAN_OWNER_EMAIL.
--
-- ingredients stays global (shared catalog across households).
-- chat_usage is migrated from per-IP to per-user in a later slice.

CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  google_sub TEXT UNIQUE,
  email TEXT NOT NULL UNIQUE,
  name TEXT,
  image TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_users_email ON users(email);

CREATE TABLE households (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE memberships (
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  household_id INTEGER NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'member')),
  joined_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (user_id, household_id)
);

CREATE INDEX idx_memberships_household ON memberships(household_id);

CREATE TABLE invites (
  token TEXT PRIMARY KEY,
  household_id INTEGER NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  invited_by_user_id INTEGER NOT NULL REFERENCES users(id),
  expires_at TEXT NOT NULL,
  used_at TEXT,
  used_by_user_id INTEGER REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_invites_household ON invites(household_id);

-- Seed the legacy household. Owner membership is created at first sign-in
-- (see src/lib/auth.ts owner-claim path), keyed on the MEALPLAN_OWNER_EMAIL
-- env var. Until then, the household has no members and queries scoped by
-- household_id still return Eric's existing data (because everything below
-- is backfilled to household_id=1).
INSERT INTO households (id, name) VALUES (1, 'Casa Lehmann');

-- Backfill row-owning tables. SQLite can't add NOT NULL without DEFAULT or
-- a full table rewrite; we live with nullable + app-level enforcement in v1.

ALTER TABLE recipes ADD COLUMN household_id INTEGER REFERENCES households(id);
UPDATE recipes SET household_id = 1;
CREATE INDEX idx_recipes_household ON recipes(household_id);

ALTER TABLE meal_plan ADD COLUMN household_id INTEGER REFERENCES households(id);
UPDATE meal_plan SET household_id = 1;
CREATE INDEX idx_meal_plan_household ON meal_plan(household_id);

ALTER TABLE shopping_state ADD COLUMN household_id INTEGER REFERENCES households(id);
UPDATE shopping_state SET household_id = 1;
CREATE INDEX idx_shopping_state_household ON shopping_state(household_id);

ALTER TABLE shopping_extras ADD COLUMN household_id INTEGER REFERENCES households(id);
UPDATE shopping_extras SET household_id = 1;
CREATE INDEX idx_shopping_extras_household ON shopping_extras(household_id);
