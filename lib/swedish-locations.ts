export interface SwedishCounty {
  county: string
  municipalities: string[]
}

// Kuraterad lista med vanliga län/kommuner för filtret.
// Detta är tänkt som en första version för UX-testning.
export const SWEDISH_LOCATIONS: SwedishCounty[] = [
  {
    county: 'Stockholms län',
    municipalities: [
      'Stockholm',
      'Huddinge',
      'Solna',
      'Sundbyberg',
      'Täby',
      'Södertälje',
      'Lidingö',
      'Nacka',
      'Danderyd',
      'Järfälla',
    ],
  },
  {
    county: 'Västra Götalands län',
    municipalities: [
      'Göteborg',
      'Borås',
      'Trollhättan',
      'Uddevalla',
      'Lidköping',
      'Skövde',
      'Alingsås',
      'Kungälv',
      'Falköping',
    ],
  },
  {
    county: 'Skåne län',
    municipalities: [
      'Malmö',
      'Lund',
      'Helsingborg',
      'Kristianstad',
      'Hässleholm',
      'Trelleborg',
      'Ystad',
      'Ängelholm',
    ],
  },
  {
    county: 'Uppsala län',
    municipalities: [
      'Uppsala',
      'Enköping',
      'Östhammar',
      'Tierp',
    ],
  },
  {
    county: 'Östergötlands län',
    municipalities: [
      'Linköping',
      'Norrköping',
      'Motala',
      'Mjölby',
    ],
  },
  {
    county: 'Jönköpings län',
    municipalities: [
      'Jönköping',
      'Nässjö',
      'Värnamo',
      'Eksjö',
    ],
  },
  {
    county: 'Hallands län',
    municipalities: [
      'Halmstad',
      'Varberg',
      'Kungsbacka',
      'Falkenberg',
    ],
  },
  {
    county: 'Örebro län',
    municipalities: [
      'Örebro',
      'Kumla',
      'Hallsberg',
      'Lindesberg',
    ],
  },
]

// --- Platsfilter (LocationFilter) – träd med label/value/count ---

export interface LocationMunicipality {
  label: string
  value: string
  count: number
}

export interface LocationCounty {
  label: string
  value: string
  count: number
  municipalities: LocationMunicipality[]
}

// LOCATION_TREE byggs från SWEDISH_LAN + SWEDISH_KOMMUNER (alla län och kommuner), se längre ner i filen.
export function getCountyByValue(value: string): LocationCounty | undefined {
  return LOCATION_TREE.find((c) => c.value === value)
}

export function getMunicipalityLabel(countyValue: string, municipalityValue: string): string | undefined {
  const county = getCountyByValue(countyValue)
  const m = county?.municipalities.find((mm) => mm.value === municipalityValue)
  return m?.label
}

// Svenska län och kommuner
// Data från SCB (Statistiska centralbyrån) - 2024

export interface SwedishLocation {
  kommun: string;
  län: string;
}

// --- Stuvsta med närliggande områden (alias-namn som ska bete sig likadant i SÖK),
// men där annonsernas location kan vara definierad separat per område.
const STUVSTA_NEIGHBORHOOD_ALIASES = [
  'stuvsta',
  'vistaberg',
  'glömsta',
  'glomsta', // fallback utan ö
  'fullersta',
] as const

type StuvstaAlias = (typeof STUVSTA_NEIGHBORHOOD_ALIASES)[number]

const STUVSTA_ALIAS_DISPLAY: Record<StuvstaAlias, string> = {
  stuvsta: 'Stuvsta',
  vistaberg: 'Vistaberg',
  'glömsta': 'Glömsta',
  glomsta: 'Glömsta',
  fullersta: 'Fullersta',
}

export function isStuvstaAlias(name: string): boolean {
  const lower = name.trim().toLowerCase()
  return STUVSTA_NEIGHBORHOOD_ALIASES.includes(lower as StuvstaAlias)
}

/**
 * För filter/statistik: mappa alias-namn (Stuvsta, Vistaberg, Glömsta, Fullersta) till
 * en kanonisk kommunetikett i trädet ("Huddinge").
 * Dvs alla dessa räknas som Huddinge i LOCATION_TREE/get_location_stats.
 */
