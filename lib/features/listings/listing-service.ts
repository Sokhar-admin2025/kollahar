'use server'

import { createClient } from '@/lib/supabase/server'
import type { ServiceResult } from '@/lib/types/result'
import type { Listing } from '@/app/types'

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
