'use server';

import { revalidatePath } from 'next/cache';
import {
  addPlanEntry,
  clearWeek,
  duplicatePlanEntry,
  duplicateWeek,
  movePlanEntry,
  removePlanEntry,
  updatePlanServings,
} from '@/models/plan';
import { PlanAddInput, PlanDuplicateInput, PlanMoveInput, WeekStr } from '@/schemas';

export async function addToPlanAction(input: unknown) {
  const data = PlanAddInput.parse(input);
  addPlanEntry(data);
  revalidatePath('/');
  revalidatePath('/shopping');
}

export async function movePlanEntryAction(input: unknown) {
  const data = PlanMoveInput.parse(input);
  movePlanEntry(data);
  revalidatePath('/');
  revalidatePath('/shopping');
}

export async function duplicatePlanEntryAction(input: unknown) {
  const data = PlanDuplicateInput.parse(input);
  duplicatePlanEntry(data);
  revalidatePath('/');
  revalidatePath('/shopping');
}

export async function updatePlanServingsAction(entry_id: number, servings: number) {
  updatePlanServings(entry_id, servings);
  revalidatePath('/');
  revalidatePath('/shopping');
}

export async function removePlanEntryAction(id: number) {
  removePlanEntry(id);
  revalidatePath('/');
  revalidatePath('/shopping');
}

export async function clearWeekAction(week: string) {
  const w = WeekStr.parse(week);
  clearWeek(w);
  revalidatePath('/');
  revalidatePath('/shopping');
}

export async function duplicateWeekAction(fromWeek: string, toWeek: string, replace: boolean) {
  const f = WeekStr.parse(fromWeek);
  const t = WeekStr.parse(toWeek);
  duplicateWeek(f, t, replace);
  revalidatePath('/');
  revalidatePath('/shopping');
}
