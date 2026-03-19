import { NextRequest, NextResponse } from 'next/server'

/**
 * Cron: Påminnelse till company-konton med ofullständig handlarprofil.
 *
 * Schema: en gång per dag (t.ex. "0 9 * * *" i vercel.json för sokhar-bilar).
 * Kräver: Authorization: Bearer <CRON_SECRET> i request-headern.
 *
 * Logik (ej implementerad):
 * 1. Verifiera CRON_SECRET.
 * 2. Hämta alla profiles där:
 *    - account_type = 'company'
 *    - organization_id IS NOT NULL
 *    - profile_completed IS NOT TRUE          (kräver migration: profiles.profile_completed)
 *    - reminder_count < 3 ELLER reminder_count IS NULL  (kräver migration: profiles.reminder_count)
 * 3. För varje profil: hämta tillhörande organizations.name.
 *    Om name IS NULL eller tom → skicka påminnelse-e-post via Resend.
 * 4. Öka profiles.reminder_count med 1 per skickad påminnelse.
 * 5. Logga antal skickade påminnelser i svaret.
 *
 * Beroenden som saknas och kräver migrationer innan implementering:
 * - profiles.profile_completed (boolean, default false)
 * - profiles.reminder_count    (int, default 0)
 * - organizations.address      (text, nullable)
 * - organizations.city         (text, nullable)
 */

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // TODO: implementera logiken beskriven ovan
  return NextResponse.json({ message: 'Not implemented' }, { status: 501 })
}
