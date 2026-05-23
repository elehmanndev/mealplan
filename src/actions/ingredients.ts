'use server';

import { revalidatePath } from 'next/cache';
import { mergeIngredients, type MergeReport } from '@/models/ingredient';
import { requireUser } from '@/lib/auth';

// Catalog edits are global (the ingredients table is shared across households
// by design — see CLAUDE.md). Restrict the merge tool to household owners so a
// member can't unilaterally rewrite the catalog the whole family sees.
async function requireOwner() {
  const user = await requireUser();
  if (user.role !== 'owner') {
    throw new Error('Solo el propietario puede fusionar ingredientes');
  }
  return user;
}

export async function mergeIngredientsAction(
  canonicalId: number,
  dupeIds: number[],
): Promise<MergeReport> {
  await requireOwner();
  if (!Number.isInteger(canonicalId) || canonicalId <= 0) {
    throw new Error('canonicalId inválido');
  }
  if (!Array.isArray(dupeIds) || dupeIds.length === 0) {
    throw new Error('Selecciona al menos un duplicado');
  }
  for (const id of dupeIds) {
    if (!Number.isInteger(id) || id <= 0) throw new Error('dupeId inválido');
  }
  const report = mergeIngredients(canonicalId, dupeIds);
  // Shopping list is derived from recipe_ingredients, so any merge can
  // change what shows up there; plan view shares the same data.
  revalidatePath('/');
  revalidatePath('/shopping');
  revalidatePath('/recipes');
  revalidatePath('/settings/ingredients');
  return report;
}
