'use server'

// Server Actions för registreringsflödet.
// Använder supabaseAdmin (service role) eftersom organization_sites och organizations
// har RLS-policies som blockerar skrivningar från anon/authenticated-klienten.

import { supabaseAdmin } from '../../lib/supabase/admin'

/**
 * Skapar/uppdaterar organization_sites-raden för bilar.
 * Måste köras server-side — organization_sites har ingen INSERT-policy för klienter.
 */
export async function createOrganizationSiteAction(
  organizationId: string
): Promise<{ success: boolean; error?: string }> {
  if (!supabaseAdmin) return { success: false, error: 'Admin-klient saknas.' }

  const { error } = await supabaseAdmin
    .from('organization_sites')
    .upsert(
      { organization_id: organizationId, site: 'bilar', status: 'active' },
      { onConflict: 'organization_id,site' }
    )

  if (error) {
    console.error('[bilar] createOrganizationSiteAction fel:', error)
    return { success: false, error: error.message }
  }
  return { success: true }
}

/**
 * Slutför företagsprofilen: uppdaterar organizations + sätter profile_completed = true.
 * Måste köras server-side för att garantera att organizations-skrivningen går igenom
 * oavsett RLS-konfiguration.
 */
export async function completeRegistrationAction(
  userId: string,
  organizationId: string,
  name: string,
  address: string,
  city: string,
  orgNumber: string
): Promise<{ success: boolean; error?: string }> {
  if (!supabaseAdmin) return { success: false, error: 'Admin-klient saknas.' }

  const { error: orgError } = await supabaseAdmin
    .from('organizations')
    .update({ name, address, city })
    .eq('id', organizationId)

  if (orgError) {
    console.error('[bilar] completeRegistration organizations-fel:', orgError)
    return { success: false, error: 'Kunde inte spara företagsuppgifterna.' }
  }

  const { error: profileError } = await supabaseAdmin
    .from('profiles')
    .update({ org_number: orgNumber, profile_completed: true })
    .eq('id', userId)

  if (profileError) {
    console.error('[bilar] completeRegistration profiles-fel:', profileError)
    return { success: false, error: 'Företaget sparades men profilinformationen misslyckades.' }
  }

  return { success: true }
}
