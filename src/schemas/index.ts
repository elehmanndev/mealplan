import { z } from 'zod';
import { RECIPE_CATEGORIES, RECIPE_TAGS, SLOTS, UNITS } from '@/types';
import { SHOPPING_CATEGORIES } from '@/lib/shopping-types';

export const RecipeCategoryEnum = z.enum(RECIPE_CATEGORIES);
export const RecipeTagEnum = z.enum(RECIPE_TAGS);
export const UnitEnum = z.enum(UNITS);
export const SlotEnum = z.enum(SLOTS);
export const ShoppingCategoryEnum = z.enum(SHOPPING_CATEGORIES);

export const RecipeIngredientInput = z.object({
  ingredient_id: z.number().int().positive().optional(),
  name: z.string().min(1).max(80),
  quantity: z.number().positive(),
  unit: UnitEnum,
  shopping_category: ShoppingCategoryEnum.optional(),
  supermarket: z.string().nullable().optional(),
});
export type RecipeIngredientInput = z.infer<typeof RecipeIngredientInput>;

export const RecipeInput = z.object({
  name: z.string().min(1).max(120),
  description: z.string().max(2000).optional().nullable(),
  emoji: z.string().min(1).max(8).default('🍽️'),
  base_servings: z.number().int().min(1).max(20).default(2),
  category: RecipeCategoryEnum.optional().nullable(),
  prep_time_min: z.number().int().min(0).max(600).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
  is_favorite: z.boolean().default(false),
  ingredients: z.array(RecipeIngredientInput).default([]),
  tags: z.array(RecipeTagEnum).default([]),
});
export type RecipeInput = z.infer<typeof RecipeInput>;

export const PlanAddInput = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  slot: SlotEnum,
  recipe_id: z.number().int().positive(),
  servings: z.number().positive(),
});
export type PlanAddInput = z.infer<typeof PlanAddInput>;

export const PlanMoveInput = z.object({
  entry_id: z.number().int().positive(),
  to_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  to_slot: SlotEnum,
});
export type PlanMoveInput = z.infer<typeof PlanMoveInput>;

export const PlanDuplicateInput = PlanMoveInput;
export type PlanDuplicateInput = z.infer<typeof PlanDuplicateInput>;

// Week key is the YYYY-MM-DD date of the Saturday opening the week.
// (See src/lib/week.ts for the rationale — Eric plans Sa→Fr, not Mon→Sun.)
export const WeekStr = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const HouseholdNameInput = z.string().trim().min(1, 'Pon un nombre a tu casa').max(60, 'Máximo 60 caracteres');

// Base64url-encoded token from crypto.randomBytes(24) → 32 chars.
// Validate length-ish (don't be too strict, just refuse obvious garbage).
export const InviteTokenInput = z.string().regex(/^[A-Za-z0-9_-]{16,64}$/, 'Enlace no válido');

export const ShoppingExtraInput = z.object({
  week: WeekStr,
  name: z.string().min(1).max(80),
  quantity: z.number().positive().optional().nullable(),
  unit: UnitEnum.optional().nullable(),
  shopping_category: ShoppingCategoryEnum.default('otros'),
  supermarket: z.string().nullable().optional(),
});
export type ShoppingExtraInput = z.infer<typeof ShoppingExtraInput>;

// ── Agent API (bearer token, src/lib/agent-ops.ts) ──
// Agents send any day of the week; the server derives the Saturday week key,
// so an extra can never land on a non-Saturday key and go invisible.
const DateStr = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'date must be YYYY-MM-DD');

export const AgentWeekQuery = z.object({ date: DateStr.optional() });

export const AgentRecipeSearch = z.object({
  q: z.string().trim().max(120).optional(),
  favorites_only: z.boolean().optional(),
});

export const PlanServingsInput = z.object({
  entry_id: z.number().int().positive(),
  servings: z.number().positive().max(50),
});
export type PlanServingsInput = z.infer<typeof PlanServingsInput>;

export const AgentShoppingExtraInput = ShoppingExtraInput.omit({ week: true }).extend({
  date: DateStr.optional(),
});
export type AgentShoppingExtraInput = z.infer<typeof AgentShoppingExtraInput>;

// `kind` + `id` are the ones listed by the agent week view (ShoppingItem.kind/id).
export const AgentShoppingCheckInput = z.object({
  date: DateStr.optional(),
  kind: z.enum(['recipe', 'extra']),
  id: z.number().int().positive(),
  checked: z.boolean(),
});
export type AgentShoppingCheckInput = z.infer<typeof AgentShoppingCheckInput>;
