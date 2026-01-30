// Bilfärger - Top 5 mest köpta först, resten alfabetiskt (Violett borttagen)
// Top 5 mest köpta färger i Sverige: Svart, Vit, Grå, Silver, Blå
export const CAR_COLORS = [
  // Top 5 mest köpta (i ordning)
  'Svart',
  'Vit',
  'Grå',
  'Silver',
  'Blå',
  // Resten alfabetiskt
  'Grön',
  'Gul',
  'Orange',
  'Röd',
] as const

export type CarColor = typeof CAR_COLORS[number]
