export const STANDARD_PRICES: number[] = [
  0,
  50,
  100,
  300,
  500,
  1000,
  3000,
  5000,
  8000,
  10000,
  15000,
  20000,
  25000,
]

export const HIGH_VALUE_PRICES: number[] = [
  0,
  50000,
  100000,
  150000,
  200000,
  250000,
  300000,
  350000,
  400000,
  450000,
  500000,
  750000,
  1000000,
  1500000,
  2000000,
]

const VEHICLE_CATEGORY_IDS = new Set([
  'vehicles',
  'cars',
  'mc',
  'boats',
  'caravan',
  'vehicle_other',
])

/**
 * Return the price options array based on category. Vehicle-related categories
 * (e.g. slug 'vehicles', 'cars', 'mc') get HIGH_VALUE_PRICES, others get STANDARD_PRICES.
 */
export function getPriceOptions(category: string | null | undefined): number[] {
  if (!category) return STANDARD_PRICES
  const key = category.toLowerCase()
  if (VEHICLE_CATEGORY_IDS.has(key)) return HIGH_VALUE_PRICES
  return STANDARD_PRICES
}

/**
 * Format a number as Swedish currency with 0 decimals, e.g. "1 500 000 kr".
 */
export function formatCurrency(value: number): string {
  return `${new Intl.NumberFormat('sv-SE', {
    maximumFractionDigits: 0,
    minimumFractionDigits: 0,
  }).format(value)} kr`
}

/**
 * Parse user input to a number. Strips spaces; returns null for empty or invalid.
 */
export function parsePrice(value: string): number | null {
  if (!value) return null
  const cleaned = value.replace(/\s+/g, '')
  if (!cleaned) return null
  const num = Number(cleaned)
  return Number.isNaN(num) ? null : num
}
