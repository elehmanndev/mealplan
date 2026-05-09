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

export const RECIPE_TAGS = [
  'Pasta',
  'Ensaladas',
  'Cenas',
  'Comidas',
  'Tuppers',
  'Verano',
  'Invierno',
] as const;
export type RecipeTag = (typeof RECIPE_TAGS)[number];

export const UNITS = [
  // Mass / volume
  'g',
  'kg',
  'ml',
  'l',
  // Counted-as-bought (one per supermarket package)
  'ud',
  'pieza',
  'unidad',
  'paquete',
  'lata',
  'bandeja',
  'bolsa',
  'brick',
  // Cooking measures
  'cucharada',
  'cucharadita',
  'pellizco',
  'taza',
  'diente',
  // Pantry / "to taste" — for items where quantity isn't meaningful (oil, salt,
  // pepper, spices). Renders as "al gusto" and ignored when summing the shopping list.
  'al_gusto',
] as const;
export type Unit = (typeof UNITS)[number];

// Units sold as a discrete package — when summing for the shopping list, totals
// in these units round up to the nearest whole. (Don't ceil g/ml — buying 1g
// extra of tomato to round 49g→50g is silly.)
export const PACKAGED_UNITS = new Set<Unit>([
  'ud',
  'pieza',
  'unidad',
  'paquete',
  'lata',
  'bandeja',
  'bolsa',
  'brick',
]);

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
  tags: string[];
}

export interface RecipeIngredient {
  ingredient_id: number;
  name: string;
  quantity: number;
  unit: Unit;
  shopping_category: string;
  supermarket?: string | null;
}

export interface RecipeWithIngredients extends Recipe {
  ingredients: RecipeIngredient[];
}

export interface Ingredient {
  id: number;
  name: string;
  default_unit: Unit;
  shopping_category: string;
  supermarket?: string | null;
  // When true, the shopping list ignores this ingredient (e.g. olive oil, salt,
  // pepper — pantry staples the user already has). Still included in recipes.
  is_pantry?: boolean;
}

export interface PlanEntry {
  id: number;
  date: string;
  slot: Slot;
  recipe_id: number;
  servings: number;
  recipe?: Pick<Recipe, 'id' | 'name' | 'emoji' | 'base_servings' | 'category'>;
}
