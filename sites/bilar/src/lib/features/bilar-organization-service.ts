import type { SupabaseClient } from '@supabase/supabase-js'

export interface BilarOrganization {
  id: string
  name: string
  slug: string
  logo_url: string | null
  address: string | null
  city: string | null
}

/**
 * Hämtar den inloggade användarens organisation via profiles.organization_id.
 * Returnerar null om användaren inte är inloggad eller saknar organisation.
 */
export async function getOrganization(supabase: SupabaseClient): Promise<BilarOrganization | null> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id')
    .eq('id', user.id)
    .single()

  if (!profile?.organization_id) return null

  const { data: org } = await supabase
    .from('organizations')
    .select('id, name, slug, logo_url, address, city')
    .eq('id', profile.organization_id)
    .single()

  return org ?? null
}
