export const SHOPPING_CATEGORIES = [
  'verduras',
  'frutas',
  'carne',
  'pescado',
  'lacteos',
  'panaderia',
  'despensa',
  'congelado',
  'bebidas',
  'otros',
] as const;

export type ShoppingCategory = (typeof SHOPPING_CATEGORIES)[number];

export interface ShoppingItem {
  kind: 'recipe' | 'extra';
  id: number;
  ingredientId?: number;
  name: string;
  quantity: number | null;
  unit: string | null;
  category: ShoppingCategory;
  checked: boolean;
  removed: boolean;
}

export interface ShoppingGroup {
  category: ShoppingCategory;
  items: ShoppingItem[];
}
