/**
 * Parser för utrustningssträngar (t.ex. från CSV/XML-import).
 * Delar upp sammanhängande text som "Adaptiv farthållare (ACC)Keyless Entry & Start"
 * till separata poster: ["Adaptiv farthållare (ACC)", "Keyless Entry & Start", ...]
 *
 * Heuristik: bryt vid camelCase-gränser, efter ), före tal med %.
 */

/**
 * Delar upp en utrustningssträng till en lista av enskilda poster.
 * Hanterar text utan mellanslag mellan poster (t.ex. från XML/CSV).
 */
export function parseEquipmentList(raw: string): string[] {
  if (!raw?.trim()) return []

  let text = raw.trim()

  // Om redan kommaseparerat eller radbrytet, använd det
  const hasDelimiters = /[,;\n]/.test(text)
  if (hasDelimiters) {
    const parts = text
      .split(/[,;\n]+/)
      .map((p) => p.trim())
      .filter(Boolean)
    if (parts.length > 1) return parts
  }

  // Heuristik för sammanhängande text:
  // 1. Bryt efter ")" följt av stor bokstav eller siffra
  // 2. Bryt vid camelCase: liten bokstav + stor bokstav (t.ex. StartElstol)
  // 3. Bryt vid "Läder" följt av stor bokstav (t.ex. LäderKlädsel)
  const splitRegex =
    /(?<=[a-zåäö\)])(?=[A-ZÅÄÖ])|(?<=\))(?=\d)|(?<=[\d%])\s+(?=[A-ZÅÄÖ])/g

  const parts = text
    .split(splitRegex)
    .map((p) => p.trim())
    .filter((p) => p.length > 1)

  // Slå ihop uppenbara felaktiga delningar (t.ex. "Entry & Start" som delats)
  const result: string[] = []
  for (const p of parts) {
    const last = result[result.length - 1]
    // Om föregående slutar med "&" eller "(" och nuvarande är kort, slå ihop
    if (last && (last.endsWith('&') || last.endsWith('(')) && p.length < 20) {
      result[result.length - 1] = last + p
    } else if (last && last.length < 4 && p.length < 15) {
      // Korta fragment – slå ihop med föregående
      result[result.length - 1] = last + p
    } else {
      result.push(p)
    }
  }

  return result.filter((s) => s.length >= 2)
}

/**
 * Extraherar "Utrustning: ..." från en beskrivning och returnerar
 * både beskrivning utan utrustning och parsad utrustningslista.
 */
export function extractEquipmentFromDescription(description: string): {
  descriptionWithoutEquipment: string
  equipment: string[]
} {
  if (!description?.trim()) {
    return { descriptionWithoutEquipment: '', equipment: [] }
  }

  const match = description.match(/\n\s*Utrustning:\s*([\s\S]+)$/i)
  if (!match) {
    return { descriptionWithoutEquipment: description.trim(), equipment: [] }
  }

  const equipmentRaw = match[1].trim()
  const equipment = parseEquipmentList(equipmentRaw)
  const descriptionWithoutEquipment = description
    .replace(/\n\s*Utrustning:[\s\S]*$/, '')
    .trim()

  return { descriptionWithoutEquipment, equipment }
}
