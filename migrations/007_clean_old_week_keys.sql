-- Week keys changed from "YYYY-Wnn" (ISO week) to "YYYY-MM-DD" (Saturday of
-- the Sat→Fr week). Drop any leftover shopping_state / shopping_extras with
-- the old format so they don't show up oddly in future weeks. Plan entries
-- (meal_plan.date) are absolute dates and don't need migration.
DELETE FROM shopping_state WHERE week LIKE '%-W%';
DELETE FROM shopping_extras WHERE week LIKE '%-W%';
