'use server';

import { revalidatePath } from 'next/cache';
import { ShoppingExtraInput, WeekStr } from '@/schemas';
import { requireHouseholdId } from '@/lib/auth';
import {
  addExtra,
  resetChecks,
  restoreIngredients,
  setExtraChecked,
  setExtraRemoved,
  setIngredientsChecked,
  setIngredientsRemoved,
} from '@/models/shopping';

// Every ingredient-state action takes the full id set of a shopping row
// (see src/models/shopping.ts for why).
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
  setIngredientsChecked(householdId, WeekStr.parse(week), assertIngredientIds(ingredientIds), checked);
  revalidatePath('/shopping');
}

export async function removeIngredientAction(week: string, ingredientIds: number[]) {
  const householdId = await requireHouseholdId();
  setIngredientsRemoved(householdId, WeekStr.parse(week), assertIngredientIds(ingredientIds));
  revalidatePath('/shopping');
}

export async function restoreIngredientAction(week: string, ingredientIds: number[]) {
  const householdId = await requireHouseholdId();
  restoreIngredients(householdId, WeekStr.parse(week), assertIngredientIds(ingredientIds));
  revalidatePath('/shopping');
}

export async function resetChecksAction(week: string) {
  const householdId = await requireHouseholdId();
  resetChecks(householdId, WeekStr.parse(week));
  revalidatePath('/shopping');
}

export async function addExtraAction(input: unknown) {
  const householdId = await requireHouseholdId();
  const id = addExtra(householdId, ShoppingExtraInput.parse(input));
  revalidatePath('/shopping');
  return id;
}

export async function toggleExtraCheckAction(extraId: number, checked: boolean) {
  const householdId = await requireHouseholdId();
  setExtraChecked(householdId, extraId, checked);
  revalidatePath('/shopping');
}

export async function removeExtraAction(extraId: number) {
  const householdId = await requireHouseholdId();
  setExtraRemoved(householdId, extraId, true);
  revalidatePath('/shopping');
}

export async function restoreExtraAction(extraId: number) {
  const householdId = await requireHouseholdId();
  setExtraRemoved(householdId, extraId, false);
  revalidatePath('/shopping');
}
