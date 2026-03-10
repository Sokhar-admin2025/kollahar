'use server'

import { supabaseAdmin } from '@/lib/supabase/admin'
import { Resend } from 'resend'
import MarketingMail1 from '@/app/emails/MarketingMail1'
import MarketingMail2 from '@/app/emails/MarketingMail2'
import MarketingMail3 from '@/app/emails/MarketingMail3'

const RESEND_API_KEY = (process.env.RESEND_API_KEY || '').trim()
const resend = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null

const FROM_EMAIL = 'kollahär! <noreply@kollahar.se>'
const REPLY_TO = 'hej@kollahar.se'
const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://kollahar.se'
const SIGNUP_URL = `${BASE_URL}/login?tab=signup`

/** 3 dagar i millisekunder – minsta intervall innan nästa steg i serien */
const DAYS_MS = 24 * 60 * 60 * 1000
const STEP_INTERVAL_DAYS = 3

export type ProcessMarketingQueueResult = {
  success: boolean
  sent: number
  failed: number
  skipped: number
  errors: string[]
}

/**
 * Processar marketing-kön: Mail 1 (step 0), Mail 2 (step 1 efter 3 dagar), Mail 3 (step 2 efter 3 dagar).
 * Uppdaterar current_step och last_sent_at efter varje skickat mejl.
 * Leads med status === 'onboarded' skippas – inga fler marknadsföringsmejl skickas till dem.
 * Vid fel för en adress loggas det och kön fortsätter.
 */
export async function processMarketingQueue(): Promise<ProcessMarketingQueueResult> {
  const result: ProcessMarketingQueueResult = {
    success: true,
    sent: 0,
    failed: 0,
    skipped: 0,
    errors: [],
  }

  if (!supabaseAdmin) {
    result.success = false
    result.errors.push('Supabase admin-klient saknas (SUPABASE_SERVICE_ROLE_KEY).')
    return result
  }

  if (!resend) {
    result.success = false
    result.errors.push('Resend är inte konfigurerad (RESEND_API_KEY).')
    return result
  }

  const { data: rows, error: fetchError } = await supabaseAdmin
    .from('marketing_leads')
    .select('id, email, company_name, contact_name, status, current_step, last_sent_at')

  if (fetchError) {
    result.success = false
    result.errors.push(`Hämtning av marketing_leads misslyckades: ${fetchError.message}`)
    return result
  }

  const leads = rows ?? []

  for (const lead of leads) {
    if (lead.status === 'onboarded') continue
    if (lead.status !== 'active') continue

    if (lead.current_step === 0) {
      const subject =
        lead.contact_name?.trim()
          ? `17 minuter är för långsamt, ${lead.contact_name.trim()}.`
          : '17 minuter är för långsamt.'

      const { error: sendError } = await resend.emails.send({
        from: FROM_EMAIL,
        replyTo: REPLY_TO,
        to: [lead.email],
        subject,
        react: (
          <MarketingMail1
            contactName={lead.contact_name ?? null}
            companyName={lead.company_name ?? null}
            signupUrl={SIGNUP_URL}
            imageUrl="https://wyumdbrvpphmjbmfdphj.supabase.co/storage/v1/object/public/Marketing/dashboard-preview.png"
          />
        ),
      })

      if (sendError) {
        result.failed += 1
        const msg = `${lead.email}: ${sendError.message}`
        result.errors.push(msg)
        console.error('[marketing] Mail 1 send failed:', msg)
        continue
      }

      const { error: updateError } = await supabaseAdmin
        .from('marketing_leads')
        .update({
          current_step: 1,
          last_sent_at: new Date().toISOString(),
        })
        .eq('id', lead.id)

      if (updateError) {
        result.failed += 1
        result.errors.push(`${lead.email}: kunde inte uppdatera steg – ${updateError.message}`)
        console.error('[marketing] Update after send failed:', lead.email, updateError)
        continue
      }

      result.sent += 1
      continue
    }

    const intervalMs = STEP_INTERVAL_DAYS * DAYS_MS
    const lastSentAt = lead.last_sent_at ? new Date(lead.last_sent_at).getTime() : 0
    const readyForNextStep = lastSentAt > 0 && Date.now() - lastSentAt >= intervalMs

    if (lead.current_step === 1 && readyForNextStep) {
      const subject = 'Sluta gissa – börja svara tillsammans'
      const { error: sendError } = await resend.emails.send({
        from: FROM_EMAIL,
        replyTo: REPLY_TO,
        to: [lead.email],
        subject,
        react: (
          <MarketingMail2
            contactName={lead.contact_name ?? null}
            companyName={lead.company_name ?? null}
            signupUrl={SIGNUP_URL}
            imageUrl="https://wyumdbrvpphmjbmfdphj.supabase.co/storage/v1/object/public/Marketing/Dealer-inventory-settings.png"
          />
        ),
      })
      if (sendError) {
        result.failed += 1
        result.errors.push(`${lead.email}: ${sendError.message}`)
        console.error('[marketing] Mail 2 send failed:', lead.email, sendError.message)
        continue
      }
      const { error: updateError } = await supabaseAdmin
        .from('marketing_leads')
        .update({ current_step: 2, last_sent_at: new Date().toISOString() })
        .eq('id', lead.id)
      if (updateError) {
        result.failed += 1
        result.errors.push(`${lead.email}: kunde inte uppdatera steg – ${updateError.message}`)
        continue
      }
      result.sent += 1
      continue
    }

    if (lead.current_step === 2 && readyForNextStep) {
      const subject = 'Vi bygger bryggan till framtiden'
      const { error: sendError } = await resend.emails.send({
        from: FROM_EMAIL,
        replyTo: REPLY_TO,
        to: [lead.email],
        subject,
        react: (
          <MarketingMail3
            contactName={lead.contact_name ?? null}
            companyName={lead.company_name ?? null}
            signupUrl={SIGNUP_URL}
            imageUrl1="https://wyumdbrvpphmjbmfdphj.supabase.co/storage/v1/object/public/Marketing/Seller_view_001.png"
            imageUrl2="https://wyumdbrvpphmjbmfdphj.supabase.co/storage/v1/object/public/Marketing/Seller_view_002.png"
          />
        ),
      })
      if (sendError) {
        result.failed += 1
        result.errors.push(`${lead.email}: ${sendError.message}`)
        console.error('[marketing] Mail 3 send failed:', lead.email, sendError.message)
        continue
      }
      const { error: updateError } = await supabaseAdmin
        .from('marketing_leads')
        .update({ current_step: 3, last_sent_at: new Date().toISOString() })
        .eq('id', lead.id)
      if (updateError) {
        result.failed += 1
        result.errors.push(`${lead.email}: kunde inte uppdatera steg – ${updateError.message}`)
        continue
      }
      result.sent += 1
      continue
    }

    result.skipped += 1
  }

  return result
}
