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
import { requireHouseholdId } from '@/lib/auth';

export async function addToPlanAction(input: unknown) {
  const householdId = await requireHouseholdId();
  const data = PlanAddInput.parse(input);
  addPlanEntry(householdId, data);
  revalidatePath('/');
  revalidatePath('/shopping');
}

export async function movePlanEntryAction(input: unknown) {
  const householdId = await requireHouseholdId();
  const data = PlanMoveInput.parse(input);
  movePlanEntry(householdId, data);
  revalidatePath('/');
  revalidatePath('/shopping');
}

export async function duplicatePlanEntryAction(input: unknown) {
  const householdId = await requireHouseholdId();
  const data = PlanDuplicateInput.parse(input);
  duplicatePlanEntry(householdId, data);
  revalidatePath('/');
  revalidatePath('/shopping');
}

export async function updatePlanServingsAction(entry_id: number, servings: number) {
  const householdId = await requireHouseholdId();
  updatePlanServings(householdId, entry_id, servings);
  revalidatePath('/');
  revalidatePath('/shopping');
}

export async function removePlanEntryAction(id: number) {
  const householdId = await requireHouseholdId();
  removePlanEntry(householdId, id);
  revalidatePath('/');
  revalidatePath('/shopping');
}

export async function clearWeekAction(week: string) {
  const householdId = await requireHouseholdId();
  const w = WeekStr.parse(week);
  clearWeek(householdId, w);
  revalidatePath('/');
  revalidatePath('/shopping');
}

export async function duplicateWeekAction(fromWeek: string, toWeek: string, replace: boolean) {
  const householdId = await requireHouseholdId();
  const f = WeekStr.parse(fromWeek);
  const t = WeekStr.parse(toWeek);
  duplicateWeek(householdId, f, t, replace);
  revalidatePath('/');
  revalidatePath('/shopping');
}
