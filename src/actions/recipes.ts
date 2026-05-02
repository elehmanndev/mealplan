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

export async function createRecipeAction(input: unknown) {
  const data = RecipeInput.parse(input);
  const id = createRecipe(data);
  revalidatePath('/recipes');
  return id;
}

export async function updateRecipeAction(id: number, input: unknown) {
  const data = RecipeInput.parse(input);
  updateRecipe(id, data);
  revalidatePath('/recipes');
  revalidatePath(`/recipes/${id}`);
}

export async function deleteRecipeAction(id: number) {
  deleteRecipe(id);
  revalidatePath('/recipes');
  redirect('/recipes');
}

export async function toggleFavoriteAction(id: number) {
  toggleFavoriteRecipe(id);
  revalidatePath('/recipes');
  revalidatePath(`/recipes/${id}`);
}

export async function duplicateRecipeAction(id: number) {
  const newId = duplicateRecipe(id);
  revalidatePath('/recipes');
  return newId;
}
