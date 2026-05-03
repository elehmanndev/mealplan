export const SUPERMARKETS = [
  { id: 'lidl', label: 'Lidl', pillClass: 'bg-blue-700 text-white' },
  { id: 'mercadona', label: 'Mercadona', pillClass: 'bg-green-600 text-white' },
  { id: 'bon-area', label: 'Bon Àrea', pillClass: 'bg-amber-600 text-white' },
  { id: 'aldi', label: 'Aldi', pillClass: 'bg-sky-500 text-white' },
] as const;

export type SupermarketId = (typeof SUPERMARKETS)[number]['id'];

export function getSupermarket(id: string | null | undefined) {
  if (!id) return null;
  return SUPERMARKETS.find((s) => s.id === id) ?? null;
}
