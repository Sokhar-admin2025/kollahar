import type { SupabaseClient } from '@supabase/supabase-js'
import { supabaseAdmin } from '../supabase/admin'

export interface BilarOrgSettings {
  show_phone: boolean
  show_email: boolean
  contact_via_chat: boolean
}

export interface BilarProfileSettings {
  email_notifications: boolean
}

export interface BilarSettings {
  org: BilarOrgSettings
  profile: BilarProfileSettings
  orgId: string
  profileId: string
  userEmail: string | null
}

/**
 * Hämtar inställningar för inloggad användare: org-kanaler + profilnotiser.
 * Returnerar null om användaren inte är inloggad eller saknar organisation.
 *
 * Notera: organizations-queryn använder supabaseAdmin eftersom organizations-tabellen
 * saknar en explicit SELECT-policy — vanlig klient blockeras tyst av RLS.
 */
export async function getSettings(supabase: SupabaseClient): Promise<BilarSettings | null> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('organization_id, email_notifications')
    .eq('id', user.id)
    .single()

  if (profileError) {
    console.error('[bilar-settings-service] getSettings profile-fel:', profileError)
    return null
  }

  if (!profile?.organization_id) {
    console.error('[bilar-settings-service] getSettings: ingen organization_id på profil', user.id)
    return null
  }

  if (!supabaseAdmin) {
    console.error('[bilar-settings-service] getSettings: supabaseAdmin ej initialiserad')
    return null
  }

  const { data: org, error: orgError } = await supabaseAdmin
    .from('organizations')
    .select('id, show_phone, show_email, contact_via_chat')
    .eq('id', profile.organization_id)
    .single()

  if (orgError) {
    console.error('[bilar-settings-service] getSettings org-fel:', orgError)
    return null
  }

  if (!org) {
    console.error('[bilar-settings-service] getSettings: ingen org hittades för id', profile.organization_id)
    return null
  }

  return {
    org: {
      show_phone: org.show_phone ?? false,
      show_email: org.show_email ?? false,
      contact_via_chat: org.contact_via_chat ?? true,
    },
    profile: {
      email_notifications: profile.email_notifications ?? true,
    },
    orgId: org.id,
    profileId: user.id,
    userEmail: user.email ?? null,
  }
}

/**
 * Uppdaterar org-nivå kontaktkanaler. Använder supabaseAdmin — org har ingen UPDATE-policy.
 */
export async function updateOrgSettings(
  orgId: string,
  data: Partial<BilarOrgSettings>
): Promise<void> {
  if (!supabaseAdmin) throw new Error('[bilar-settings-service] supabaseAdmin not initialized')

  const { error } = await supabaseAdmin
    .from('organizations')
    .update(data)
    .eq('id', orgId)

  if (error) {
    console.error('[bilar-settings-service] updateOrgSettings fel:', error)
    throw new Error('Kunde inte spara organisationsinställningar')
  }
}

/**
 * Uppdaterar profilinställningar (e-postaviseringar m.m.). Använder supabaseAdmin.
 */
export async function updateProfileSettings(
  profileId: string,
  data: Partial<BilarProfileSettings>
): Promise<void> {
  if (!supabaseAdmin) throw new Error('[bilar-settings-service] supabaseAdmin not initialized')

  const { error } = await supabaseAdmin
    .from('profiles')
    .update(data)
    .eq('id', profileId)

  if (error) {
    console.error('[bilar-settings-service] updateProfileSettings fel:', error)
    throw new Error('Kunde inte spara profilinställningar')
  }
}
