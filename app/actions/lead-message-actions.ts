'use server'

import { createClient } from '@/lib/supabase/server'
import type { LeadMessage, LeadMessageRole } from '@/lib/features/leados/leados-lead-messages-service'
import { addLeadMessage, getLeadMessagesForLead } from '@/lib/features/leados/leados-lead-messages-service'

export type AddLeadMessageResult = { success: true } | { success: false; error: string }

/**
 * Server action för interna LeadOS-meddelanden (lead_messages).
 * Endast för interna vyer (Seller/Dealer). Får aldrig användas i kundflöden eller publika routes.
 */
export async function addLeadMessageAction(
  leadId: string,
  role: LeadMessageRole,
  content: string
): Promise<AddLeadMessageResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: 'Du måste vara inloggad.' }
  }

  const trimmed = content.trim()
  if (!trimmed) {
    return { success: false, error: 'Skriv något i meddelandet.' }
  }
  if (trimmed.length > 4000) {
    return { success: false, error: 'Meddelandet är för långt.' }
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, organization_id')
    .eq('id', user.id)
    .single()

  if (profileError || !profile) {
    console.error('[lead-messages] addLeadMessageAction profile error', {
      userId: user.id,
      code: profileError?.code,
      message: profileError?.message,
    })
    return { success: false, error: 'Kunde inte hämta profil.' }
  }

  const userOrgId = (profile as { organization_id?: string | null }).organization_id
  if (!userOrgId) {
    return {
      success: false,
      error: 'Endast användare kopplade till en organisation kan skriva interna meddelanden.',
    }
  }

  const result = await addLeadMessage({
    leadId,
    authorProfileId: (profile as { id: string }).id,
    role,
    content: trimmed,
  })

  if (!result.success) {
    return { success: false, error: result.error ?? 'Kunde inte spara meddelande.' }
  }

  return { success: true }
}

/**
 * Server action för att läsa interna LeadOS-meddelanden för ett lead.
 * Endast för interna vyer (Seller/Dealer). Får aldrig användas i kundflöden eller publika routes.
 */
export async function getLeadMessagesForLeadAction(
  leadId: string
): Promise<{ success: boolean; data?: LeadMessage[]; error?: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: 'Du måste vara inloggad.' }
  }

  try {
    const messages = await getLeadMessagesForLead(leadId, user.id)
    return { success: true, data: messages }
  } catch (err) {
    console.error('[lead-messages] getLeadMessagesForLeadAction error', {
      leadId,
      userId: user.id,
      error: err instanceof Error ? err.message : String(err),
    })
    return { success: false, error: 'Kunde inte hämta interna meddelanden.' }
  }
}

