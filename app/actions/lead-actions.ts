'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createLead } from '@/lib/features/leads/lead-service'
import { triggerLeadNotification } from '@/app/actions/lead-notification-action'
import { logAnalyticsEvent } from '@/lib/features/analytics/analytics-service'
import type { LeadStatus } from '@/lib/features/dealer/dealer-analytics-service'

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
    const listingId = (conv as { listing_id?: string | null }).listing_id
    if (!listingId) {
      return { success: false, error: 'Lead kan inte skapas utan kopplad annons.' }
    }

    const leadResult = await createLead({
      conversationId,
      listingId,
      sellerId,
      buyerId: user.id,
      buyerName: buyerName.trim(),
      buyerEmail: user.email ?? null,
      buyerPhone: buyerPhone.trim(),
    })

    if (!leadResult.success) {
      return { success: false, error: leadResult.error ?? 'Kunde inte spara lead.' }
    }

    logAnalyticsEvent(listingId, 'lead_start')

    const buyerProfile = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', user.id)
      .maybeSingle()
    const buyerNameForEmail = (buyerProfile.data as { full_name?: string } | null)?.full_name?.trim() || buyerName.trim()

    await triggerLeadNotification({
      type: 'lead_card',
      conversationId,
      listingId,
      buyerName: buyerNameForEmail,
      buyerPhone: buyerPhone.trim(),
    })

    revalidatePath('/dashboard/messages')
    return { success: true }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Ett oväntat fel uppstod.'
    console.error('submitLeadCardAction error', err)
    return { success: false, error: msg }
  }
}

export type UpdateLeadStatusResult = { success: true } | { success: false; error: string }

export async function updateLeadStatusAction(
  leadId: string,
  status: LeadStatus
): Promise<UpdateLeadStatusResult> {
  const allowedStatuses: LeadStatus[] = ['new', 'contacted', 'qualified', 'sold', 'archived']
  if (!allowedStatuses.includes(status)) {
    return { success: false, error: 'Ogiltig lead-status.' }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: 'Du måste vara inloggad.' }
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id')
    .eq('id', user.id)
    .single()

  const organizationId =
    (profile as { organization_id?: string | null } | null)?.organization_id ?? user.id

  const { error } = await supabase
    .from('leads')
    .update({ status })
    .eq('id', leadId)
    .eq('organization_id', organizationId)

  if (error) {
    return { success: false, error: 'Kunde inte uppdatera lead-status.' }
  }

  revalidatePath('/dashboard/dealer')
  return { success: true }
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
