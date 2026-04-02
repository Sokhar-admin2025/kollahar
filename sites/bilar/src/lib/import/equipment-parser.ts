/**
 * Parser för utrustningssträngar (t.ex. från CSV-import).
 * Portad från Main — identisk logik.
 */

export function parseEquipmentList(raw: string): string[] {
  if (!raw?.trim()) return []

  const text = raw.trim()

  const hasDelimiters = /[,;\n]/.test(text)
  if (hasDelimiters) {
    const parts = text
      .split(/[,;\n]+/)
      .map((p) => p.trim())
      .filter(Boolean)
    if (parts.length > 1) return parts
  }

  const splitRegex =
    /(?<=[a-zåäö\)])(?=[A-ZÅÄÖ])|(?<=\))(?=\d)|(?<=[\d%])\s+(?=[A-ZÅÄÖ])/g

  const parts = text
    .split(splitRegex)
    .map((p) => p.trim())
    .filter((p) => p.length > 1)

  const result: string[] = []
  for (const p of parts) {
    const last = result[result.length - 1]
    if (last && (last.endsWith('&') || last.endsWith('(')) && p.length < 20) {
      result[result.length - 1] = last + p
    } else if (last && last.length < 4 && p.length < 15) {
      result[result.length - 1] = last + p
    } else {
      result.push(p)
    }
  }

  return result.filter((s) => s.length >= 2)
}
