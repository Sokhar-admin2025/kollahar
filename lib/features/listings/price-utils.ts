export {
  STANDARD_PRICES,
  HIGH_VALUE_PRICES,
  getPriceOptions,
  parsePrice,
  formatCurrency,
} from './utils/price-utils'

import { formatCurrency } from './utils/price-utils'

/** @deprecated Use formatCurrency for "X kr". Kept for backward compatibility. */
export function formatPrice(value: number): string {
  return formatCurrency(value).replace(/\s*kr\s*$/, '').trim()
}
