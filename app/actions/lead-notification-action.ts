'use server'

import { supabaseAdmin } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { sendLeadNotification } from '@/lib/email/lead-notification'
import { sendLeadSlaWarningEmail } from '@/lib/email/resend'
import { createLead } from '@/lib/features/leads/lead-service'
import { SLA_MS } from '@/lib/features/leados/leados-metrics'

const BASE_URL =
  process.env.NEXT_PUBLIC_APP_URL ||
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null) ||
  'https://kollahar.se'

export type TriggerLeadNotificationParams =
  | {
      type: 'lead_card' | 'first_message' | 'new_lead'
      conversationId: string
      listingId: string
      buyerName: string
      buyerPhone?: string
      messageContent?: string
    }
  | {
      type: 'sla_warning'
      leadId: string
      organizationId: string
      assignedToProfileId: string
    }

/**
 * Trigger lead notification – anropas vid lead-kort, första meddelandet, eller SLA-varning.
 * Recipient: contact_email om satt, annars ägarens e-post (chat); för sla_warning: tilldelad säljares e-post.
 */
export async function triggerLeadNotification(
  params: TriggerLeadNotificationParams
): Promise<void> {
  try {
    if (params.type === 'sla_warning') {
      if (!supabaseAdmin) {
        console.warn('[lead-notification] supabaseAdmin saknas – SLA-varning skickas inte')
        return
      }
      const { data: lead } = await supabaseAdmin
        .from('leads')
        .select(
          'id, buyer_name, buyer_phone, created_at, organization_id, assigned_to, listing:listings(title)'
        )
        .eq('id', params.leadId)
        .eq('organization_id', params.organizationId)
        .eq('assigned_to', params.assignedToProfileId)
        .single()

      if (!lead) {
        console.warn('[lead-notification] Lead not found for SLA warning:', params.leadId)
        return
      }

      const listingTitle =
        (lead as { listing?: { title?: string | null } | null })?.listing?.title?.trim() ||
        'Okänd annons'
      const buyerName = (lead as { buyer_name: string }).buyer_name
      const buyerPhone = (lead as { buyer_phone: string }).buyer_phone
      const createdAt = (lead as { created_at: string }).created_at

      const { data: assigneeUser } = await supabaseAdmin.auth.admin.getUserById(
        params.assignedToProfileId
      )
      const toEmail = assigneeUser?.user?.email ?? null
      if (!toEmail) {
        console.warn('[lead-notification] No email for assignee:', params.assignedToProfileId)
        return
      }

      const deadlineMs = new Date(createdAt).getTime() + SLA_MS
      const nowMs = Date.now()
      const minutesLeft = Math.max(0, (deadlineMs - nowMs) / (60 * 1000))
      const leadUrl = `${BASE_URL}/dashboard/seller/leads/${params.leadId}`

      const result = await sendLeadSlaWarningEmail({
        to: toEmail,
        buyerName,
        buyerPhone,
        listingTitle,
        leadUrl,
        minutesLeft,
        createdAt: new Date(createdAt).toLocaleString('sv-SE'),
      })
      if (!result.success) {
        console.error('[lead-notification] SLA warning email failed:', result.error)
      }
      return
    }

    const supabase = await createClient()

    const { data: listing } = await supabase
      .from('listings')
      .select('id, title, user_id, contact_email, contact_name')
      .eq('id', params.listingId)
      .single()

    if (!listing) {
      console.warn('[lead-notification] Listing not found:', params.listingId)
      return
    }

    const ownerId = (listing as { user_id: string }).user_id
    const contactEmail = (listing as { contact_email?: string | null }).contact_email?.trim() || null
    const listingTitle = (listing as { title: string }).title ?? 'Okänd annons'

    let ownerEmail: string | null = null
    if (supabaseAdmin) {
      const { data: ownerUser } = await supabaseAdmin.auth.admin.getUserById(ownerId)
      ownerEmail = ownerUser?.user?.email ?? null
    }

    if (!ownerEmail) {
      console.warn('[lead-notification] Could not get owner email for:', ownerId)
      return
    }

    const toEmail = contactEmail || ownerEmail
    const ccEmails: string[] = []
    if (contactEmail && contactEmail !== ownerEmail) {
      ccEmails.push(ownerEmail)
    }

    let claimAccountUrl: string | null = null
    if (contactEmail) {
      claimAccountUrl = `${BASE_URL}/login?tab=signup&email=${encodeURIComponent(contactEmail)}&org=${ownerId}`
    }

    // Vid lead_card: säkerställ att lead-posten finns i leads (krävs för Dealer Command Center)
    if (params.type === 'lead_card') {
      const { data: conv } = await supabase
        .from('conversations')
        .select('buyer_id')
        .eq('id', params.conversationId)
        .single()
      const buyerId = (conv as { buyer_id: string } | null)?.buyer_id
      if (buyerId && params.buyerPhone) {
        await createLead({
          conversationId: params.conversationId,
          listingId: params.listingId,
          sellerId: ownerId,
          buyerId,
          buyerName: params.buyerName,
          buyerPhone: params.buyerPhone,
        })
        // Ignorera fel vid duplicate (record finns redan från submitLeadCardAction)
      }
    }

    const result = await sendLeadNotification({
      to: toEmail,
      cc: ccEmails.length > 0 ? ccEmails : undefined,
      type: params.type,
      conversationId: params.conversationId,
      listingTitle,
      buyerName: params.buyerName,
      buyerPhone: params.buyerPhone,
      messageContent: params.messageContent,
      claimAccountUrl,
    })

    if (!result.success) {
      console.error('[lead-notification] Failed:', result.error)
    }
  } catch (err) {
    console.error('[lead-notification] Exception:', err)
  }
}