export function mapAliasToCanonicalMunicipalityName(query: string): string | null {
  const lower = query.trim().toLowerCase()
  if (!lower) return null
  if (isStuvstaAlias(lower)) {
    return 'Huddinge'
  }
  return null
}

/**
 * För lagrat värde på annonsen: mappa alias till det exakta områdesnamnet + Huddinge.
 * Exempel: "vistaberg" -> "Vistaberg, Huddinge"
 */
export function formatStuvstaAliasLocation(raw: string): string | null {
  const lower = raw.trim().toLowerCase()
  if (!lower) return null
  if (!isStuvstaAlias(lower)) return null
  const display = STUVSTA_ALIAS_DISPLAY[lower as StuvstaAlias]
  return `${display}, Huddinge`
}

export const SWEDISH_LAN = [
  'Stockholms län',
  'Uppsala län',
  'Södermanlands län',
  'Östergötlands län',
  'Jönköpings län',
  'Kronobergs län',
  'Kalmar län',
  'Gotlands län',
  'Blekinge län',
  'Skåne län',
  'Hallands län',
  'Västra Götalands län',
  'Värmlands län',
  'Örebro län',
  'Västmanlands län',
  'Dalarnas län',
  'Gävleborgs län',
  'Västernorrlands län',
  'Jämtlands län',
  'Västerbottens län',
  'Norrbottens län',
] as const;

