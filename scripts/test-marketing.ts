/**
 * Engångstest av marketing-kön. Kör från projektroten.
 * Kommando: npx tsx scripts/test-marketing.ts
 *
 * (För att ladda .env.local används scripts/load-env.ts som första import.)
 */
import '@/scripts/load-env'
import { processMarketingQueue } from '@/app/actions/marketing-actions'

async function main() {
  console.log('Kör marketing-kö...')
  const result = await processMarketingQueue()
  console.log('Resultat:', {
    success: result.success,
    skickade: result.sent,
    misslyckade: result.failed,
    överskippade: result.skipped,
  })
  if (result.errors.length > 0) {
    console.log('Fel:', result.errors)
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
