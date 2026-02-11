/**
 * Genererar en kort felkod som användare kan ange vid felrapportering.
 * Utvecklare/PO kan söka på koden i loggar för att hitta full felinformation.
 */
export function createErrorRef(): string {
  return 'E' + Math.random().toString(36).slice(2, 8).toUpperCase()
}

/**
 * Formaterar ett användarvänligt felmeddelande med felkod.
 * Loggar även felet med ref för sökning i loggar.
 */
export function withErrorRef(
  userMessage: string,
  error: unknown,
  ref = createErrorRef()
): string {
  console.error(`[${ref}]`, error)
  return `${userMessage} (Felkod: ${ref})`
}
