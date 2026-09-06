'use server';

import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { ShoppingExtraInput, WeekStr } from '@/schemas';
import { requireHouseholdId } from '@/lib/auth';

// Shopping rows are aggregated by normalized ingredient name, so a single
// row can stand in for several catalog ids (legacy dupes). Writing state to
// only one would let the others resurrect on the next render — so every
// mutating action below loops over the full id set.
function assertIngredientIds(ids: unknown): number[] {
  if (!Array.isArray(ids) || ids.length === 0) {
    throw new Error('ingredientIds must be a non-empty array');
  }
  for (const id of ids) {
    if (!Number.isInteger(id) || (id as number) <= 0) {
      throw new Error('ingredientIds must contain positive integers');
    }
  }
  return ids as number[];
}

export async function toggleCheckAction(
  week: string,
  ingredientIds: number[],
  checked: boolean,
) {
  const householdId = await requireHouseholdId();
  const w = WeekStr.parse(week);
  const ids = assertIngredientIds(ingredientIds);
  const stmt = db.prepare(
    `INSERT INTO shopping_state (household_id, week, ingredient_id, checked, removed, updated_at)
     VALUES (?, ?, ?, ?, 0, datetime('now'))
     ON CONFLICT(household_id, week, ingredient_id) DO UPDATE
       SET checked = excluded.checked, updated_at = excluded.updated_at`,
  );
  const tx = db.transaction(() => {
    for (const id of ids) stmt.run(householdId, w, id, checked ? 1 : 0);
  });
  tx();
  revalidatePath('/shopping');
}

export async function removeIngredientAction(week: string, ingredientIds: number[]) {
  const householdId = await requireHouseholdId();
  const w = WeekStr.parse(week);
  const ids = assertIngredientIds(ingredientIds);
  const stmt = db.prepare(
    `INSERT INTO shopping_state (household_id, week, ingredient_id, removed, updated_at)
     VALUES (?, ?, ?, 1, datetime('now'))
     ON CONFLICT(household_id, week, ingredient_id) DO UPDATE
       SET removed = 1, updated_at = excluded.updated_at`,
  );
  const tx = db.transaction(() => {
    for (const id of ids) stmt.run(householdId, w, id);
  });
  tx();
  revalidatePath('/shopping');
}

export async function restoreIngredientAction(week: string, ingredientIds: number[]) {
  const householdId = await requireHouseholdId();
  const w = WeekStr.parse(week);
  const ids = assertIngredientIds(ingredientIds);
  const stmt = db.prepare(
    `UPDATE shopping_state SET removed = 0, updated_at = datetime('now')
     WHERE household_id = ? AND week = ? AND ingredient_id = ?`,
  );
  const tx = db.transaction(() => {
    for (const id of ids) stmt.run(householdId, w, id);
  });
  tx();
  revalidatePath('/shopping');
}

export async function resetChecksAction(week: string) {
  const householdId = await requireHouseholdId();
  const w = WeekStr.parse(week);
  db.prepare(
    `UPDATE shopping_state SET checked = 0 WHERE household_id = ? AND week = ?`,
  ).run(householdId, w);
  db.prepare(
    `UPDATE shopping_extras SET checked = 0 WHERE household_id = ? AND week = ?`,
  ).run(householdId, w);
  revalidatePath('/shopping');
}

export async function addExtraAction(input: unknown) {
  const householdId = await requireHouseholdId();
  const data = ShoppingExtraInput.parse(input);
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
  revalidatePath('/shopping');
  return Number(result.lastInsertRowid);
}

export async function toggleExtraCheckAction(extraId: number, checked: boolean) {
  const householdId = await requireHouseholdId();
  const res = db
    .prepare('UPDATE shopping_extras SET checked = ? WHERE id = ? AND household_id = ?')
    .run(checked ? 1 : 0, extraId, householdId);
  if (res.changes === 0) throw new Error('Extra not found in this household');
  revalidatePath('/shopping');
}

export async function removeExtraAction(extraId: number) {
  const householdId = await requireHouseholdId();
  const res = db
    .prepare('UPDATE shopping_extras SET removed = 1 WHERE id = ? AND household_id = ?')
    .run(extraId, householdId);
  if (res.changes === 0) throw new Error('Extra not found in this household');
  revalidatePath('/shopping');
}

export async function restoreExtraAction(extraId: number) {
  const householdId = await requireHouseholdId();
  const res = db
    .prepare('UPDATE shopping_extras SET removed = 0 WHERE id = ? AND household_id = ?')
    .run(extraId, householdId);
  if (res.changes === 0) throw new Error('Extra not found in this household');
  revalidatePath('/shopping');
}
