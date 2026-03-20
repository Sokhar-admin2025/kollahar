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

  console.log('[bilar][checkProfileComplete] user.id:', user.id, '| profile.organization_id:', profile?.organization_id ?? 'NULL')

  if (!profile?.organization_id) return false

  const { data: org, error: orgError } = await supabase
    .from('organizations')
    .select('name')
    .eq('id', profile.organization_id)
    .single()

  console.log('[bilar][checkProfileComplete] organizations-rad:', org, '| error:', orgError, '| name:', org?.name ?? 'NULL/SAKNAS')

  const result = Boolean(org?.name && org.name.trim().length > 0)
  console.log('[bilar][checkProfileComplete] returnerar:', result)
  return result
}
