'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import {
  createRecipe,
  deleteRecipe,
  duplicateRecipe,
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
