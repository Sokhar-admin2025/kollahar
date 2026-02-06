export const STANDARD_PRICES: number[] = [
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
]

export const HIGH_VALUE_PRICES: number[] = [
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
  600000,
  700000,
  800000,
  900000,
  1000000,
  1500000,
]

const HIGH_VALUE_CATEGORY_IDS = new Set([
  'vehicles',
  'cars',
  'mc',
  'boats',
  'caravans',
  'other-vehicle',
])

export function getPriceOptions(category: string | null | undefined): number[] {
  if (!category) return STANDARD_PRICES
  const key = category.toLowerCase()
  if (HIGH_VALUE_CATEGORY_IDS.has(key)) return HIGH_VALUE_PRICES
  return STANDARD_PRICES
}

export function formatPrice(value: number): string {
  return new Intl.NumberFormat('sv-SE', {
    maximumFractionDigits: 0,
  }).format(value)
}

export function parsePrice(value: string): number | null {
  if (!value) return null
  const cleaned = value.replace(/\s+/g, '')
  if (!cleaned) return null
  const num = Number(cleaned)
  return Number.isNaN(num) ? null : num
}

