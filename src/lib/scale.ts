export function scaleQuantity(
  baseQuantity: number,
  baseServings: number,
  targetServings: number,
): number {
  if (baseServings <= 0) return baseQuantity;
  const scaled = baseQuantity * (targetServings / baseServings);
  if (scaled >= 10) return Math.round(scaled);
  if (scaled >= 1) return Math.round(scaled * 10) / 10;
  return Math.round(scaled * 100) / 100;
}

export function formatQuantity(q: number): string {
  if (Number.isInteger(q)) return String(q);
  return q.toFixed(q < 1 ? 2 : 1).replace(/\.?0+$/, '');
}

// "al gusto" ingredients (oil, salt, pepper) have no meaningful quantity.
// Returns a display string for any [quantity, unit] pair.
export function formatAmount(quantity: number | null | undefined, unit: string | null | undefined): string {
  if (unit === 'al_gusto') return 'al gusto';
  if (quantity == null && !unit) return '';
  if (quantity == null) return unit ?? '';
  return `${formatQuantity(quantity)}${unit ? ` ${unit}` : ''}`;
}
