'use server'

import { createClient } from '@/lib/supabase/server'
import type { ServiceResult } from '@/lib/types/result'
import type { Listing } from '@/app/types'
import type { InsertListingInput, UpdateListingInput } from '@/lib/validators/listing-schema'

export interface ListingSearchFilters {
  query?: string
  category?: string
  location?: string
  minPrice?: number
  maxPrice?: number
  minYear?: number
  maxYear?: number
  maxMileage?: number
  /** Bilfilter (används när category = cars) */
  fuel?: string
  gearbox?: string
  bodyType?: string
  driveWheel?: string
  color?: string
  horsepowerMin?: number
  horsepowerMax?: number
  offset?: number
  limit?: number
  sort?: 'newest' | 'oldest' | 'price_asc' | 'price_desc'
}

const DEFAULT_LIMIT = 24

/**
 * Server Action: Hämta aktiva annonser utifrån givna filter.
 * Bygger Supabase-queryn dynamiskt och returnerar ett ServiceResult<Listing[]>.
 */
export async function getListings(
  filters: ListingSearchFilters
): Promise<ServiceResult<Listing[]>> {
  try {
    const supabase = await createClient()

    const offset = filters.offset ?? 0
    const limit = filters.limit ?? DEFAULT_LIMIT

    let query = supabase
      .from('listings')
      .select('*')
      .eq('status', 'active')

    // Kategori
    if (filters.category && filters.category !== 'all') {
      query = query.eq('category', filters.category)
    }

    // Prisintervall
    if (typeof filters.minPrice === 'number') {
      query = query.gte('price', filters.minPrice)
    }
    if (typeof filters.maxPrice === 'number') {
      query = query.lte('price', filters.maxPrice)
    }

    // Årsmodell (om ni lagrar i attributes->>'year')
    if (typeof filters.minYear === 'number') {
      query = query.gte("attributes->>year", String(filters.minYear))
    }
    if (typeof filters.maxYear === 'number') {
      query = query.lte("attributes->>year", String(filters.maxYear))
    }

    // Miltal (om ni lagrar i attributes->>'mileage')
    if (typeof filters.maxMileage === 'number') {
      query = query.lte("attributes->>mileage", String(filters.maxMileage))
    }

    // Bilfilter (attributes JSONB)
    if (filters.fuel?.trim()) {
      query = query.eq("attributes->>fuel", filters.fuel.trim())
    }
    if (filters.gearbox?.trim()) {
      query = query.eq("attributes->>gearbox", filters.gearbox.trim())
    }
    if (filters.bodyType?.trim()) {
      query = query.eq("attributes->>body_type", filters.bodyType.trim())
    }
    if (filters.driveWheel?.trim()) {
      query = query.eq("attributes->>drive_wheel", filters.driveWheel.trim())
    }
    if (filters.color?.trim()) {
      query = query.ilike("attributes->>color", `%${filters.color.trim()}%`)
    }
    if (typeof filters.horsepowerMin === 'number') {
      query = query.gte("attributes->>horsepower", String(filters.horsepowerMin))
    }
    if (typeof filters.horsepowerMax === 'number') {
      query = query.lte("attributes->>horsepower", String(filters.horsepowerMax))
    }

    // Plats (enklare textmatch mot location-fältet)
    if (filters.location && filters.location.trim().length > 0) {
      const locTerm = `%${filters.location.trim()}%`
      query = query.ilike('location', locTerm)
    }

    // Fritext-sök
    if (filters.query && filters.query.trim().length > 0) {
      const term = `%${filters.query.trim()}%`
      query = query.or(`title.ilike.${term},description.ilike.${term}`)
    }

    // Sortering
    const sort = filters.sort ?? 'newest'
    switch (sort) {
      case 'oldest':
        query = query.order('created_at', { ascending: true })
        break
      case 'price_asc':
        query = query
          .order('price', { ascending: true })
          .order('created_at', { ascending: false })
        break
      case 'price_desc':
        query = query
          .order('price', { ascending: false })
          .order('created_at', { ascending: false })
        break
      case 'newest':
      default:
        query = query.order('created_at', { ascending: false })
        break
    }

    // Pagination
    query = query.range(offset, offset + limit - 1)

    const { data, error } = await query

    if (error) {
      console.error('getListings failed', error)
      return {
        success: false,
        error: 'Kunde inte hämta annonser just nu. Försök igen senare.',
      }
    }

    return {
      success: true,
      data: (data ?? []) as Listing[],
    }
  } catch (err) {
    console.error('getListings unexpected error', err)
    return {
      success: false,
      error: 'Ett oväntat fel uppstod vid hämtning av annonser.',
    }
  }
}

/**
 * Server Action: Hämta en enskild annons efter id.
 * Returnerar ServiceResult<Listing>. Används t.ex. på annonsdetaljsidan.
 */
export async function getListingById(id: string): Promise<ServiceResult<Listing>> {
  if (!id || id.trim().length === 0) {
    return { success: false, error: 'Ogiltigt annons-id.' }
  }

  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('listings')
      .select('*')
      .eq('id', id.trim())
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return { success: false, error: 'Annonsen hittades inte.' }
      }
      console.error('getListingById failed', error)
      return {
        success: false,
        error: 'Kunde inte hämta annonsen. Försök igen senare.',
      }
    }

    if (!data) {
      return { success: false, error: 'Annonsen hittades inte.' }
    }

    return {
      success: true,
      data: data as Listing,
    }
  } catch (err) {
    console.error('getListingById unexpected error', err)
    return {
      success: false,
      error: 'Ett oväntat fel uppstod vid hämtning av annonsen.',
    }
  }
}

