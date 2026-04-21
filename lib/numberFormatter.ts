// European number formatting (period as thousands separator, comma as decimal)
// Used throughout SETT for European markets

export function formatPriceEU(value: number | null | undefined, decimals: number = 2): string {
  if (value == null) return '—';
  return value.toLocaleString('de-DE', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

export function formatCurrencyEU(value: number | null | undefined, currency: string = '€', decimals: number = 2): string {
  if (value == null) return '—';
  const formatted = value.toLocaleString('de-DE', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  return `${currency}${formatted}`;
}

export function formatPercentageEU(value: number | null | undefined, decimals: number = 1): string {
  if (value == null) return '—';
  return value.toLocaleString('de-DE', { minimumFractionDigits: decimals, maximumFractionDigits: decimals }) + '%';
}

export function formatNumberEU(value: number | null | undefined, decimals: number = 2): string {
  if (value == null) return '—';
  return value.toLocaleString('de-DE', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}
