'use server';

import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { ShoppingExtraInput, WeekStr } from '@/schemas';

export async function toggleCheckAction(week: string, ingredientId: number, checked: boolean) {
  const w = WeekStr.parse(week);
  db.prepare(
    `INSERT INTO shopping_state (week, ingredient_id, checked, removed, updated_at)
     VALUES (?, ?, ?, 0, datetime('now'))
     ON CONFLICT(week, ingredient_id) DO UPDATE
       SET checked = excluded.checked, updated_at = excluded.updated_at`,
  ).run(w, ingredientId, checked ? 1 : 0);
  revalidatePath('/shopping');
}

export async function removeIngredientAction(week: string, ingredientId: number) {
  const w = WeekStr.parse(week);
  db.prepare(
    `INSERT INTO shopping_state (week, ingredient_id, removed, updated_at)
     VALUES (?, ?, 1, datetime('now'))
     ON CONFLICT(week, ingredient_id) DO UPDATE
       SET removed = 1, updated_at = excluded.updated_at`,
  ).run(w, ingredientId);
  revalidatePath('/shopping');
}

export async function restoreIngredientAction(week: string, ingredientId: number) {
  const w = WeekStr.parse(week);
  db.prepare(
    `UPDATE shopping_state SET removed = 0, updated_at = datetime('now')
     WHERE week = ? AND ingredient_id = ?`,
  ).run(w, ingredientId);
  revalidatePath('/shopping');
}

export async function resetChecksAction(week: string) {
  const w = WeekStr.parse(week);
  db.prepare(`UPDATE shopping_state SET checked = 0 WHERE week = ?`).run(w);
  db.prepare(`UPDATE shopping_extras SET checked = 0 WHERE week = ?`).run(w);
  revalidatePath('/shopping');
}

export async function addExtraAction(input: unknown) {
  const data = ShoppingExtraInput.parse(input);
  const result = db
    .prepare(
      `INSERT INTO shopping_extras (week, name, quantity, unit, shopping_category)
       VALUES (?, ?, ?, ?, ?)`,
    )
    .run(data.week, data.name, data.quantity ?? null, data.unit ?? null, data.shopping_category);
  revalidatePath('/shopping');
  return Number(result.lastInsertRowid);
}

export async function toggleExtraCheckAction(extraId: number, checked: boolean) {
  db.prepare('UPDATE shopping_extras SET checked = ? WHERE id = ?').run(checked ? 1 : 0, extraId);
  revalidatePath('/shopping');
}

export async function removeExtraAction(extraId: number) {
  db.prepare('UPDATE shopping_extras SET removed = 1 WHERE id = ?').run(extraId);
  revalidatePath('/shopping');
}

export async function restoreExtraAction(extraId: number) {
  db.prepare('UPDATE shopping_extras SET removed = 0 WHERE id = ?').run(extraId);
  revalidatePath('/shopping');
}