/**
 * Skapa ny annons. Använd server-klient och RLS (auth.uid() = user_id).
 * Returnerar id vid lyckad insert.
 */
export async function createListing(
  data: InsertListingInput,
  userId: string
): Promise<ServiceResult<{ id: string }>> {
  try {
    const supabase = await createClient()

    const { data: row, error } = await supabase
      .from('listings')
      .insert({
        title: data.title.trim(),
        description: data.description.trim(),
        price: data.price,
        location: data.location.trim(),
        category: data.category,
        images: data.images ?? [],
        attributes: data.attributes ?? null,
        user_id: userId,
        status: 'active',
      })
      .select('id')
      .single()

    if (error) {
      console.error('createListing failed', error)
      return {
        success: false,
        error: 'Kunde inte skapa annons. Försök igen senare.',
      }
    }

    if (!row?.id) {
      return { success: false, error: 'Kunde inte skapa annons.' }
    }

    return { success: true, data: { id: row.id } }
  } catch (err) {
    console.error('createListing unexpected error', err)
    return {
      success: false,
      error: 'Ett oväntat fel uppstod vid skapande av annons.',
    }
  }
}

/**
 * Uppdatera befintlig annons. Endast ägare kan uppdatera (RLS + user_id-check).
 */
export async function updateListing(
  data: UpdateListingInput,
  userId: string
): Promise<ServiceResult<{ id: string }>> {
  try {
    const supabase = await createClient()

    const { error } = await supabase
      .from('listings')
      .update({
        title: data.title.trim(),
        description: data.description.trim(),
        price: data.price,
        location: data.location.trim(),
        category: data.category,
        images: data.images ?? [],
        attributes: data.attributes ?? null,
      })
      .eq('id', data.id)
      .eq('user_id', userId)

    if (error) {
      console.error('updateListing failed', error)
      return {
        success: false,
        error: 'Kunde inte uppdatera annons. Försök igen senare.',
      }
    }

    return { success: true, data: { id: data.id } }
  } catch (err) {
    console.error('updateListing unexpected error', err)
    return {
      success: false,
      error: 'Ett oväntat fel uppstod vid uppdatering av annons.',
    }
  }
}

/**
 * Hämta alla annonser för en användare (alla statusar). Kräver RLS-policy "Users can view all own listings".
 */
export async function getUserListings(userId: string): Promise<ServiceResult<Listing[]>> {
  if (!userId || userId.trim().length === 0) {
    return { success: false, error: 'Ogiltigt användar-id.' }
  }

  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('listings')
      .select('*')
      .eq('user_id', userId.trim())
      .order('created_at', { ascending: false })

    if (error) {
      console.error('getUserListings failed', error)
      return {
        success: false,
        error: 'Kunde inte hämta dina annonser. Försök igen senare.',
      }
    }

    return {
      success: true,
      data: (data ?? []) as Listing[],
    }
  } catch (err) {
    console.error('getUserListings unexpected error', err)
    return {
      success: false,
      error: 'Ett oväntat fel uppstod vid hämtning av annonser.',
    }
  }
}

/**
 * Hård DELETE av annons. Verifierar ägande (user_id === userId) innan radering.
 */
export async function deleteListing(
  listingId: string,
  userId: string
): Promise<ServiceResult<{ id: string }>> {
  if (!listingId?.trim() || !userId?.trim()) {
    return { success: false, error: 'Ogiltigt annons- eller användar-id.' }
  }

  try {
    const supabase = await createClient()

    const { data: row, error: fetchError } = await supabase
      .from('listings')
      .select('id, user_id')
      .eq('id', listingId.trim())
      .single()

    if (fetchError || !row) {
      return { success: false, error: 'Annonsen hittades inte.' }
    }

    if ((row as { user_id: string }).user_id !== userId) {
      return { success: false, error: 'Du får bara radera egna annonser.' }
    }

    const { error: deleteError } = await supabase
      .from('listings')
      .delete()
      .eq('id', listingId.trim())
      .eq('user_id', userId)

    if (deleteError) {
      console.error('deleteListing failed', deleteError)
      return {
        success: false,
        error: 'Kunde inte radera annonsen. Försök igen senare.',
      }
    }

    return { success: true, data: { id: listingId.trim() } }
  } catch (err) {
    console.error('deleteListing unexpected error', err)
    return {
      success: false,
      error: 'Ett oväntat fel uppstod vid radering.',
    }
  }
}

/**
 * Uppdatera endast status (t.ex. till 'sold'). Sätter deleted_at vid status 'sold'.
 */
export async function updateListingStatus(
  listingId: string,
  status: string,
  userId: string
): Promise<ServiceResult<{ id: string }>> {
  if (!listingId?.trim() || !userId?.trim()) {
    return { success: false, error: 'Ogiltigt annons- eller användar-id.' }
  }

  const allowed = ['active', 'sold', 'deleted']
  if (!allowed.includes(status)) {
    return { success: false, error: 'Ogiltig status.' }
  }

  try {
    const supabase = await createClient()

    const payload: { status: string; deleted_at?: string } = { status }
    if (status === 'sold') {
      payload.deleted_at = new Date().toISOString()
    }

    const { error } = await supabase
      .from('listings')
      .update(payload)
      .eq('id', listingId.trim())
      .eq('user_id', userId)

    if (error) {
      console.error('updateListingStatus failed', error)
      return {
        success: false,
        error: 'Kunde inte uppdatera annonsen. Försök igen senare.',
      }
    }

    return { success: true, data: { id: listingId.trim() } }
  } catch (err) {
    console.error('updateListingStatus unexpected error', err)
    return {
      success: false,
      error: 'Ett oväntat fel uppstod vid uppdatering.',
    }
  }
}
