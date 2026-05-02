import { z } from 'zod';
import { RECIPE_CATEGORIES, SLOTS, UNITS } from '@/types';
import { SHOPPING_CATEGORIES } from '@/lib/shopping-types';

export const RecipeCategoryEnum = z.enum(RECIPE_CATEGORIES);
export const UnitEnum = z.enum(UNITS);
export const SlotEnum = z.enum(SLOTS);
export const ShoppingCategoryEnum = z.enum(SHOPPING_CATEGORIES);

export const RecipeIngredientInput = z.object({
  ingredient_id: z.number().int().positive().optional(),
  name: z.string().min(1).max(80),
  quantity: z.number().positive(),
  unit: UnitEnum,
  shopping_category: ShoppingCategoryEnum.optional(),
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

export const WeekStr = z.string().regex(/^\d{4}-W\d{2}$/);

export const ShoppingExtraInput = z.object({
  week: WeekStr,
  name: z.string().min(1).max(80),
  quantity: z.number().positive().optional().nullable(),
  unit: UnitEnum.optional().nullable(),
  shopping_category: ShoppingCategoryEnum.default('otros'),
});
export type ShoppingExtraInput = z.infer<typeof ShoppingExtraInput>;
