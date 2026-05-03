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

export function listWeekPlan(weekStr: string): PlanEntry[] {
  const dates = getWeekDates(weekStr);
  const start = formatDate(dates[0]);
  const end = formatDate(dates[6]);
  const rows = db
    .prepare(
      `SELECT mp.id, mp.date, mp.slot, mp.recipe_id, mp.servings,
              r.name as recipe_name, r.emoji as recipe_emoji,
              r.base_servings as recipe_base_servings, r.category as recipe_category
       FROM meal_plan mp JOIN recipes r ON r.id = mp.recipe_id
       WHERE mp.date BETWEEN ? AND ?
       ORDER BY mp.date, CASE mp.slot WHEN 'comida' THEN 0 ELSE 1 END`,
    )
    .all(start, end) as PlanRow[];
  return rows.map(rowToEntry);
}

export function addPlanEntry(input: { date: string; slot: Slot; recipe_id: number; servings: number }): number {
  // (date, slot) is no longer UNIQUE — multiple recipes per slot are allowed,
  // so this always inserts a new row. To replace, use updatePlanServings or
  // removePlanEntry + addPlanEntry.
  const res = db
    .prepare('INSERT INTO meal_plan (date, slot, recipe_id, servings) VALUES (?, ?, ?, ?)')
    .run(input.date, input.slot, input.recipe_id, input.servings);
  return Number(res.lastInsertRowid);
}

export function movePlanEntry(input: { entry_id: number; to_date: string; to_slot: Slot }): void {
  // With multi-entry slots, dropping onto an occupied slot just joins it —
  // the previous "swap" semantics no longer make sense.
  db.prepare('UPDATE meal_plan SET date = ?, slot = ? WHERE id = ?').run(
    input.to_date,
    input.to_slot,
    input.entry_id,
  );
}

export function duplicatePlanEntry(input: { entry_id: number; to_date: string; to_slot: Slot }): number {
  const src = db.prepare('SELECT * FROM meal_plan WHERE id = ?').get(input.entry_id) as
    | { recipe_id: number; servings: number }
    | undefined;
  if (!src) throw new Error('Entry not found');
  return addPlanEntry({
    date: input.to_date,
    slot: input.to_slot,
    recipe_id: src.recipe_id,
    servings: src.servings,
  });
}

export function updatePlanServings(entry_id: number, servings: number): void {
  db.prepare('UPDATE meal_plan SET servings = ? WHERE id = ?').run(servings, entry_id);
}

export function removePlanEntry(id: number): void {
  db.prepare('DELETE FROM meal_plan WHERE id = ?').run(id);
}

export function clearWeek(weekStr: string): void {
  const dates = getWeekDates(weekStr);
  db.prepare('DELETE FROM meal_plan WHERE date BETWEEN ? AND ?').run(
    formatDate(dates[0]),
    formatDate(dates[6]),
  );
}

export function duplicateWeek(fromWeek: string, toWeek: string, replace: boolean): void {
  const fromDates = getWeekDates(fromWeek);
  const toDates = getWeekDates(toWeek);
  const tx = db.transaction(() => {
    if (replace) clearWeek(toWeek);
    const src = db
      .prepare(
        `SELECT date, slot, recipe_id, servings FROM meal_plan
         WHERE date BETWEEN ? AND ?`,
      )
      .all(formatDate(fromDates[0]), formatDate(fromDates[6])) as Array<{
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
        .prepare('SELECT id FROM meal_plan WHERE date = ? AND slot = ?')
        .get(newDate, row.slot) as { id: number } | undefined;
      if (exists && !replace) continue;
      if (exists) {
        db.prepare('UPDATE meal_plan SET recipe_id = ?, servings = ? WHERE id = ?').run(
          row.recipe_id,
          row.servings,
          exists.id,
        );
      } else {
        db.prepare(
          'INSERT INTO meal_plan (date, slot, recipe_id, servings) VALUES (?, ?, ?, ?)',
        ).run(newDate, row.slot, row.recipe_id, row.servings);
      }
    }
  });
  tx();
}

export function weekHasEntries(weekStr: string): boolean {
  const dates = getWeekDates(weekStr);
  const row = db
    .prepare('SELECT COUNT(*) as c FROM meal_plan WHERE date BETWEEN ? AND ?')
    .get(formatDate(dates[0]), formatDate(dates[6])) as { c: number };
  return row.c > 0;
}