export const SWEDISH_KOMMUNER: SwedishLocation[] = [
  // Stockholms län
  { kommun: 'Stockholm', län: 'Stockholms län' },
  { kommun: 'Huddinge', län: 'Stockholms län' },
  // Stuvsta är en tätort i Huddinge – hanteras som alias i UI (Stuvsta, Huddinge)
  // men ligger administrativt i Stockholms län, därför knuten hit i plats-trädet.
  { kommun: 'Stuvsta', län: 'Stockholms län' },
  { kommun: 'Nacka', län: 'Stockholms län' },
  { kommun: 'Södertälje', län: 'Stockholms län' },
  { kommun: 'Botkyrka', län: 'Stockholms län' },
  { kommun: 'Haninge', län: 'Stockholms län' },
  { kommun: 'Tyresö', län: 'Stockholms län' },
  { kommun: 'Täby', län: 'Stockholms län' },
  { kommun: 'Danderyd', län: 'Stockholms län' },
  { kommun: 'Sollentuna', län: 'Stockholms län' },
  { kommun: 'Solna', län: 'Stockholms län' },
  { kommun: 'Sundbyberg', län: 'Stockholms län' },
  { kommun: 'Lidingö', län: 'Stockholms län' },
  { kommun: 'Vaxholm', län: 'Stockholms län' },
  { kommun: 'Norrtälje', län: 'Stockholms län' },
  { kommun: 'Sigtuna', län: 'Stockholms län' },
  { kommun: 'Upplands-Bro', län: 'Stockholms län' },
  { kommun: 'Upplands Väsby', län: 'Stockholms län' },
  { kommun: 'Vallentuna', län: 'Stockholms län' },
  { kommun: 'Österåker', län: 'Stockholms län' },
  { kommun: 'Värmdö', län: 'Stockholms län' },
  { kommun: 'Nynäshamn', län: 'Stockholms län' },
  { kommun: 'Salem', län: 'Stockholms län' },
  { kommun: 'Ekerö', län: 'Stockholms län' },
  { kommun: 'Järfälla', län: 'Stockholms län' },
  { kommun: 'Upplands-Bro', län: 'Stockholms län' },
  
  // Uppsala län
  { kommun: 'Uppsala', län: 'Uppsala län' },
  { kommun: 'Enköping', län: 'Uppsala län' },
  { kommun: 'Östhammar', län: 'Uppsala län' },
  { kommun: 'Tierp', län: 'Uppsala län' },
  { kommun: 'Älvkarleby', län: 'Uppsala län' },
  { kommun: 'Knivsta', län: 'Uppsala län' },
  { kommun: 'Håbo', län: 'Uppsala län' },
  
  // Södermanlands län
  { kommun: 'Nyköping', län: 'Södermanlands län' },
  { kommun: 'Oxelösund', län: 'Södermanlands län' },
  { kommun: 'Flen', län: 'Södermanlands län' },
  { kommun: 'Katrineholm', län: 'Södermanlands län' },
  { kommun: 'Eskilstuna', län: 'Södermanlands län' },
  { kommun: 'Strängnäs', län: 'Södermanlands län' },
  { kommun: 'Trosa', län: 'Södermanlands län' },
  { kommun: 'Gnesta', län: 'Södermanlands län' },
  { kommun: 'Vingåker', län: 'Södermanlands län' },
  
  // Östergötlands län
  { kommun: 'Linköping', län: 'Östergötlands län' },
  { kommun: 'Norrköping', län: 'Östergötlands län' },
  { kommun: 'Motala', län: 'Östergötlands län' },
  { kommun: 'Mjölby', län: 'Östergötlands län' },
  { kommun: 'Finspång', län: 'Östergötlands län' },
  { kommun: 'Valdemarsvik', län: 'Östergötlands län' },
  { kommun: 'Söderköping', län: 'Östergötlands län' },
  { kommun: 'Åtvidaberg', län: 'Östergötlands län' },
  { kommun: 'Boxholm', län: 'Östergötlands län' },
  { kommun: 'Kindaberg', län: 'Östergötlands län' },
  { kommun: 'Ydre', län: 'Östergötlands län' },
  
  // Jönköpings län
  { kommun: 'Jönköping', län: 'Jönköpings län' },
  { kommun: 'Värnamo', län: 'Jönköpings län' },
  { kommun: 'Vetlanda', län: 'Jönköpings län' },
  { kommun: 'Nässjö', län: 'Jönköpings län' },
  { kommun: 'Tranås', län: 'Jönköpings län' },
  { kommun: 'Gislaved', län: 'Jönköpings län' },
  { kommun: 'Sävsjö', län: 'Jönköpings län' },
  { kommun: 'Eksjö', län: 'Jönköpings län' },
  { kommun: 'Aneby', län: 'Jönköpings län' },
  { kommun: 'Habo', län: 'Jönköpings län' },
  { kommun: 'Mullsjö', län: 'Jönköpings län' },
  { kommun: 'Gnosjö', län: 'Jönköpings län' },
  
  // Kronobergs län
  { kommun: 'Växjö', län: 'Kronobergs län' },
  { kommun: 'Ljungby', län: 'Kronobergs län' },
  { kommun: 'Alvesta', län: 'Kronobergs län' },
  { kommun: 'Älmhult', län: 'Kronobergs län' },
  { kommun: 'Tingsryd', län: 'Kronobergs län' },
  { kommun: 'Uppvidinge', län: 'Kronobergs län' },
  { kommun: 'Lessebo', län: 'Kronobergs län' },
  { kommun: 'Markaryd', län: 'Kronobergs län' },
  
  // Kalmar län
  { kommun: 'Kalmar', län: 'Kalmar län' },
  { kommun: 'Västervik', län: 'Kalmar län' },
  { kommun: 'Vimmerby', län: 'Kalmar län' },
  { kommun: 'Oskarshamn', län: 'Kalmar län' },
  { kommun: 'Nybro', län: 'Kalmar län' },
  { kommun: 'Mörbylånga', län: 'Kalmar län' },
  { kommun: 'Mönsterås', län: 'Kalmar län' },
  { kommun: 'Hultsfred', län: 'Kalmar län' },
  { kommun: 'Högsby', län: 'Kalmar län' },
  { kommun: 'Torsås', län: 'Kalmar län' },
  { kommun: 'Borgholm', län: 'Kalmar län' },
  { kommun: 'Emmaboda', län: 'Kalmar län' },
  
  // Gotlands län
  { kommun: 'Gotland', län: 'Gotlands län' },
  
  // Blekinge län
  { kommun: 'Karlskrona', län: 'Blekinge län' },
  { kommun: 'Karlshamn', län: 'Blekinge län' },
  { kommun: 'Ronneby', län: 'Blekinge län' },
  { kommun: 'Sölvesborg', län: 'Blekinge län' },
  { kommun: 'Olofström', län: 'Blekinge län' },
  
  // Skåne län
  { kommun: 'Malmö', län: 'Skåne län' },
  { kommun: 'Lund', län: 'Skåne län' },
  { kommun: 'Helsingborg', län: 'Skåne län' },
  { kommun: 'Kristianstad', län: 'Skåne län' },
  { kommun: 'Landskrona', län: 'Skåne län' },
  { kommun: 'Trelleborg', län: 'Skåne län' },
  { kommun: 'Ystad', län: 'Skåne län' },
  { kommun: 'Eslöv', län: 'Skåne län' },
  { kommun: 'Hässleholm', län: 'Skåne län' },
  { kommun: 'Ängelholm', län: 'Skåne län' },
  { kommun: 'Båstad', län: 'Skåne län' },
  { kommun: 'Östra Göinge', län: 'Skåne län' },
  { kommun: 'Bromölla', län: 'Skåne län' },
  { kommun: 'Osby', län: 'Skåne län' },
  { kommun: 'Perstorp', län: 'Skåne län' },
  { kommun: 'Klippan', län: 'Skåne län' },
  { kommun: 'Åstorp', län: 'Skåne län' },
  { kommun: 'Bjuv', län: 'Skåne län' },
  { kommun: 'Svalöv', län: 'Skåne län' },
  { kommun: 'Staffanstorp', län: 'Skåne län' },
  { kommun: 'Burlöv', län: 'Skåne län' },
  { kommun: 'Vellinge', län: 'Skåne län' },
  { kommun: 'Örkelljunga', län: 'Skåne län' },
  { kommun: 'Åstorp', län: 'Skåne län' },
  { kommun: 'Kävlinge', län: 'Skåne län' },
  { kommun: 'Lomma', län: 'Skåne län' },
  { kommun: 'Svedala', län: 'Skåne län' },
  { kommun: 'Skurup', län: 'Skåne län' },
  { kommun: 'Sjöbo', län: 'Skåne län' },
  { kommun: 'Hörby', län: 'Skåne län' },
  { kommun: 'Höör', län: 'Skåne län' },
  { kommun: 'Tomelilla', län: 'Skåne län' },
  { kommun: 'Simrishamn', län: 'Skåne län' },
  { kommun: 'Östra Göinge', län: 'Skåne län' },
  
  // Hallands län
  { kommun: 'Halmstad', län: 'Hallands län' },
  { kommun: 'Varberg', län: 'Hallands län' },
  { kommun: 'Falkenberg', län: 'Hallands län' },
  { kommun: 'Kungsbacka', län: 'Hallands län' },
  { kommun: 'Laholm', län: 'Hallands län' },
  { kommun: 'Hylte', län: 'Hallands län' },
  
  // Västra Götalands län
  { kommun: 'Göteborg', län: 'Västra Götalands län' },
  { kommun: 'Borås', län: 'Västra Götalands län' },
  { kommun: 'Trollhättan', län: 'Västra Götalands län' },
  { kommun: 'Uddevalla', län: 'Västra Götalands län' },
  { kommun: 'Lidköping', län: 'Västra Götalands län' },
  { kommun: 'Skövde', län: 'Västra Götalands län' },
  { kommun: 'Mariestad', län: 'Västra Götalands län' },
  { kommun: 'Alingsås', län: 'Västra Götalands län' },
  { kommun: 'Vänersborg', län: 'Västra Götalands län' },
  { kommun: 'Trollhättan', län: 'Västra Götalands län' },
  { kommun: 'Kungälv', län: 'Västra Götalands län' },
  { kommun: 'Lysekil', län: 'Västra Götalands län' },
  { kommun: 'Strömstad', län: 'Västra Götalands län' },
  { kommun: 'Tanum', län: 'Västra Götalands län' },
  { kommun: 'Dals-Ed', län: 'Västra Götalands län' },
  { kommun: 'Färgelanda', län: 'Västra Götalands län' },
  { kommun: 'Mellerud', län: 'Västra Götalands län' },
  { kommun: 'Lilla Edet', län: 'Västra Götalands län' },
  { kommun: 'Mark', län: 'Västra Götalands län' },
  { kommun: 'Svenljunga', län: 'Västra Götalands län' },
  { kommun: 'Herrljunga', län: 'Västra Götalands län' },
  { kommun: 'Vårgårda', län: 'Västra Götalands län' },
  { kommun: 'Bollebygd', län: 'Västra Götalands län' },
  { kommun: 'Grästorp', län: 'Västra Götalands län' },
  { kommun: 'Essunga', län: 'Västra Götalands län' },
  { kommun: 'Karlsborg', län: 'Västra Götalands län' },
  { kommun: 'Gullspång', län: 'Västra Götalands län' },
  { kommun: 'Tranemo', län: 'Västra Götalands län' },
  { kommun: 'Bengtsfors', län: 'Västra Götalands län' },
  { kommun: 'Åmål', län: 'Västra Götalands län' },
  { kommun: 'Munkedal', län: 'Västra Götalands län' },
  { kommun: 'Tjörn', län: 'Västra Götalands län' },
  { kommun: 'Orust', län: 'Västra Götalands län' },
  { kommun: 'Sotenäs', län: 'Västra Götalands län' },
  { kommun: 'Mölndal', län: 'Västra Götalands län' },
  { kommun: 'Kungsbacka', län: 'Västra Götalands län' },
  { kommun: 'Härryda', län: 'Västra Götalands län' },
  { kommun: 'Partille', län: 'Västra Götalands län' },
  { kommun: 'Öckerö', län: 'Västra Götalands län' },
  { kommun: 'Stenungsund', län: 'Västra Götalands län' },
  { kommun: 'Tjörn', län: 'Västra Götalands län' },
  { kommun: 'Orust', län: 'Västra Götalands län' },
  { kommun: 'Sotenäs', län: 'Västra Götalands län' },
  { kommun: 'Munkedal', län: 'Västra Götalands län' },
  { kommun: 'Tanum', län: 'Västra Götalands län' },
  { kommun: 'Dals-Ed', län: 'Västra Götalands län' },
  { kommun: 'Färgelanda', län: 'Västra Götalands län' },
  { kommun: 'Ale', län: 'Västra Götalands län' },
  { kommun: 'Lerum', län: 'Västra Götalands län' },
  { kommun: 'Vårgårda', län: 'Västra Götalands län' },
  { kommun: 'Bollebygd', län: 'Västra Götalands län' },
  { kommun: 'Grästorp', län: 'Västra Götalands län' },
  { kommun: 'Essunga', län: 'Västra Götalands län' },
  { kommun: 'Karlsborg', län: 'Västra Götalands län' },
  { kommun: 'Gullspång', län: 'Västra Götalands län' },
  { kommun: 'Tranemo', län: 'Västra Götalands län' },
  { kommun: 'Bengtsfors', län: 'Västra Götalands län' },
  { kommun: 'Åmål', län: 'Västra Götalands län' },
  { kommun: 'Falköping', län: 'Västra Götalands län' },
  { kommun: 'Kil', län: 'Västra Götalands län' },
  { kommun: 'Grums', län: 'Västra Götalands län' },
  { kommun: 'Årjäng', län: 'Västra Götalands län' },
  { kommun: 'Sunne', län: 'Västra Götalands län' },
  { kommun: 'Torsby', län: 'Västra Götalands län' },
  { kommun: 'Storfors', län: 'Västra Götalands län' },
  { kommun: 'Hammarö', län: 'Västra Götalands län' },
  { kommun: 'Munkfors', län: 'Västra Götalands län' },
  { kommun: 'Forshaga', län: 'Västra Götalands län' },
  { kommun: 'Grums', län: 'Västra Götalands län' },
  { kommun: 'Kil', län: 'Västra Götalands län' },
  { kommun: 'Eda', län: 'Västra Götalands län' },
  { kommun: 'Torsby', län: 'Västra Götalands län' },
  { kommun: 'Storfors', län: 'Västra Götalands län' },
  { kommun: 'Hammarö', län: 'Västra Götalands län' },
  { kommun: 'Munkfors', län: 'Västra Götalands län' },
  { kommun: 'Forshaga', län: 'Västra Götalands län' },
  { kommun: 'Grums', län: 'Västra Götalands län' },
  { kommun: 'Kil', län: 'Västra Götalands län' },
  { kommun: 'Eda', län: 'Västra Götalands län' },
  
  // Värmlands län
  { kommun: 'Karlstad', län: 'Värmlands län' },
  { kommun: 'Kristinehamn', län: 'Värmlands län' },
  { kommun: 'Arvika', län: 'Värmlands län' },
  { kommun: 'Säffle', län: 'Värmlands län' },
  { kommun: 'Filipstad', län: 'Värmlands län' },
  { kommun: 'Hagfors', län: 'Värmlands län' },
  { kommun: 'Torsby', län: 'Värmlands län' },
  { kommun: 'Sunne', län: 'Värmlands län' },
  { kommun: 'Årjäng', län: 'Värmlands län' },
  { kommun: 'Eda', län: 'Värmlands län' },
  { kommun: 'Storfors', län: 'Värmlands län' },
  { kommun: 'Hammarö', län: 'Värmlands län' },
  { kommun: 'Munkfors', län: 'Värmlands län' },
  { kommun: 'Forshaga', län: 'Värmlands län' },
  { kommun: 'Grums', län: 'Värmlands län' },
  { kommun: 'Kil', län: 'Värmlands län' },
  
  // Örebro län
  { kommun: 'Örebro', län: 'Örebro län' },
  { kommun: 'Karlskoga', län: 'Örebro län' },
  { kommun: 'Lindesberg', län: 'Örebro län' },
  { kommun: 'Kumla', län: 'Örebro län' },
  { kommun: 'Hallsberg', län: 'Örebro län' },
  { kommun: 'Degerfors', län: 'Örebro län' },
  { kommun: 'Hällefors', län: 'Örebro län' },
  { kommun: 'Ljusnarsberg', län: 'Örebro län' },
  { kommun: 'Nora', län: 'Örebro län' },
  { kommun: 'Askersund', län: 'Örebro län' },
  { kommun: 'Laxå', län: 'Örebro län' },
  
  // Västmanlands län
  { kommun: 'Västerås', län: 'Västmanlands län' },
  { kommun: 'Köping', län: 'Västmanlands län' },
  { kommun: 'Sala', län: 'Västmanlands län' },
  { kommun: 'Fagersta', län: 'Västmanlands län' },
  { kommun: 'Arboga', län: 'Västmanlands län' },
  { kommun: 'Kungsör', län: 'Västmanlands län' },
  { kommun: 'Hallstahammar', län: 'Västmanlands län' },
  { kommun: 'Norberg', län: 'Västmanlands län' },
  { kommun: 'Surahammar', län: 'Västmanlands län' },
  { kommun: 'Skinnskatteberg', län: 'Västmanlands län' },
  
  // Dalarnas län
  { kommun: 'Falun', län: 'Dalarnas län' },
  { kommun: 'Borlänge', län: 'Dalarnas län' },
  { kommun: 'Ludvika', län: 'Dalarnas län' },
  { kommun: 'Avesta', län: 'Dalarnas län' },
  { kommun: 'Hedemora', län: 'Dalarnas län' },
  { kommun: 'Säter', län: 'Dalarnas län' },
  { kommun: 'Mora', län: 'Dalarnas län' },
  { kommun: 'Orsa', län: 'Dalarnas län' },
  { kommun: 'Rättvik', län: 'Dalarnas län' },
  { kommun: 'Leksand', län: 'Dalarnas län' },
  { kommun: 'Gagnef', län: 'Dalarnas län' },
  { kommun: 'Malung-Sälen', län: 'Dalarnas län' },
  { kommun: 'Vansbro', län: 'Dalarnas län' },
  { kommun: 'Smedjebacken', län: 'Dalarnas län' },
  { kommun: 'Säfsnäs', län: 'Dalarnas län' },
  
  // Gävleborgs län
  { kommun: 'Gävle', län: 'Gävleborgs län' },
  { kommun: 'Sandviken', län: 'Gävleborgs län' },
  { kommun: 'Bollnäs', län: 'Gävleborgs län' },
  { kommun: 'Hudiksvall', län: 'Gävleborgs län' },
  { kommun: 'Ockelbo', län: 'Gävleborgs län' },
  { kommun: 'Ovanåker', län: 'Gävleborgs län' },
  { kommun: 'Nordanstig', län: 'Gävleborgs län' },
  { kommun: 'Ljusdal', län: 'Gävleborgs län' },
  { kommun: 'Hofors', län: 'Gävleborgs län' },
  { kommun: 'Söderhamn', län: 'Gävleborgs län' },
  
  // Västernorrlands län
  { kommun: 'Sundsvall', län: 'Västernorrlands län' },
  { kommun: 'Örnsköldsvik', län: 'Västernorrlands län' },
  { kommun: 'Härnösand', län: 'Västernorrlands län' },
  { kommun: 'Sollefteå', län: 'Västernorrlands län' },
  { kommun: 'Kramfors', län: 'Västernorrlands län' },
  { kommun: 'Ånge', län: 'Västernorrlands län' },
  { kommun: 'Timrå', län: 'Västernorrlands län' },
  { kommun: 'Höga Kusten', län: 'Västernorrlands län' },
  
  // Jämtlands län
  { kommun: 'Östersund', län: 'Jämtlands län' },
  { kommun: 'Strömsund', län: 'Jämtlands län' },
  { kommun: 'Krokom', län: 'Jämtlands län' },
  { kommun: 'Berg', län: 'Jämtlands län' },
  { kommun: 'Bräcke', län: 'Jämtlands län' },
  { kommun: 'Ragunda', län: 'Jämtlands län' },
  { kommun: 'Åre', län: 'Jämtlands län' },
  
  // Västerbottens län
  { kommun: 'Umeå', län: 'Västerbottens län' },
  { kommun: 'Skellefteå', län: 'Västerbottens län' },
  { kommun: 'Lycksele', län: 'Västerbottens län' },
  { kommun: 'Vilhelmina', län: 'Västerbottens län' },
  { kommun: 'Åsele', län: 'Västerbottens län' },
  { kommun: 'Dorotea', län: 'Västerbottens län' },
  { kommun: 'Vindeln', län: 'Västerbottens län' },
  { kommun: 'Robertsfors', län: 'Västerbottens län' },
  { kommun: 'Nordmaling', län: 'Västerbottens län' },
  { kommun: 'Bjurholm', län: 'Västerbottens län' },
  { kommun: 'Vännäs', län: 'Västerbottens län' },
  { kommun: 'Norsjö', län: 'Västerbottens län' },
  { kommun: 'Malå', län: 'Västerbottens län' },
  { kommun: 'Sorsele', län: 'Västerbottens län' },
  { kommun: 'Storuman', län: 'Västerbottens län' },
  
  // Norrbottens län
  { kommun: 'Luleå', län: 'Norrbottens län' },
  { kommun: 'Piteå', län: 'Norrbottens län' },
  { kommun: 'Boden', län: 'Norrbottens län' },
  { kommun: 'Haparanda', län: 'Norrbottens län' },
  { kommun: 'Kalix', län: 'Norrbottens län' },
  { kommun: 'Övertorneå', län: 'Norrbottens län' },
  { kommun: 'Överkalix', län: 'Norrbottens län' },
  { kommun: 'Gällivare', län: 'Norrbottens län' },
  { kommun: 'Jokkmokk', län: 'Norrbottens län' },
  { kommun: 'Arjeplog', län: 'Norrbottens län' },
  { kommun: 'Arvidsjaur', län: 'Norrbottens län' },
  { kommun: 'Älvsbyn', län: 'Norrbottens län' },
  { kommun: 'Älvsbyn', län: 'Norrbottens län' },
  { kommun: 'Pajala', län: 'Norrbottens län' },
];

