'use server'

import { createClient } from '@/lib/supabase/server'
import type { ServiceResult } from '@/lib/types/result'
import type { Listing } from '@/app/types'

export interface ListingSearchFilters {
  searchQuery?: string
  category?: string
  priceMin?: number
  priceMax?: number
}

/**
 * Server Action: Hämta aktiva annonser utifrån givna filter.
 * Bygger Supabase-queryn dynamiskt och returnerar ett ServiceResult<Listing[]>.
 */
export async function getListings(
  filters: ListingSearchFilters
): Promise<ServiceResult<Listing[]>> {
  try {
    const supabase = await createClient()

    let query = supabase
      .from('listings')
      .select('*')
      .eq('status', 'active')
      .order('created_at', { ascending: false })

    if (filters.category && filters.category !== 'all') {
      query = query.eq('category', filters.category)
    }

    if (typeof filters.priceMin === 'number') {
      query = query.gte('price', filters.priceMin)
    }

    if (typeof filters.priceMax === 'number') {
      query = query.lte('price', filters.priceMax)
    }

    if (filters.searchQuery && filters.searchQuery.trim().length > 0) {
      const term = `%${filters.searchQuery.trim()}%`
      // Matcha på title eller description
      query = query.or(`title.ilike.${term},description.ilike.${term}`)
    }

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

