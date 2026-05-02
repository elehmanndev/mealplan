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
