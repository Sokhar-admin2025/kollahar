import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Kontrollerar om den inloggade användaren har en färdigställd företagsprofil.
 *
 * Används av proxy.ts för att redirecta till /registrera/profil om profilen
 * är ofullständig. Anropas med en server-side Supabase-klient.
 *
 * @returns true om organizations.name är ifyllt, false annars eller vid fel.
 */
export async function checkProfileComplete(supabase: SupabaseClient): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false

  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id')
    .eq('id', user.id)
    .single()

  if (!profile?.organization_id) return false

  const { data: org } = await supabase
    .from('organizations')
    .select('name')
    .eq('id', profile.organization_id)
    .single()

  return Boolean(org?.name && org.name.trim().length > 0)
}
