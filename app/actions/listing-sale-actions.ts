'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import {
  createListingSaleDump,
  type SoldVia,
} from '@/lib/features/leados/leados-sales-service'
import { addLeadMessage } from '@/lib/features/leados/leados-lead-messages-service'
import { updateLeadStatusAction } from '@/app/actions/lead-actions'

export type ConfirmListingSaleResult = { success: true } | { success: false; error: string }

/**
 * Bekräfta att en annons är såld, uppdatera listing/lead-status och skapa en listing_sales-säljdump.
 * Första versionen: används från Dealer Command Center utan kopplat leadId.
 */
export async function confirmListingSaleAction(params: {
  listingId: string
  leadId?: string | null
  soldVia: SoldVia
}): Promise<ConfirmListingSaleResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: 'Du måste vara inloggad.' }
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, organization_id')
    .eq('id', user.id)
    .single()

  if (profileError || !profile) {
    console.error('[listing-sale] confirmListingSaleAction profile error', {
      userId: user.id,
      code: profileError?.code,
      message: profileError?.message,
    })
    return { success: false, error: 'Kunde inte hämta profil.' }
  }

  const orgId = (profile as { organization_id?: string | null }).organization_id
  if (!orgId) {
    return {
      success: false,
      error: 'Endast användare kopplade till en organisation kan markera annonser som sålda.',
    }
  }

  const soldByProfileId = (profile as { id: string }).id
  const soldByRole: 'seller' | 'owner' = soldByProfileId === orgId ? 'owner' : 'seller'

  try {
    // 1) Hämta listing och verifiera org
    const { data: listing, error: listingError } = await supabase
      .from('listings')
      .select('id, organization_id, status')
      .eq('id', params.listingId)
      .maybeSingle()

    if (listingError || !listing) {
      console.error('[listing-sale] listing not found or error', {
        listingId: params.listingId,
        orgId,
        code: listingError?.code,
        message: listingError?.message,
      })
      return { success: false, error: 'Annonsen kunde inte hittas.' }
    }

    const listingOrgId = (listing as { organization_id?: string | null }).organization_id
    if (!listingOrgId || listingOrgId !== orgId) {
      return {
        success: false,
        error: 'Du kan bara markera annonser inom din egen organisation som sålda.',
      }
    }

    // 2) Om leadId finns: verifiera leadet mot listing + org
    let leadId: string | null = params.leadId ?? null
    if (leadId) {
      const { data: lead, error: leadError } = await supabase
        .from('leads')
        .select('id, listing_id, organization_id')
        .eq('id', leadId)
        .maybeSingle()

      if (leadError || !lead) {
        console.error('[listing-sale] lead not found or error', {
          leadId,
          orgId,
          code: leadError?.code,
          message: leadError?.message,
        })
        return { success: false, error: 'Leadet kunde inte hittas.' }
      }

      const leadOrgId = (lead as { organization_id?: string | null }).organization_id
      const leadListingId = (lead as { listing_id?: string | null }).listing_id

      if (!leadOrgId || leadOrgId !== orgId) {
        return {
          success: false,
          error: 'Leadet tillhör inte din organisation.',
        }
      }

      if (leadListingId && leadListingId !== params.listingId) {
        return {
          success: false,
          error: 'Leadet tillhör inte den här annonsen.',
        }
      }
    }

    // 3) Uppdatera listing-status till 'sold' (om inte redan)
    const currentStatus = (listing as { status?: string | null }).status ?? 'active'
    if (currentStatus !== 'sold') {
      const { error: updateListingError } = await supabase
        .from('listings')
        .update({ status: 'sold' })
        .eq('id', params.listingId)
        .eq('organization_id', orgId)

      if (updateListingError) {
        console.error('[listing-sale] failed to update listing status to sold', {
          listingId: params.listingId,
          orgId,
          code: updateListingError.code,
          message: updateListingError.message,
        })
        return { success: false, error: 'Kunde inte markera annonsen som såld.' }
      }
    }

    // 4) Om leadId finns: sätt lead till sold via befintlig action
    if (leadId) {
      const leadStatusResult = await updateLeadStatusAction(leadId, 'sold')
      if (!leadStatusResult.success) {
        return {
          success: false,
          error: leadStatusResult.error ?? 'Kunde inte uppdatera lead-status till såld.',
        }
      }

      // Arkivera övriga leads för samma listing (om någon)
      const { error: archiveError } = await supabase
        .from('leads')
        .update({ status: 'archived' })
        .eq('listing_id', params.listingId)
        .eq('organization_id', orgId)
        .neq('id', leadId)

      if (archiveError) {
        console.error('[listing-sale] failed to archive sibling leads after sale', {
          listingId: params.listingId,
          leadId,
          orgId,
          code: archiveError.code,
          message: archiveError.message,
        })
        // fortsätt ändå – huvudförsäljningen är genomförd
      }
    }

    // 5) Skapa säljdump
    const dumpResult = await createListingSaleDump({
      listingId: params.listingId,
      leadId,
      soldByProfileId,
      soldByRole,
      soldVia: params.soldVia,
    })

    if (!dumpResult.success) {
      return { success: false, error: dumpResult.error ?? 'Kunde inte registrera försäljningen.' }
    }

    // 6) Logga systemmeddelande i LeadChat om lead finns
    if (leadId) {
      const soldViaText =
        params.soldVia === 'sokhar'
          ? 'via Kollahär/LeadOS'
          : params.soldVia === 'external'
            ? 'via extern kanal'
            : 'via annan kanal'
      const systemMessage = `Försäljning registrerad (${soldViaText}). Annonsen är nu markerad som såld och pipelineen är stängd. Se Senaste försäljningar i Dealer-vyn för sammanfattning.`
      const msgResult = await addLeadMessage({
        leadId,
        authorProfileId: soldByProfileId,
        role: 'system',
        content: systemMessage,
      })
      if (!msgResult.success) {
        console.error('[listing-sale] failed to create system message after sale', msgResult.error)
      }
    }
  } catch (err) {
    console.error('[listing-sale] confirmListingSaleAction unexpected error', err)
    return { success: false, error: 'Kunde inte registrera försäljningen.' }
  }

  revalidatePath('/dashboard/dealer')
  revalidatePath('/dashboard')
  return { success: true }
}

