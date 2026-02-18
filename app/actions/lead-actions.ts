'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { getListingById } from '@/lib/features/listings/listing-service'
import { createLead } from '@/lib/features/leads/lead-service'
import { sendLeadEmailToDealer } from '@/lib/email/resend'
import { formatCurrency } from '@/lib/features/listings/utils/price-utils'
import { logAnalyticsEvent } from '@/lib/features/analytics/analytics-service'

export type SubmitLeadCardResult = { success: true } | { success: false; error: string }

export async function submitLeadCardAction(
  conversationId: string,
  buyerName: string,
  buyerPhone: string
): Promise<SubmitLeadCardResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: 'Du måste vara inloggad.' }
  }

  if (!buyerName?.trim() || !buyerPhone?.trim()) {
    return { success: false, error: 'Fyll i namn och telefonnummer.' }
  }

  try {
    const { data: conv, error: convError } = await supabase
      .from('conversations')
      .select('id, listing_id, buyer_id, seller_id')
      .eq('id', conversationId)
      .single()

    if (convError || !conv) {
      return { success: false, error: 'Konversationen hittades inte.' }
    }

    if ((conv as { buyer_id: string }).buyer_id !== user.id) {
      return { success: false, error: 'Du kan endast skicka lead för egna konversationer.' }
    }

    const sellerId = (conv as { seller_id: string }).seller_id
    const listingId = (conv as { listing_id: string }).listing_id

    const leadResult = await createLead({
      conversationId,
      listingId,
      buyerName: buyerName.trim(),
      buyerPhone: buyerPhone.trim(),
    })

    if (!leadResult.success) {
      return { success: false, error: leadResult.error ?? 'Kunde inte spara lead.' }
    }

    logAnalyticsEvent(listingId, 'lead_start')

    const listingResult = await getListingById(listingId)
    if (!listingResult.success || !listingResult.data) {
      console.error('getListingById failed for lead email:', listingResult.error)
    }

    const attrs = listingResult.data?.attributes ?? {}
    const year = typeof attrs.year === 'number' ? String(attrs.year) : (attrs.year as string) ?? null
    const model = typeof attrs.model === 'string' ? attrs.model : null
    const price = listingResult.data?.bortskankes
      ? 'Bortskänkes'
      : listingResult.data
        ? formatCurrency(listingResult.data.price)
        : '–'

    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null) ||
      'https://kollahar.se'
    const listingUrl = `${baseUrl}/annons/${listingId}`

    let dealerEmail: string | null = null
    if (supabaseAdmin) {
      const { data: dealerUser } = await supabaseAdmin.auth.admin.getUserById(sellerId)
      dealerEmail = dealerUser?.user?.email ?? null
    }

    if (dealerEmail) {
      const emailResult = await sendLeadEmailToDealer({
        to: dealerEmail,
        buyerName: buyerName.trim(),
        buyerPhone: buyerPhone.trim(),
        listingTitle: listingResult.data?.title ?? 'Okänd annons',
        listingUrl,
        price,
        year,
        model,
      })
      if (!emailResult.success) {
        console.error('Lead email failed:', emailResult.error)
      }
    } else {
      console.warn('[lead] Kunde inte hämta dealer e-post för seller_id:', sellerId)
    }

    revalidatePath('/dashboard/messages')
    return { success: true }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Ett oväntat fel uppstod.'
    console.error('submitLeadCardAction error', err)
    return { success: false, error: msg }
  }
}

export type GetLeadExistsResult = { exists: boolean } | { error: string }

export async function getLeadExistsAction(
  conversationId: string
): Promise<GetLeadExistsResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { exists: false }
  }

  try {
    const { data } = await supabase
      .from('leads')
      .select('id')
      .eq('conversation_id', conversationId)
      .maybeSingle()

    return { exists: !!data }
  } catch (err) {
    console.error('getLeadExistsAction error', err)
    return { error: 'Kunde inte kontrollera lead.' }
  }
}
