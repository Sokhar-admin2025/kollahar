import { createClient } from '@/lib/supabase/server'

/**
 * LeadOS intern meddelandehantering (lead_messages).
 * Endast för interna LeadOS-vyer (Seller/Dealer). Får aldrig användas i kundflöden eller publika routes.
 */

export type LeadMessageRole = 'seller' | 'owner' | 'system'

export interface LeadMessage {
  id: string
  created_at: string
  lead_id: string
  organization_id: string
  author_profile_id: string
  role: LeadMessageRole
  content: string
}

export async function getLeadMessagesForLead(
  leadId: string,
  currentUserId: string
): Promise<LeadMessage[]> {
  const supabase = await createClient()

  // Kontrollera att användaren får se detta lead (samma organization_id)
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, organization_id')
    .eq('id', currentUserId)
    .maybeSingle()

  if (profileError || !profile) {
    console.error('[lead-messages] failed to load profile for user', profileError?.message)
    return []
  }

  const organizationId = (profile as { organization_id?: string | null }).organization_id
  if (!organizationId) {
    // Ingen organisation kopplad -> inga interna lead-meddelanden
    return []
  }

  const { data: leadRow, error: leadError } = await supabase
    .from('leads')
    .select('id, organization_id')
    .eq('id', leadId)
    .maybeSingle()

  if (leadError) {
    console.error('[lead-messages] failed to load lead for messages', leadError.message)
    return []
  }

  if (!leadRow || (leadRow as { organization_id?: string | null }).organization_id !== organizationId) {
    // Lead finns inte eller tillhör annan organisation -> ingen access
    return []
  }

  const { data, error } = await supabase
    .from('lead_messages')
    .select('*')
    .eq('lead_id', leadId)
    .order('created_at', { ascending: true })

  if (error) {
    console.error('[lead-messages] failed to load messages', error.message)
    return []
  }

  return (data as LeadMessage[]) ?? []
}

export async function addLeadMessage(params: {
  leadId: string
  authorProfileId: string
  role: LeadMessageRole
  content: string
}): Promise<{ success: boolean; error?: string }> {
  const maxLength = 4000
  const content = params.content?.trim() ?? ''

  if (!content) {
    return { success: false, error: 'Meddelandet kan inte vara tomt.' }
  }
  if (content.length > maxLength) {
    return { success: false, error: 'Meddelandet är för långt.' }
  }

  const supabase = await createClient()

  // Hämta lead + profil för att säkerställa att de delar organization_id
  const [{ data: leadRow, error: leadError }, { data: profileRow, error: profileError }] =
    await Promise.all([
      supabase
        .from('leads')
        .select('id, organization_id, assigned_to')
        .eq('id', params.leadId)
        .maybeSingle(),
      supabase
        .from('profiles')
        .select('id, organization_id')
        .eq('id', params.authorProfileId)
        .maybeSingle(),
    ])

  if (leadError || !leadRow) {
    console.error('[lead-messages] failed to load lead before insert', leadError?.message)
    return { success: false, error: 'Leadet kunde inte hittas.' }
  }

  if (profileError || !profileRow) {
    console.error(
      '[lead-messages] failed to load author profile before insert',
      profileError?.message
    )
    return { success: false, error: 'Profilen kunde inte hämtas.' }
  }

  const leadOrgId = (leadRow as { organization_id?: string | null }).organization_id
  const leadAssignedTo = (leadRow as { assigned_to?: string | null }).assigned_to
  const authorOrgId = (profileRow as { organization_id?: string | null }).organization_id

  if (!leadOrgId || !authorOrgId || leadOrgId !== authorOrgId) {
    return {
      success: false,
      error: 'Du kan bara skriva interna meddelanden för leads i din egen organisation.',
    }
  }

  try {
    const { error } = await supabase.from('lead_messages').insert({
      lead_id: params.leadId,
      author_profile_id: params.authorProfileId,
      role: params.role,
      content,
    })

    if (error) {
      console.error('[lead-messages] insert failed', error.message)
      return { success: false, error: 'Kunde inte spara meddelandet.' }
    }

    // Auto-assign vid första interna svar (seller/owner)
    const shouldAutoAssign =
      !leadAssignedTo && (params.role === 'seller' || params.role === 'owner')

    if (shouldAutoAssign && leadOrgId) {
      // 1) Uppdatera lead.assigned_to
      const { error: assignError } = await supabase
        .from('leads')
        .update({ assigned_to: params.authorProfileId })
        .eq('id', params.leadId)
        .eq('organization_id', leadOrgId)

      if (assignError) {
        console.error('[lead-messages] auto-assign failed', assignError.message)
      } else {
        // 2) Skapa systemmeddelande som loggar auto-assign
        const { error: systemMsgError } = await supabase.from('lead_messages').insert({
          lead_id: params.leadId,
          author_profile_id: params.authorProfileId,
          role: 'system',
          content: 'Lead auto-tilldelad till dig vid första interna svar.',
        })

        if (systemMsgError) {
          console.error(
            '[lead-messages] system message for auto-assign failed',
            systemMsgError.message
          )
        }
      }
    }

    return { success: true }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[lead-messages] unexpected error during insert', msg)
    return { success: false, error: 'Kunde inte spara meddelandet.' }
  }
}

