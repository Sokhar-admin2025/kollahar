import { createClient } from '@/lib/supabase/client'
import type { ServiceResult } from '@/lib/types/result'
import type { LocationStatRow } from '@/lib/swedish-locations'

export interface LocationStatsParams {
  categoryFilter?: string | null
  searchQuery?: string | null
  minPrice?: number | null
  maxPrice?: number | null
}

/**
 * Hämta antal aktiva annonser per location via Supabase RPC-funktionen
 * `public.get_location_stats`.
 *
 * Denna funktion är designad så att den enkelt kan flyttas till en ren server-miljö
 * (server action) genom att byta till server-klienten och märka filen med 'use server'.
 */
export async function getLocationStats(
  params: LocationStatsParams
): Promise<ServiceResult<LocationStatRow[]>> {
  try {
    const supabase = createClient()
    const { categoryFilter, searchQuery, minPrice, maxPrice } = params

    const { data, error } = await supabase.rpc('get_location_stats', {
      category_filter: categoryFilter ?? null,
      search_query: searchQuery ?? null,
      min_price: minPrice ?? null,
      max_price: maxPrice ?? null,
    })

    if (error) {
      console.error('getLocationStats failed', error)
      return {
        success: false,
        error: 'Kunde inte hämta platsstatistik just nu. Försök igen senare.',
      }
    }

    return {
      success: true,
      data: (data ?? []) as LocationStatRow[],
    }
  } catch (err) {
    console.error('getLocationStats unexpected error', err)
    return {
      success: false,
      error: 'Ett oväntat fel uppstod vid hämtning av platsstatistik.',
    }
  }
}

