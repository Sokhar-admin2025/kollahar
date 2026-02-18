'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import {
  createListing as createListingService,
  updateListing as updateListingService,
  updateListingPrice as updateListingPriceService,
  deleteListing as deleteListingService,
  updateListingStatus as updateListingStatusService,
} from '@/lib/features/listings/listing-service'
import { insertListingSchema, updateListingSchema } from '@/lib/validators/listing-schema'
import type { InsertListingInput, UpdateListingInput } from '@/lib/validators/listing-schema'

export type DeleteListingResult = { success: true } | { success: false; error: string }
export type MarkAsSoldResult = { success: true } | { success: false; error: string }

export type CreateListingResult =
  | { success: true; data: { id: string } }
  | { success: false; error: string; fieldErrors?: Record<string, string[]> }

export type UpdateListingResult =
  | { success: true; data: { id: string } }
  | { success: false; error: string; fieldErrors?: Record<string, string[]> }

export async function createListingAction(data: InsertListingInput): Promise<CreateListingResult> {
  const parsed = insertListingSchema.safeParse(data)
  if (!parsed.success) {
    const fieldErrors: Record<string, string[]> = {}
    parsed.error.errors.forEach((err) => {
      const path = err.path.join('.')
      if (!fieldErrors[path]) fieldErrors[path] = []
      fieldErrors[path].push(err.message)
    })
    // Plattar ut attributes.xyz → xyz så att frontend hittar t.ex. mileage, year, fuel
    Object.keys(fieldErrors).forEach((path) => {
      if (path.startsWith('attributes.')) {
        const short = path.slice('attributes.'.length)
        if (!fieldErrors[short]) fieldErrors[short] = []
        fieldErrors[short].push(...fieldErrors[path])
      }
    })
    return {
      success: false,
      error: 'Kontrollera formuläret. Några fält är ogiltiga.',
      fieldErrors,
    }
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: 'Du måste vara inloggad för att skapa en annons.' }
  }

  const result = await createListingService(parsed.data, user.id)
  if (!result.success) {
    return { success: false, error: result.error ?? 'Kunde inte skapa annons.' }
  }

  revalidatePath('/')
  revalidatePath('/dashboard')
  return { success: true, data: result.data! }
}

export async function updateListingAction(data: UpdateListingInput): Promise<UpdateListingResult> {
  const parsed = updateListingSchema.safeParse(data)
  if (!parsed.success) {
    const fieldErrors: Record<string, string[]> = {}
    parsed.error.errors.forEach((err) => {
      const path = err.path.join('.')
      if (!fieldErrors[path]) fieldErrors[path] = []
      fieldErrors[path].push(err.message)
    })
    Object.keys(fieldErrors).forEach((path) => {
      if (path.startsWith('attributes.')) {
        const short = path.slice('attributes.'.length)
        if (!fieldErrors[short]) fieldErrors[short] = []
        fieldErrors[short].push(...fieldErrors[path])
      }
    })
    return {
      success: false,
      error: 'Kontrollera formuläret. Några fält är ogiltiga.',
      fieldErrors,
    }
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: 'Du måste vara inloggad för att uppdatera en annons.' }
  }

  const result = await updateListingService(parsed.data, user.id)
  if (!result.success) {
    return { success: false, error: result.error ?? 'Kunde inte uppdatera annons.' }
  }

  revalidatePath('/')
  revalidatePath('/dashboard')
  revalidatePath('/dashboard/dealer')
  return { success: true, data: result.data! }
}

export type UpdateListingPriceResult = { success: true } | { success: false; error: string }

export async function updateListingPriceAction(
  listingId: string,
  newPrice: number
): Promise<UpdateListingPriceResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: 'Du måste vara inloggad.' }
  }

  const result = await updateListingPriceService(listingId, newPrice, user.id)
  if (!result.success) {
    return { success: false, error: result.error ?? 'Kunde inte uppdatera pris.' }
  }

  revalidatePath('/dashboard')
  revalidatePath('/dashboard/dealer')
  return { success: true }
}

export async function deleteListingAction(
  listingId: string,
  logReason?: string,
  adTitle?: string
): Promise<DeleteListingResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: 'Du måste vara inloggad för att radera en annons.' }
  }

  if (logReason && adTitle) {
    try {
      await supabase.from('deletion_logs').insert({
        user_id: user.id,
        reason: logReason,
        ad_title: adTitle,
      })
    } catch {
      // Logg misslyckades – fortsätt med radering
    }
  }

  const result = await deleteListingService(listingId, user.id)
  if (!result.success) {
    return { success: false, error: result.error ?? 'Kunde inte radera annonsen.' }
  }

  revalidatePath('/dashboard')
  return { success: true }
}

export async function markAsSoldAction(
  listingId: string,
  logReason?: string,
  adTitle?: string
): Promise<MarkAsSoldResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: 'Du måste vara inloggad.' }
  }

  if (logReason && adTitle) {
    try {
      await supabase.from('deletion_logs').insert({
        user_id: user.id,
        reason: logReason,
        ad_title: adTitle,
      })
    } catch {
      // Logg misslyckades
    }
  }

  const result = await updateListingStatusService(listingId, 'sold', user.id)
  if (!result.success) {
    return { success: false, error: result.error ?? 'Kunde inte markera som såld.' }
  }

  revalidatePath('/dashboard')
  return { success: true }
}
