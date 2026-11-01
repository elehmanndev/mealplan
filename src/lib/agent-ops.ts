import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import {
  AgentRecipeSearch,
  AgentShoppingCheckInput,
  AgentShoppingExtraInput,
  AgentWeekQuery,
  PlanAddInput,
  PlanMoveInput,
  PlanServingsInput,
} from '@/schemas';
import { NotFoundError } from '@/lib/errors';
import { generateShoppingList } from '@/lib/shopping';
import { dateFromString, formatDate, getCurrentWeek, getWeekDates } from '@/lib/week';
import { addPlanEntry, listWeekPlan, movePlanEntry, removePlanEntry, updatePlanServings } from '@/models/plan';
import { getRecipe, listRecipes } from '@/models/recipe';
import { addExtra, setExtraChecked, setExtraRemoved, setIngredientsChecked } from '@/models/shopping';

// Write/read operations for AI agents (REST under /api/agent and the MCP
// server at /api/mcp). Both transports call these so validation and household
// scoping live in one place. Every function takes the household resolved from
// the bearer token and raw input; zod errors → 400, NotFoundError → 404.

const EntryId = z.number().int().positive();

function weekOf(date?: string): string {
  return getCurrentWeek(date ? dateFromString(date) : new Date());
}

// Shopping is derived from the plan, so plan writes revalidate both views.
function revalidatePlan() {
  revalidatePath('/');
  revalidatePath('/shopping');
}

export function agentWeek(householdId: number, input: unknown) {
  const { date } = AgentWeekQuery.parse(input ?? {});
  const week = weekOf(date);
  const entries = listWeekPlan(householdId, week);
  const days = getWeekDates(week).map((d) => {
    const day = formatDate(d);
    const meals = (slot: 'comida' | 'cena') =>
      entries
        .filter((e) => e.date === day && e.slot === slot)
        .map((e) => ({
          entry_id: e.id,
          recipe_id: e.recipe_id,
          name: e.recipe?.name ?? '',
          emoji: e.recipe?.emoji ?? '',
          servings: e.servings,
        }));
    return { date: day, comida: meals('comida'), cena: meals('cena') };
  });
  const shopping = generateShoppingList(householdId, week).map((g) => ({
    supermarket: g.supermarket,
    label: g.label,
    items: g.items.map((i) => ({
      kind: i.kind,
      id: i.id,
      name: i.name,
      parts: i.parts,
      checked: i.checked,
    })),
  }));
  return { week, days, shopping };
}

export function agentListRecipes(householdId: number, input: unknown) {
  const { q, favorites_only } = AgentRecipeSearch.parse(input ?? {});
  return listRecipes(householdId, { search: q || undefined, favoritesOnly: favorites_only }).map((r) => ({
    id: r.id,
    name: r.name,
    emoji: r.emoji,
    category: r.category,
    base_servings: r.base_servings,
    prep_time_min: r.prep_time_min,
    is_favorite: r.is_favorite,
    tags: r.tags,
  }));
}

export function agentGetRecipe(householdId: number, id: unknown) {
  const recipe = getRecipe(householdId, EntryId.parse(id));
  if (!recipe) throw new NotFoundError('Recipe not found in this household');
  return recipe;
}

export function agentPlanAdd(householdId: number, input: unknown) {
  const data = PlanAddInput.parse(input);
  const entry_id = addPlanEntry(householdId, data);
  revalidatePlan();
  return { entry_id, ...data };
}

export function agentPlanMove(householdId: number, input: unknown) {
  const data = PlanMoveInput.parse(input);
  movePlanEntry(householdId, data);
  revalidatePlan();
  return data;
}

export function agentPlanServings(householdId: number, input: unknown) {
  const data = PlanServingsInput.parse(input);
  updatePlanServings(householdId, data.entry_id, data.servings);
  revalidatePlan();
  return data;
}

export function agentPlanRemove(householdId: number, entryId: unknown) {
  const entry_id = EntryId.parse(entryId);
  removePlanEntry(householdId, entry_id);
  revalidatePlan();
  return { entry_id, removed: true };
}

export function agentShoppingAdd(householdId: number, input: unknown) {
  const { date, ...rest } = AgentShoppingExtraInput.parse(input);
  const week = weekOf(date);
  const id = addExtra(householdId, { ...rest, week });
  revalidatePath('/shopping');
  return { kind: 'extra' as const, id, week, name: rest.name };
}

export function agentShoppingCheck(householdId: number, input: unknown) {
  const data = AgentShoppingCheckInput.parse(input);
  const week = weekOf(data.date);
  if (data.kind === 'extra') {
    setExtraChecked(householdId, data.id, data.checked);
  } else {
    // A recipe row can stand for several catalog ids; resolve the full set
    // from this household's list for that week (404 if it isn't there).
    const item = generateShoppingList(householdId, week, { includeRemoved: true })
      .flatMap((g) => g.items)
      .find((i) => i.kind === 'recipe' && i.id === data.id);
    if (!item) throw new NotFoundError('Shopping item not found in this week');
    setIngredientsChecked(householdId, week, item.ingredientIds, data.checked);
  }
  revalidatePath('/shopping');
  return { ...data, week };
}

export function agentShoppingRemove(householdId: number, extraId: unknown) {
  const id = EntryId.parse(extraId);
  setExtraRemoved(householdId, id, true);
  revalidatePath('/shopping');
  return { kind: 'extra' as const, id, removed: true };
}
