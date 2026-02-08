'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { toggleFavorite } from '@/lib/features/listings/listing-service'

export type ToggleFavoriteResult =
  | { success: true; added: boolean }
  | { success: false; error: string }

export async function toggleFavoriteAction(listingId: string): Promise<ToggleFavoriteResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: 'Du måste vara inloggad för att spara annonser.' }
  }

  const result = await toggleFavorite(user.id, listingId)
  if (!result.success) {
    return { success: false, error: result.error ?? 'Något gick fel.' }
  }

  revalidatePath('/dashboard')
  revalidatePath('/')

  return { success: true, added: result.data!.added }
}
