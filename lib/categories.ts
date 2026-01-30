export type CategoryChild = {
  id: string
  label: string
}

export type CategoryGroup = {
  id: string
  label: string
  children: CategoryChild[]
}

export const CATEGORY_GROUPS: CategoryGroup[] = [
  {
    id: 'vehicles',
    label: 'Fordon',
    children: [
      { id: 'cars', label: 'Bilar' },
      { id: 'boats', label: 'Båtar' },
      { id: 'mc', label: 'MC & Moped' },
      { id: 'caravan', label: 'Husvagn & Husbil' },
      { id: 'vehicle_other', label: 'Övrigt Fordon' },
    ],
  },
  {
    id: 'home_interior',
    label: 'Hem & Inredning',
    children: [
      { id: 'furniture', label: 'Möbler' },
      { id: 'lighting', label: 'Belysning' },
      { id: 'garden', label: 'Trädgård' },
      { id: 'household', label: 'Husgeråd' },
    ],
  },
  {
    id: 'electronics',
    label: 'Elektronik',
    children: [
      { id: 'computers', label: 'Datorer' },
      { id: 'mobile', label: 'Mobil' },
      { id: 'audio_video', label: 'Ljud/Bild' },
      { id: 'gaming', label: 'Gaming' },
    ],
  },
  {
    id: 'clothing_accessories',
    label: 'Kläder & Accessoarer',
    children: [
      { id: 'clothes', label: 'Kläder' },
      { id: 'shoes', label: 'Skor' },
      { id: 'accessories', label: 'Accessoarer' },
      { id: 'kids', label: 'Barn' },
    ],
  },
  {
    id: 'leisure_hobby',
    label: 'Fritid & Hobby',
    children: [
      { id: 'sports', label: 'Sport' },
      { id: 'outdoor', label: 'Friluft' },
      { id: 'music', label: 'Musik' },
      { id: 'collectibles', label: 'Samlar' },
    ],
  },
  {
    id: 'other',
    label: 'Övrigt',
    children: [{ id: 'other', label: 'Övrigt' }],
  },
]

export const ALL_CATEGORY_OPTIONS = CATEGORY_GROUPS.flatMap((group) =>
  group.children.map((child) => ({ ...child, groupLabel: group.label }))
)

// Mapping från gamla textvärden till nya ID:n (för bakåtkompatibilitet)
const OLD_TO_NEW_CATEGORY_MAP: Record<string, string> = {
  // Gamla huvudkategorier → nya ID:n (mappar till första underkategorin eller "other")
  'Fordon': 'cars',
  'Bilar': 'cars',
  'Båtar': 'boats',
  'MC & Moped': 'mc',
  'Husvagn & Husbil': 'caravan',
  'Övrigt Fordon': 'vehicle_other',
  
  'Hem & Inredning': 'furniture',
  'Möbler': 'furniture',
  'Belysning': 'lighting',
  'Trädgård': 'garden',
  'Husgeråd': 'household',
  
  'Elektronik': 'computers',
  'Datorer': 'computers',
  'Mobil': 'mobile',
  'Ljud/Bild': 'audio_video',
  'Gaming': 'gaming',
  
  'Kläder & Accessoarer': 'clothes',
  'Kläder': 'clothes',
  'Skor': 'shoes',
  'Accessoarer': 'accessories',
  'Barn': 'kids',
  
  'Fritid & Hobby': 'sports',
  'Sport': 'sports',
  'Friluft': 'outdoor',
  'Musik': 'music',
  'Samlar': 'collectibles',
  
  'Övrigt': 'other',
}

/**
 * Hämtar svenska etiketten för en kategori.
 * Hanterar både nya ID:n ('cars') och gamla textvärden ('Bilar').
 * Om inget matchar, returnerar ursprungstexten (för att inte visa konstiga saker).
 */
export const getCategoryLabel = (categoryId?: string | null): string => {
  if (!categoryId) return ''
  
  // Först: Försök hitta som ID (nya formatet)
  const matchById = ALL_CATEGORY_OPTIONS.find((item) => item.id === categoryId)
  if (matchById) return matchById.label
  
  // Andra: Försök hitta som label (gamla formatet) och mappa till nytt ID
  const matchByLabel = ALL_CATEGORY_OPTIONS.find((item) => item.label === categoryId)
  if (matchByLabel) return matchByLabel.label
  
  // Tredje: Kolla om det är ett gammalt textvärde som kan mappas
  const mappedId = OLD_TO_NEW_CATEGORY_MAP[categoryId]
  if (mappedId) {
    const mappedMatch = ALL_CATEGORY_OPTIONS.find((item) => item.id === mappedId)
    if (mappedMatch) return mappedMatch.label
  }
  
  // Fallback: Visa ursprungstexten (bättre än att visa ID eller krascha)
  return categoryId
}

/**
 * Hämtar grupp-etiketten för en kategori (t.ex. 'Fordon' för 'cars').
 * Hanterar både nya ID:n och gamla textvärden.
 */
export const getCategoryGroupLabel = (categoryId?: string | null): string => {
  if (!categoryId) return ''
  
  // Försök hitta som ID (nya formatet)
  const matchById = ALL_CATEGORY_OPTIONS.find((item) => item.id === categoryId)
  if (matchById) return matchById.groupLabel
  
  // Försök hitta som label (gamla formatet)
  const matchByLabel = ALL_CATEGORY_OPTIONS.find((item) => item.label === categoryId)
  if (matchByLabel) return matchByLabel.groupLabel
  
  // Kolla om det är ett gammalt textvärde som kan mappas
  const mappedId = OLD_TO_NEW_CATEGORY_MAP[categoryId]
  if (mappedId) {
    const mappedMatch = ALL_CATEGORY_OPTIONS.find((item) => item.id === mappedId)
    if (mappedMatch) return mappedMatch.groupLabel
  }
  
  // Fallback: tom sträng (grupp är mindre kritisk)
  return ''
}
