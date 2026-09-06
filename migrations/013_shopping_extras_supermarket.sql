-- Manual shopping items can now be assigned to a specific supermarket
-- instead of always landing in the "Sin asignar" group. NULL keeps the old
-- unassigned behaviour for existing rows.
ALTER TABLE shopping_extras ADD COLUMN supermarket TEXT;
