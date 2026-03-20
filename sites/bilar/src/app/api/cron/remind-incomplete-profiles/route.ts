import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../../lib/supabase/admin'
import { sendIncompleteProfileReminder } from '../../../../lib/email/remind-incomplete-profile'

/**
 * Cron: Påminnelse till company-konton med ofullständig handlarprofil.
 *
 * Schema: "0 9 * * *" (kl 09:00 varje dag) — konfigurerat i vercel.json.
 * Kräver: Authorization: Bearer <CRON_SECRET>
 */

const MAX_REMINDERS = 3
const GRACE_PERIOD_MS = 60 * 60 * 1000 // 1 timme

export async function GET(request: NextRequest) {
  // ── Auth ───────────────────────────────────────────────────────────────────
  const authHeader = request.headers.get('authorization')
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Databasanslutning saknas.' }, { status: 500 })
  }

  // ── Hämta ofullständiga profiler ───────────────────────────────────────────
  const graceCutoff = new Date(Date.now() - GRACE_PERIOD_MS).toISOString()

  const { data: profiles, error: fetchError } = await supabaseAdmin
    .from('profiles')
    .select('id, email, reminder_count')
    .eq('account_type', 'company')
    .eq('profile_completed', false)
    .lt('reminder_count', MAX_REMINDERS)
    .lt('created_at', graceCutoff)

  if (fetchError) {
    console.error('[cron/remind-incomplete-profiles] Hämtningsfel:', fetchError)
    return NextResponse.json({ error: 'Databasfel.' }, { status: 500 })
  }

  if (!profiles || profiles.length === 0) {
    return NextResponse.json({ sent: 0, message: 'Inga profiler att påminna.' })
  }

  // ── Skicka påminnelser ─────────────────────────────────────────────────────
  let sent = 0
  let failed = 0

  for (const profile of profiles) {
    const email = profile.email as string | null
    if (!email) continue

    const currentCount = (profile.reminder_count as number) ?? 0
    const nextCount = currentCount + 1

    const result = await sendIncompleteProfileReminder({
      to: email,
      reminderCount: nextCount,
    })

    if (!result.success) {
      failed++
      continue
    }

    // Öka reminder_count
    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({ reminder_count: nextCount })
      .eq('id', profile.id)

    if (updateError) {
      console.error(
        `[cron/remind-incomplete-profiles] Kunde inte uppdatera reminder_count för ${profile.id}:`,
        updateError
      )
      failed++
    } else {
      sent++
    }
  }

  console.log(`[cron/remind-incomplete-profiles] Klart — skickade: ${sent}, misslyckades: ${failed}`)

  return NextResponse.json({
    sent,
    failed,
    total: profiles.length,
  })
}