// --- Bygg LOCATION_TREE från SWEDISH_LAN + SWEDISH_KOMMUNER (alla 21 län, alla kommuner) ---
function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/å/g, 'a')
    .replace(/ä/g, 'a')
    .replace(/ö/g, 'o')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');
}

function buildLocationTree(): LocationCounty[] {
  return SWEDISH_LAN.map((lan) => {
    const kommunerForLan = SWEDISH_KOMMUNER.filter((loc) => loc.län === lan);
    const uniqueKommuner = [...new Set(kommunerForLan.map((loc) => loc.kommun))].sort();
    const municipalities: LocationMunicipality[] = uniqueKommuner.map((kommun) => ({
      label: kommun,
      value: slugify(kommun),
      count: 0,
    }));
    return {
      label: lan,
      value: slugify(lan),
      count: 0,
      municipalities,
    };
  });
}

export const LOCATION_TREE: LocationCounty[] = buildLocationTree();

/** Resultat från RPC get_location_stats: location_value (t.ex. "Täby, Stockholms län") och count. */
export interface LocationStatRow {
  location_value: string
  count: number
}

/**
 * Slår ihop RPC-svar (location_value + count) med trädstrukturen.
 * location_value förväntas vara "Kommun, Län". Län = summa av underliggande kommuners count.
 */
