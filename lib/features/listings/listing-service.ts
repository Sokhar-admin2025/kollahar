'use server'

import { withErrorRef } from '@/lib/error-ref'
import { createClient } from '@/lib/supabase/server'
import type { ServiceResult } from '@/lib/types/result'
import type { Listing } from '@/app/types'
import type { InsertListingInput, UpdateListingInput } from '@/lib/validators/listing-schema'

export interface ListingSearchFilters {
  query?: string
  category?: string
  location?: string
  /** Visa endast bortskänkes-annonser */
  bortskankes?: boolean
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
      .select('*', { count: 'exact' })
      .eq('status', 'active')

    // Kategori
    if (filters.category && filters.category !== 'all') {
      query = query.eq('category', filters.category)
    }

    // Bortskänkes
    if (filters.bortskankes === true) {
      query = query.eq('bortskankes', true)
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

    const { data, error, count } = await query

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
      totalCount: count ?? (data ?? []).length,
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

    const isBortskankes = Boolean(data.bortskankes)
    const insertPayload = {
      title: data.title.trim(),
      description: data.description.trim(),
      price: isBortskankes ? 0 : data.price,
      location: data.location.trim(),
      category: data.category,
      images: data.images ?? [],
      attributes: data.attributes ?? {},
      user_id: userId,
      status: 'active',
    } as Record<string, unknown>
    insertPayload.bortskankes = isBortskankes

    let row: { id: string } | null = null
    let error: { message?: string; code?: string } | null = null
    const res = await supabase
      .from('listings')
      .insert(insertPayload)
      .select('id')
      .single()
    row = res.data
    error = res.error

    if (error) {
      const isMissingColumn = String(error.message || '').toLowerCase().includes('bortskankes') &&
        (String(error.message || '').toLowerCase().includes('does not exist') || String(error.code || '') === '42703')
      if (isMissingColumn) {
        delete insertPayload.bortskankes
        const retry = await supabase.from('listings').insert(insertPayload).select('id').single()
        if (retry.error) {
          console.error('createListing retry failed', retry.error)
          return {
            success: false,
            error: 'Kör migration (supabase db push) för att aktivera bortskänkes. Annars kan du skapa annonser utan bortskänkes.',
          }
        }
        row = retry.data
      } else {
        const msg = String(error.message ?? '')
        if (msg.toUpperCase().includes('MAX_LIMIT_REACHED')) {
          return {
            success: false,
            error: withErrorRef('Tyvärr kan vi inte skapa din annons just nu. Försök igen om en stund.', error),
          }
        }
        return {
          success: false,
          error: withErrorRef(msg || 'Kunde inte skapa annons. Försök igen senare.', error),
        }
      }
    }

    if (!row?.id) {
      return { success: false, error: withErrorRef('Kunde inte skapa annons.', new Error('No row id returned')) }
    }

    return { success: true, data: { id: row.id } }
  } catch (err) {
    return {
      success: false,
      error: withErrorRef('Ett oväntat fel uppstod vid skapande av annons.', err),
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

    const isBortskankes = Boolean(data.bortskankes)
    const { error } = await supabase
      .from('listings')
      .update({
        title: data.title.trim(),
        description: data.description.trim(),
        price: isBortskankes ? 0 : data.price,
        bortskankes: isBortskankes,
        location: data.location.trim(),
        category: data.category,
        images: data.images ?? [],
        attributes: data.attributes ?? {},
      })
      .eq('id', data.id)
      .eq('user_id', userId)

    if (error) {
      return {
        success: false,
        error: withErrorRef('Kunde inte uppdatera annons. Försök igen senare.', error),
      }
    }

    return { success: true, data: { id: data.id } }
  } catch (err) {
    return {
      success: false,
      error: withErrorRef('Ett oväntat fel uppstod vid uppdatering av annons.', err),
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
 * Hämta en användares aktiva annonser (status = 'active'). För t.ex. publika säljprofiler.
 * RLS: "Public read active ads" tillåter läsning.
 */
export async function getActiveListingsByUserId(userId: string): Promise<ServiceResult<Listing[]>> {
  if (!userId || userId.trim().length === 0) {
    return { success: false, error: 'Ogiltigt användar-id.' }
  }

  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('listings')
      .select('*')
      .eq('user_id', userId.trim())
      .eq('status', 'active')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('getActiveListingsByUserId failed', error)
      return {
        success: false,
        error: 'Kunde inte hämta annonser.',
      }
    }

    return {
      success: true,
      data: (data ?? []) as Listing[],
    }
  } catch (err) {
    console.error('getActiveListingsByUserId unexpected error', err)
    return {
      success: false,
      error: 'Ett oväntat fel uppstod vid hämtning av annonser.',
    }
  }
}

/**
 * Hämta användarens favorit-annonser (full Listing-objekt). För Dashboard-fliken "Sparade annonser".
 */
export async function getFavoriteListings(userId: string): Promise<ServiceResult<Listing[]>> {
  if (!userId?.trim()) {
    return { success: false, error: 'Ogiltigt användar-id.' }
  }

  try {
    const supabase = await createClient()

    const { data: rows, error } = await supabase
      .from('favorites')
      .select('listing_id')
      .eq('user_id', userId.trim())
      .order('created_at', { ascending: false })

    if (error) {
      console.error('getFavoriteListings (favorites) failed', error)
      return {
        success: false,
        error: 'Kunde inte hämta sparade annonser. Försök igen senare.',
      }
    }

    const ids = (rows ?? []).map((r) => (r as { listing_id: string }).listing_id).filter(Boolean)
    if (ids.length === 0) {
      return { success: true, data: [] }
    }

    const { data: listings, error: listError } = await supabase
      .from('listings')
      .select('*')
      .in('id', ids)
      .eq('status', 'active')

    if (listError) {
      console.error('getFavoriteListings (listings) failed', listError)
      return {
        success: false,
        error: 'Kunde inte hämta sparade annonser. Försök igen senare.',
      }
    }

    const orderMap = new Map(ids.map((id, i) => [id, i]))
    const sorted = (listings ?? [])
      .filter((l) => orderMap.has(l.id))
      .sort((a, b) => (orderMap.get(a.id) ?? 0) - (orderMap.get(b.id) ?? 0))

    return { success: true, data: sorted as Listing[] }
  } catch (err) {
    console.error('getFavoriteListings unexpected error', err)
    return {
      success: false,
      error: 'Ett oväntat fel uppstod vid hämtning av sparade annonser.',
    }
  }
}

/**
 * Hämta endast användarens favorit-IDs. För att undvika N+1 (varje kort behöver bara kolla listId i listan).
 */
export async function getFavoriteIds(userId: string): Promise<ServiceResult<string[]>> {
  if (!userId?.trim()) {
    return { success: false, error: 'Ogiltigt användar-id.' }
  }

  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('favorites')
      .select('listing_id')
      .eq('user_id', userId.trim())

    if (error) {
      console.error('getFavoriteIds failed', error)
      return {
        success: false,
        error: 'Kunde inte hämta favorit-ID:n.',
      }
    }

    const ids = (data ?? []).map((r) => (r as { listing_id: string }).listing_id).filter(Boolean)
    return { success: true, data: ids }
  } catch (err) {
    console.error('getFavoriteIds unexpected error', err)
    return {
      success: false,
      error: 'Ett oväntat fel uppstod.',
    }
  }
}

/**
 * Toggla favorit: om raden finns tas den bort, annars läggs den till. Returnerar om annonsen lades till (true) eller togs bort (false).
 */
export async function toggleFavorite(
  userId: string,
  listingId: string
): Promise<ServiceResult<{ added: boolean }>> {
  if (!userId?.trim() || !listingId?.trim()) {
    return { success: false, error: 'Ogiltigt användar- eller annons-id.' }
  }

  try {
    const supabase = await createClient()

    const { data: existing } = await supabase
      .from('favorites')
      .select('user_id')
      .eq('user_id', userId.trim())
      .eq('listing_id', listingId.trim())
      .maybeSingle()

    if (existing) {
      const { error: delError } = await supabase
        .from('favorites')
        .delete()
        .eq('user_id', userId.trim())
        .eq('listing_id', listingId.trim())

      if (delError) {
        console.error('toggleFavorite delete failed', delError)
        return { success: false, error: 'Kunde inte ta bort från sparade.' }
      }
      return { success: true, data: { added: false } }
    }

    const { error: insError } = await supabase
      .from('favorites')
      .insert({ user_id: userId.trim(), listing_id: listingId.trim() })

    if (insError) {
      console.error('toggleFavorite insert failed', insError)
      return { success: false, error: 'Kunde inte spara annonsen.' }
    }
    return { success: true, data: { added: true } }
  } catch (err) {
    console.error('toggleFavorite unexpected error', err)
    return { success: false, error: 'Ett oväntat fel uppstod.' }
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
 * Uppdatera endast status (t.ex. till 'sold').
 * Sätter inte deleted_at vid 'sold' så att annonsen fortfarande kan visas som "Såld" för alla (RLS tillåter SELECT på sålda).
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

    const payload: { status: string } = { status }

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
