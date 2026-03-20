'use server'

// Server Actions för registreringsflödet.
// Använder supabaseAdmin (service role) eftersom organization_sites och organizations
// har RLS-policies som blockerar skrivningar från anon/authenticated-klienten.

import { supabaseAdmin } from '../../lib/supabase/admin'

/**
 * Skapar organizations-raden och sätter profiles.organization_id.
 * Måste köras server-side — organizations har ingen INSERT-policy för klienter.
 * organizations.id sätts till userId (multi-tenant-konvention).
 * profiles.organization_id sätts till samma UUID.
 */
export async function setupOrganizationAction(
  userId: string
): Promise<{ success: boolean; error?: string }> {
  if (!supabaseAdmin) return { success: false, error: 'Admin-klient saknas.' }

  const slug = 'org-' + userId.replace(/-/g, '')

  // Skapa organizations-rad med id = userId (ignorera konflikt om raden redan finns)
  const { error: orgError } = await supabaseAdmin
    .from('organizations')
    .upsert(
      { id: userId, name: '', slug },
      { onConflict: 'id', ignoreDuplicates: true }
    )

  if (orgError) {
    console.error('[bilar] setupOrganizationAction organizations upsert fel:', orgError)
    return { success: false, error: orgError.message }
  }

  // Sätt profiles.organization_id = userId (samma UUID)
  const { error: profileError } = await supabaseAdmin
    .from('profiles')
    .update({ organization_id: userId })
    .eq('id', userId)

  if (profileError) {
    console.error('[bilar] setupOrganizationAction profiles update fel:', profileError)
    return { success: false, error: profileError.message }
  }

  return { success: true }
}

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
  console.log('[bilar][completeRegistrationAction] START', { userId, organizationId, name, address, city, orgNumber })

  if (!supabaseAdmin) {
    console.error('[bilar][completeRegistrationAction] supabaseAdmin saknas — NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY kanske inte är satt')
    return { success: false, error: 'Admin-klient saknas.' }
  }

  const { data: orgData, error: orgError } = await supabaseAdmin
    .from('organizations')
    .update({ name, address, city })
    .eq('id', organizationId)
    .select()

  console.log('[bilar][completeRegistrationAction] organizations UPDATE', { orgData, orgError })

  if (orgError) {
    console.error('[bilar][completeRegistrationAction] organizations-fel:', orgError)
    return { success: false, error: 'Kunde inte spara företagsuppgifterna.' }
  }

  const { data: profileData, error: profileError } = await supabaseAdmin
    .from('profiles')
    .update({ org_number: orgNumber, profile_completed: true })
    .eq('id', userId)
    .select()

  console.log('[bilar][completeRegistrationAction] profiles UPDATE', { profileData, profileError })

  if (profileError) {
    console.error('[bilar][completeRegistrationAction] profiles-fel:', profileError)
    return { success: false, error: 'Företaget sparades men profilinformationen misslyckades.' }
  }

  console.log('[bilar][completeRegistrationAction] KLAR — success: true')
  return { success: true }
}
