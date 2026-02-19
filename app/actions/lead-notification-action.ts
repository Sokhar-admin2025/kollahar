'use server'

import { supabaseAdmin } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { sendLeadNotification } from '@/lib/email/lead-notification'
import { createLead } from '@/lib/features/leads/lead-service'

const BASE_URL =
  process.env.NEXT_PUBLIC_APP_URL ||
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null) ||
  'https://kollahar.se'

/**
 * Trigger lead notification – anropas vid lead-kort OCH första meddelandet.
 * Recipient: contact_email om satt, annars ägarens e-post.
 * CC: Ägaren om contact_email används och skiljer sig.
 * Vid lead_card: skapar alltid lead-poster i leads-tabellen innan e-post skickas.
 */
export async function triggerLeadNotification(params: {
  type: 'lead_card' | 'first_message'
  conversationId: string
  listingId: string
  buyerName: string
  buyerPhone?: string
  messageContent?: string
}): Promise<void> {
  try {
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
    const contactName = (listing as { contact_name?: string | null }).contact_name?.trim() || null
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
