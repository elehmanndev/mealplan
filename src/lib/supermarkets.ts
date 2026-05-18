// Central catalogue of supermarkets used across the app:
//   - chip selector in the recipe form (IngredientRepeater)
//   - chip selector in the chat draft card (RecipeDraftCard)
//   - per-group post-it theme on the shopping list (ShoppingList)
//   - schema enum for `supermarket` in /api/chat + /api/import + Zod
//
// IDs are kebab-case and forever-stable — they live in user data. Labels
// can be tweaked freely; `pillClass` is the saturated chip color, `theme`
// is the soft tint applied to the shopping-list group card.

export interface SupermarketTheme {
  /** Soft background tint for the post-it card. */
  bg: string;
  /** Subtle border for the post-it card. */
  border: string;
  /** Section header / count number color. */
  header: string;
  /** Divider between list items. */
  divider: string;
}

export interface Supermarket {
  id: string;
  label: string;
  /** Saturated chip color (selected state in pickers, badges in suggestions). */
  pillClass: string;
  /** Soft tint applied to the shopping-list group card. */
  theme: SupermarketTheme;
}

export const SUPERMARKETS: readonly Supermarket[] = [
  {
    id: 'mercadona',
    label: 'Mercadona',
    pillClass: 'bg-green-600 text-white',
    theme: { bg: 'bg-green-500/10', border: 'border-green-500/25', header: 'text-green-600', divider: 'divide-green-500/15' },
  },
  {
    id: 'carrefour',
    label: 'Carrefour',
    pillClass: 'bg-blue-600 text-white',
    theme: { bg: 'bg-blue-500/10', border: 'border-blue-500/25', header: 'text-blue-500', divider: 'divide-blue-500/15' },
  },
  {
    id: 'lidl',
    label: 'Lidl',
    pillClass: 'bg-blue-700 text-white',
    theme: { bg: 'bg-blue-700/10', border: 'border-blue-700/25', header: 'text-blue-600', divider: 'divide-blue-700/15' },
  },
  {
    id: 'dia',
    label: 'DIA',
    pillClass: 'bg-red-600 text-white',
    theme: { bg: 'bg-red-500/10', border: 'border-red-500/25', header: 'text-red-500', divider: 'divide-red-500/15' },
  },
  {
    id: 'alcampo',
    label: 'Alcampo',
    pillClass: 'bg-red-800 text-white',
    theme: { bg: 'bg-red-700/10', border: 'border-red-700/25', header: 'text-red-700', divider: 'divide-red-700/15' },
  },
  {
    id: 'consum',
    label: 'Consum',
    pillClass: 'bg-orange-500 text-white',
    theme: { bg: 'bg-orange-500/10', border: 'border-orange-500/25', header: 'text-orange-500', divider: 'divide-orange-500/15' },
  },
  {
    id: 'eroski',
    label: 'Eroski',
    pillClass: 'bg-red-500 text-white',
    theme: { bg: 'bg-red-400/10', border: 'border-red-400/25', header: 'text-red-400', divider: 'divide-red-400/15' },
  },
  {
    id: 'aldi',
    label: 'ALDI',
    pillClass: 'bg-sky-500 text-white',
    theme: { bg: 'bg-sky-500/10', border: 'border-sky-500/25', header: 'text-sky-500', divider: 'divide-sky-500/15' },
  },
  {
    id: 'bonpreu',
    label: 'Bonpreu',
    pillClass: 'bg-emerald-700 text-white',
    theme: { bg: 'bg-emerald-500/10', border: 'border-emerald-500/25', header: 'text-emerald-600', divider: 'divide-emerald-500/15' },
  },
  {
    id: 'esclat',
    label: 'Esclat',
    pillClass: 'bg-indigo-600 text-white',
    theme: { bg: 'bg-indigo-500/10', border: 'border-indigo-500/25', header: 'text-indigo-500', divider: 'divide-indigo-500/15' },
  },
  {
    id: 'condis',
    label: 'Condis',
    pillClass: 'bg-lime-600 text-white',
    theme: { bg: 'bg-lime-500/10', border: 'border-lime-500/25', header: 'text-lime-600', divider: 'divide-lime-500/15' },
  },
  {
    id: 'spar',
    label: 'Spar',
    pillClass: 'bg-rose-600 text-white',
    theme: { bg: 'bg-rose-500/10', border: 'border-rose-500/25', header: 'text-rose-500', divider: 'divide-rose-500/15' },
  },
  {
    id: 'caprabo',
    label: 'Caprabo',
    pillClass: 'bg-cyan-600 text-white',
    theme: { bg: 'bg-cyan-500/10', border: 'border-cyan-500/25', header: 'text-cyan-500', divider: 'divide-cyan-500/15' },
  },
  {
    id: 'la-sirena',
    label: 'La Sirena',
    pillClass: 'bg-blue-400 text-slate-900',
    theme: { bg: 'bg-blue-400/10', border: 'border-blue-400/25', header: 'text-blue-400', divider: 'divide-blue-400/15' },
  },
  {
    id: 'bon-area',
    label: 'BonÀrea',
    pillClass: 'bg-amber-600 text-white',
    theme: { bg: 'bg-amber-500/15', border: 'border-amber-500/30', header: 'text-amber-600', divider: 'divide-amber-500/20' },
  },
];

export type SupermarketId = (typeof SUPERMARKETS)[number]['id'];

export function getSupermarket(id: string | null | undefined): Supermarket | null {
  if (!id) return null;
  return SUPERMARKETS.find((s) => s.id === id) ?? null;
}
