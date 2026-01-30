// Bilfärger - regnbågens primära (utan indigo) + vit, svart, grå, silver
export const CAR_COLORS = [
  'Röd',
  'Orange',
  'Gul',
  'Grön',
  'Blå',
  'Violett',
  'Vit',
  'Svart',
  'Grå',
  'Silver',
] as const

export type CarColor = typeof CAR_COLORS[number]
