import { db } from '@/lib/db';
import { formatDate, getWeekDates } from '@/lib/week';
import type { PlanEntry, Slot } from '@/types';

interface PlanRow {
  id: number;
  date: string;
  slot: Slot;
  recipe_id: number;
  servings: number;
  recipe_name: string;
  recipe_emoji: string;
  recipe_base_servings: number;
  recipe_category: string | null;
}

function rowToEntry(r: PlanRow): PlanEntry {
  return {
    id: r.id,
    date: r.date,
    slot: r.slot,
    recipe_id: r.recipe_id,
    servings: r.servings,
    recipe: {
      id: r.recipe_id,
      name: r.recipe_name,
      emoji: r.recipe_emoji,
      base_servings: r.recipe_base_servings,
      category: r.recipe_category as PlanEntry['recipe'] extends infer T
        ? T extends { category: infer C }
          ? C
          : never
        : never,
    },
  };
}

export function listWeekPlan(householdId: number, weekStr: string): PlanEntry[] {
  const dates = getWeekDates(weekStr);
  const start = formatDate(dates[0]);
  const end = formatDate(dates[6]);
  const rows = db
    .prepare(
      `SELECT mp.id, mp.date, mp.slot, mp.recipe_id, mp.servings,
              r.name as recipe_name, r.emoji as recipe_emoji,
              r.base_servings as recipe_base_servings, r.category as recipe_category
       FROM meal_plan mp JOIN recipes r ON r.id = mp.recipe_id
       WHERE mp.household_id = ? AND mp.date BETWEEN ? AND ?
       ORDER BY mp.date, CASE mp.slot WHEN 'comida' THEN 0 ELSE 1 END`,
    )
    .all(householdId, start, end) as PlanRow[];
  return rows.map(rowToEntry);
}

export function addPlanEntry(
  householdId: number,
  input: { date: string; slot: Slot; recipe_id: number; servings: number },
): number {
  // (date, slot) is no longer UNIQUE — multiple recipes per slot are allowed,
  // so this always inserts a new row. To replace, use updatePlanServings or
  // removePlanEntry + addPlanEntry. The recipe_id is checked against the
  // household to prevent dropping someone else's recipe onto our plan.
  const recipeOk = db
    .prepare('SELECT 1 FROM recipes WHERE id = ? AND household_id = ?')
    .get(input.recipe_id, householdId);
  if (!recipeOk) throw new Error('Recipe not found in this household');
  const res = db
    .prepare(
      'INSERT INTO meal_plan (household_id, date, slot, recipe_id, servings) VALUES (?, ?, ?, ?, ?)',
    )
    .run(householdId, input.date, input.slot, input.recipe_id, input.servings);
  return Number(res.lastInsertRowid);
}

export function movePlanEntry(
  householdId: number,
  input: { entry_id: number; to_date: string; to_slot: Slot },
): void {
  // With multi-entry slots, dropping onto an occupied slot just joins it —
  // the previous "swap" semantics no longer make sense.
  const res = db
    .prepare(
      'UPDATE meal_plan SET date = ?, slot = ? WHERE id = ? AND household_id = ?',
    )
    .run(input.to_date, input.to_slot, input.entry_id, householdId);
  if (res.changes === 0) throw new Error('Plan entry not found in this household');
}

export function duplicatePlanEntry(
  householdId: number,
  input: { entry_id: number; to_date: string; to_slot: Slot },
): number {
  const src = db
    .prepare('SELECT recipe_id, servings FROM meal_plan WHERE id = ? AND household_id = ?')
    .get(input.entry_id, householdId) as { recipe_id: number; servings: number } | undefined;
  if (!src) throw new Error('Plan entry not found in this household');
  return addPlanEntry(householdId, {
    date: input.to_date,
    slot: input.to_slot,
    recipe_id: src.recipe_id,
    servings: src.servings,
  });
}

export function updatePlanServings(householdId: number, entry_id: number, servings: number): void {
  const res = db
    .prepare('UPDATE meal_plan SET servings = ? WHERE id = ? AND household_id = ?')
    .run(servings, entry_id, householdId);
  if (res.changes === 0) throw new Error('Plan entry not found in this household');
}

export function removePlanEntry(householdId: number, id: number): void {
  const res = db
    .prepare('DELETE FROM meal_plan WHERE id = ? AND household_id = ?')
    .run(id, householdId);
  if (res.changes === 0) throw new Error('Plan entry not found in this household');
}

export function clearWeek(householdId: number, weekStr: string): void {
  const dates = getWeekDates(weekStr);
  db.prepare(
    'DELETE FROM meal_plan WHERE household_id = ? AND date BETWEEN ? AND ?',
  ).run(householdId, formatDate(dates[0]), formatDate(dates[6]));
}

export function duplicateWeek(
  householdId: number,
  fromWeek: string,
  toWeek: string,
  replace: boolean,
): void {
  const fromDates = getWeekDates(fromWeek);
  const toDates = getWeekDates(toWeek);
  const tx = db.transaction(() => {
    if (replace) clearWeek(householdId, toWeek);
    const src = db
      .prepare(
        `SELECT date, slot, recipe_id, servings FROM meal_plan
         WHERE household_id = ? AND date BETWEEN ? AND ?`,
      )
      .all(householdId, formatDate(fromDates[0]), formatDate(fromDates[6])) as Array<{
      date: string;
      slot: Slot;
      recipe_id: number;
      servings: number;
    }>;
    for (const row of src) {
      const offset = fromDates.findIndex((d) => formatDate(d) === row.date);
      if (offset < 0) continue;
      const newDate = formatDate(toDates[offset]);
      const exists = db
        .prepare(
          'SELECT id FROM meal_plan WHERE household_id = ? AND date = ? AND slot = ?',
        )
        .get(householdId, newDate, row.slot) as { id: number } | undefined;
      if (exists && !replace) continue;
      if (exists) {
        db.prepare(
          'UPDATE meal_plan SET recipe_id = ?, servings = ? WHERE id = ? AND household_id = ?',
        ).run(row.recipe_id, row.servings, exists.id, householdId);
      } else {
        db.prepare(
          'INSERT INTO meal_plan (household_id, date, slot, recipe_id, servings) VALUES (?, ?, ?, ?, ?)',
        ).run(householdId, newDate, row.slot, row.recipe_id, row.servings);
      }
    }
  });
  tx();
}

export function weekHasEntries(householdId: number, weekStr: string): boolean {
  const dates = getWeekDates(weekStr);
  const row = db
    .prepare(
      'SELECT COUNT(*) as c FROM meal_plan WHERE household_id = ? AND date BETWEEN ? AND ?',
    )
    .get(householdId, formatDate(dates[0]), formatDate(dates[6])) as { c: number };
  return row.c > 0;
}
