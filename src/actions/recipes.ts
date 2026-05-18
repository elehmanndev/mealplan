'use server';

import { randomBytes } from 'node:crypto';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import {
  createRecipe,
  deleteRecipe,
  duplicateRecipe,
  setRecipeShareToken,
  toggleFavoriteRecipe,
  updateRecipe,
} from '@/models/recipe';
import { RecipeInput } from '@/schemas';
import { requireHouseholdId } from '@/lib/auth';

export async function createRecipeAction(input: unknown) {
  const householdId = await requireHouseholdId();
  const data = RecipeInput.parse(input);
  const id = createRecipe(householdId, data);
  revalidatePath('/recipes');
  return id;
}

export async function updateRecipeAction(id: number, input: unknown) {
  const householdId = await requireHouseholdId();
  const data = RecipeInput.parse(input);
  updateRecipe(householdId, id, data);
  revalidatePath('/recipes');
  revalidatePath(`/recipes/${id}`);
}

export async function deleteRecipeAction(id: number) {
  const householdId = await requireHouseholdId();
  deleteRecipe(householdId, id);
  revalidatePath('/recipes');
  redirect('/recipes');
}

export async function toggleFavoriteAction(id: number) {
  const householdId = await requireHouseholdId();
  toggleFavoriteRecipe(householdId, id);
  revalidatePath('/recipes');
  revalidatePath(`/recipes/${id}`);
}

export async function duplicateRecipeAction(id: number) {
  const householdId = await requireHouseholdId();
  const newId = duplicateRecipe(householdId, id);
  revalidatePath('/recipes');
  return newId;
}

export type RecipeShareResult = { url: string; token: string };

/**
 * Enable read-only sharing for a recipe. Generates a fresh token and returns
 * the public URL. Calling this on an already-shared recipe rotates the
 * token — the old URL stops working.
 */
export async function enableRecipeShareAction(id: number): Promise<RecipeShareResult> {
  const householdId = await requireHouseholdId();
  const token = randomBytes(18).toString('base64url');
  setRecipeShareToken(householdId, id, token);
  revalidatePath(`/recipes/${id}`);
  const base = process.env.AUTH_URL ?? '';
  return { token, url: `${base.replace(/\/$/, '')}/r/${token}` };
}

export async function disableRecipeShareAction(id: number): Promise<void> {
  const householdId = await requireHouseholdId();
  setRecipeShareToken(householdId, id, null);
  revalidatePath(`/recipes/${id}`);
}
