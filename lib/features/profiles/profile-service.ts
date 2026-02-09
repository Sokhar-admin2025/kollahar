'use server'

import { createClient } from '@/lib/supabase/server'
import type { ServiceResult } from '@/lib/types/result'
import type { Profile } from '@/lib/types'

export interface ProfileStats {
  totalSold: number
  /** Endast kategorier med minst 1 såld annons */
  byCategory: Record<string, number>
}

/**
 * Hämta offentlig profildata för en användare. RLS: "Profiles are viewable by everyone".
 * Nya fält (account_type, website, is_company_verified, org_number) kan vara null/undefined om migration ej körts.
 */
export async function getPublicProfile(userId: string): Promise<ServiceResult<Profile | null>> {
  if (!userId || userId.trim().length === 0) {
    return { success: false, error: 'Ogiltigt användar-id.' }
  }

  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId.trim())
      .maybeSingle()

    if (error) {
      console.error('getPublicProfile failed', error)
      return {
        success: false,
        error: 'Kunde inte hämta profilen.',
      }
    }

    if (!data) {
      return { success: true, data: null }
    }

    const row = data as Record<string, unknown>
    const profile: Profile = {
      id: row.id as string,
      full_name: (row.full_name as string) ?? null,
      location: (row.location as string) ?? null,
      avatar_url: (row.avatar_url as string) ?? null,
      updated_at: (row.updated_at as string) ?? new Date().toISOString(),
      created_at: (row.created_at as string) ?? null,
      account_type: (row.account_type as 'private' | 'company') ?? 'private',
      website: (row.website as string) ?? null,
      is_company_verified: Boolean(row.is_company_verified),
      org_number: (row.org_number as string) ?? null,
    }

    return { success: true, data: profile }
  } catch (err) {
    console.error('getPublicProfile unexpected error', err)
    return {
      success: false,
      error: 'Ett oväntat fel uppstod vid hämtning av profilen.',
    }
  }
}

/**
 * Antal sålda annonser per användare, uppdelat per kategori. Returnerar endast kategorier med minst 1 såld.
 * RLS: "Public read sold listings" tillåter läsning av sålda annonser.
 */
export async function getProfileStats(userId: string): Promise<ServiceResult<ProfileStats>> {
  if (!userId || userId.trim().length === 0) {
    return { success: false, error: 'Ogiltigt användar-id.' }
  }

  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('listings')
      .select('category')
      .eq('user_id', userId.trim())
      .eq('status', 'sold')

    if (error) {
      console.error('getProfileStats failed', error)
      return {
        success: false,
        error: 'Kunde inte hämta statistik.',
      }
    }

    const rows = (data ?? []) as { category: string }[]
    const byCategory: Record<string, number> = {}
    for (const row of rows) {
      const cat = row.category ?? 'other'
      byCategory[cat] = (byCategory[cat] ?? 0) + 1
    }

    const totalSold = rows.length

    return {
      success: true,
      data: { totalSold, byCategory },
    }
  } catch (err) {
    console.error('getProfileStats unexpected error', err)
    return {
      success: false,
      error: 'Ett oväntat fel uppstod vid hämtning av statistik.',
    }
  }
}
