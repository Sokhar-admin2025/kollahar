'use server'

import { createClient } from '../../lib/supabase/server'
import {
  updateOrgSettings,
  updateProfileSettings,
} from '../../lib/features/bilar-settings-service'

export async function updateOrgSettingsAction(
  orgId: string,
  data: { show_phone?: boolean; show_email?: boolean; contact_via_chat?: boolean }
): Promise<{ success: boolean; error?: string }> {
  try {
    await updateOrgSettings(orgId, data)
    return { success: true }
  } catch (e) {
    const error = e instanceof Error ? e.message : 'Okänt fel'
    return { success: false, error }
  }
}

export async function updateProfileSettingsAction(
  profileId: string,
  data: { email_notifications?: boolean }
): Promise<{ success: boolean; error?: string }> {
  try {
    await updateProfileSettings(profileId, data)
    return { success: true }
  } catch (e) {
    const error = e instanceof Error ? e.message : 'Okänt fel'
    return { success: false, error }
  }
}

export async function sendPasswordResetAction(
  email: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient()
    const { error } = await supabase.auth.resetPasswordForEmail(email)
    if (error) {
      console.error('[bilar-settings] sendPasswordReset fel:', error)
      return { success: false, error: error.message }
    }
    return { success: true }
  } catch (e) {
    const error = e instanceof Error ? e.message : 'Okänt fel'
    return { success: false, error }
  }
}
