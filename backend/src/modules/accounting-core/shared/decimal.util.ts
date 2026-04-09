export function toAmountString(value: number | string): string {
  const numeric = typeof value === 'number' ? value : Number(value);
  return numeric.toFixed(2);
}

export function parseAmount(value: number | string): number {
  return typeof value === 'number' ? value : Number(value);
}
