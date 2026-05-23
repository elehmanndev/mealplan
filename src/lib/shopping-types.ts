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

export interface ShoppingItemPart {
  quantity: number;
  unit: string;
}

export interface ShoppingItem {
  kind: 'recipe' | 'extra';
  id: number;
  ingredientId?: number;
  name: string;
  // A single ingredient can show multiple (quantity, unit) parts when recipes
  // for the week record it in different units (e.g. 100 g + 1 lata). Extras
  // have 0 or 1 part. Render as "100 g + 1 lata".
  parts: ShoppingItemPart[];
  category: ShoppingCategory;
  supermarket?: string | null;
  checked: boolean;
  removed: boolean;
}

export interface ShoppingGroup {
  supermarket: string | null;
  label: string;
  items: ShoppingItem[];
}
