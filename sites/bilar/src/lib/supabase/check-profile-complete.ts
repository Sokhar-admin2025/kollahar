import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Kontrollerar om den inloggade användaren har en färdigställd företagsprofil.
 *
 * Används av proxy.ts för att redirecta till /registrera/profil om profilen
 * är ofullständig. Anropas med en server-side Supabase-klient.
 *
 * @returns true om profiles.profile_completed = true, false annars eller vid fel.
 */
export async function checkProfileComplete(supabase: SupabaseClient): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false

  const { data: profile } = await supabase
    .from('profiles')
    .select('profile_completed')
    .eq('id', user.id)
    .single()

  return profile?.profile_completed === true
}