export function mergeLocationCounts(
  tree: LocationCounty[],
  stats: LocationStatRow[]
): LocationCounty[] {
  const countyCounts = new Map<string, number>()
  const munCounts = new Map<string, Map<string, number>>()

  for (const county of tree) {
    countyCounts.set(county.value, 0)
    munCounts.set(county.value, new Map(county.municipalities.map((m) => [m.value, 0])))
  }

  for (const row of stats) {
    const s = row.location_value.trim()
    const commaIdx = s.indexOf(',')
    const kommunRaw = commaIdx >= 0 ? s.slice(0, commaIdx).trim() : ''
    const lanRaw = commaIdx >= 0 ? s.slice(commaIdx + 1).trim() : ''
    if (!kommunRaw || !lanRaw) continue

    // Klustra alla Stuvsta-närområden (Stuvsta, Vistaberg, Glömsta, Fullersta)
    // under samma kommunetikett i trädet: "Stuvsta".
    const canonicalKommun = mapAliasToCanonicalMunicipalityName(kommunRaw) ?? kommunRaw

    // Specialfall: "... , Huddinge" mappas till Stockholms län i trädet
    const lan = lanRaw === 'Huddinge' ? 'Stockholms län' : lanRaw

    const county = tree.find((c) => c.label === lan)
    if (!county) continue
    const munMap = munCounts.get(county.value)
    if (!munMap) continue
    const mun = county.municipalities.find((m) => m.label === canonicalKommun)
    if (!mun) continue

    const prev = munMap.get(mun.value) ?? 0
    munMap.set(mun.value, prev + row.count)
  }

  return tree.map((county) => {
    const munMap = munCounts.get(county.value)!
    let countySum = 0
    const municipalities = county.municipalities.map((m) => {
      const c = munMap.get(m.value) ?? 0
      countySum += c
      return { ...m, count: c }
    })
    return { ...county, count: countySum, municipalities }
  })
}

