import { createClient } from './server'

/**
 * Kontrollerar om en organisation är registrerad och aktiv på bilar.kollahar.se.
 * Används av middleware och server components för att avgöra om onboarding-flöde ska visas.
 */
export async function getBilarRegistration(organizationId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('organization_sites')
    .select('status, created_at')
    .eq('organization_id', organizationId)
    .eq('site', 'bilar')
    .single()

  if (error || !data) return null

  return data
}
