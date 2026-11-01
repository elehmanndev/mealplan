import { db } from '@/lib/db';
import { NotFoundError } from '@/lib/errors';
import type { ShoppingExtraInput } from '@/schemas';

// Shopping rows are aggregated by normalized ingredient name, so a single
// row can stand in for several catalog ids (legacy dupes). Writing state to
// only one would let the others resurrect on the next render — so every
// ingredient-state write below loops over the full id set.

export function setIngredientsChecked(
  householdId: number,
  week: string,
  ingredientIds: number[],
  checked: boolean,
): void {
  const stmt = db.prepare(
    `INSERT INTO shopping_state (household_id, week, ingredient_id, checked, removed, updated_at)
     VALUES (?, ?, ?, ?, 0, datetime('now'))
     ON CONFLICT(household_id, week, ingredient_id) DO UPDATE
       SET checked = excluded.checked, updated_at = excluded.updated_at`,
  );
  db.transaction(() => {
    for (const id of ingredientIds) stmt.run(householdId, week, id, checked ? 1 : 0);
  })();
}

export function setIngredientsRemoved(householdId: number, week: string, ingredientIds: number[]): void {
  const stmt = db.prepare(
    `INSERT INTO shopping_state (household_id, week, ingredient_id, removed, updated_at)
     VALUES (?, ?, ?, 1, datetime('now'))
     ON CONFLICT(household_id, week, ingredient_id) DO UPDATE
       SET removed = 1, updated_at = excluded.updated_at`,
  );
  db.transaction(() => {
    for (const id of ingredientIds) stmt.run(householdId, week, id);
  })();
}

export function restoreIngredients(householdId: number, week: string, ingredientIds: number[]): void {
  const stmt = db.prepare(
    `UPDATE shopping_state SET removed = 0, updated_at = datetime('now')
     WHERE household_id = ? AND week = ? AND ingredient_id = ?`,
  );
  db.transaction(() => {
    for (const id of ingredientIds) stmt.run(householdId, week, id);
  })();
}

export function resetChecks(householdId: number, week: string): void {
  db.prepare('UPDATE shopping_state SET checked = 0 WHERE household_id = ? AND week = ?').run(householdId, week);
  db.prepare('UPDATE shopping_extras SET checked = 0 WHERE household_id = ? AND week = ?').run(householdId, week);
}

export function addExtra(householdId: number, data: ShoppingExtraInput): number {
  const result = db
    .prepare(
      `INSERT INTO shopping_extras (household_id, week, name, quantity, unit, shopping_category, supermarket)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      householdId,
      data.week,
      data.name,
      data.quantity ?? null,
      data.unit ?? null,
      data.shopping_category,
      data.supermarket ?? null,
    );
  return Number(result.lastInsertRowid);
}

function updateExtra(householdId: number, extraId: number, column: 'checked' | 'removed', value: boolean) {
  const res = db
    .prepare(`UPDATE shopping_extras SET ${column} = ? WHERE id = ? AND household_id = ?`)
    .run(value ? 1 : 0, extraId, householdId);
  if (res.changes === 0) throw new NotFoundError('Extra not found in this household');
}

export function setExtraChecked(householdId: number, extraId: number, checked: boolean): void {
  updateExtra(householdId, extraId, 'checked', checked);
}

export function setExtraRemoved(householdId: number, extraId: number, removed: boolean): void {
  updateExtra(householdId, extraId, 'removed', removed);
}