// Hjälpfunktioner
export function getKommunerByLan(lan: string): string[] {
  return SWEDISH_KOMMUNER
    .filter(loc => loc.län === lan)
    .map(loc => loc.kommun)
    .sort();
}

export function searchKommuner(query: string): SwedishLocation[] {
  const lowerQuery = query.toLowerCase().trim();
  if (!lowerQuery) return [];

  // Stuvsta-kluster: om användaren skriver något av alias-namnen (Stuvsta, Vistaberg,
  // Glömsta, Fullersta) vill vi visa alla dessa som separata förslag kopplade till Huddinge.
  if (isStuvstaAlias(lowerQuery)) {
    const base: SwedishLocation[] = [
      { kommun: 'Stuvsta', län: 'Huddinge' },
      { kommun: 'Vistaberg', län: 'Huddinge' },
      { kommun: 'Glömsta', län: 'Huddinge' },
      { kommun: 'Fullersta', län: 'Huddinge' },
    ]
    return base
  }

  return SWEDISH_KOMMUNER.filter(
    (loc) =>
      loc.kommun.toLowerCase().includes(lowerQuery) ||
      loc.län.toLowerCase().includes(lowerQuery)
  ).slice(0, 10) // Max 10 förslag
}

export function formatLocation(location: string): string {
  const trimmed = location.trim()

  // Specialfall: Stuvsta-klustret – annonsskapare kan skriva
  // "Stuvsta", "Vistaberg", "Glömsta", "Fullersta" och vi lagrar
  // respektive område separat med ", Huddinge".
  const stuvstaAliasFormatted = formatStuvstaAliasLocation(trimmed)
  if (stuvstaAliasFormatted) {
    return stuvstaAliasFormatted
  }

  // Om location redan är formaterad (t.ex. "Stockholm, Stockholms län"), returnera som den är
  if (location.includes(',')) return location;
  
  // Annars, hitta kommunen och formatera
  const found = SWEDISH_KOMMUNER.find(loc => 
    loc.kommun.toLowerCase() === location.toLowerCase()
  );
  
  if (found) {
    return `${found.kommun}, ${found.län}`;
  }
  
  return location;
}
