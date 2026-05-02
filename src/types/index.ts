export const RECIPE_CATEGORIES = [
  'pasta',
  'arroz',
  'carne',
  'pescado',
  'ensalada',
  'verdura',
  'legumbres',
  'huevos',
  'sopa',
  'otros',
] as const;
export type RecipeCategory = (typeof RECIPE_CATEGORIES)[number];

export const UNITS = [
  'g',
  'kg',
  'ml',
  'l',
  'ud',
  'cucharada',
  'cucharadita',
  'pellizco',
  'taza',
  'diente',
] as const;
export type Unit = (typeof UNITS)[number];

export const SLOTS = ['comida', 'cena'] as const;
export type Slot = (typeof SLOTS)[number];

export interface Recipe {
  id: number;
  name: string;
  description: string | null;
  emoji: string;
  base_servings: number;
  category: RecipeCategory | null;
  prep_time_min: number | null;
  notes: string | null;
  is_favorite: boolean;
  created_at: string;
}

export interface RecipeIngredient {
  ingredient_id: number;
  name: string;
  quantity: number;
  unit: Unit;
  shopping_category: string;
}

export interface RecipeWithIngredients extends Recipe {
  ingredients: RecipeIngredient[];
}

export interface Ingredient {
  id: number;
  name: string;
  default_unit: Unit;
  shopping_category: string;
}

export interface PlanEntry {
  id: number;
  date: string;
  slot: Slot;
  recipe_id: number;
  servings: number;
  recipe?: Pick<Recipe, 'id' | 'name' | 'emoji' | 'base_servings' | 'category'>;
}
