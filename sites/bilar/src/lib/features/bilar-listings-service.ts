import type { SupabaseClient } from '@supabase/supabase-js'
import { supabaseAdmin } from '../supabase/admin'

export type ListingStatus = 'active' | 'paused' | 'sold' | 'deleted' | 'draft'

export interface BilarListing {
  id: string
  title: string
  make: string | null
  model: string | null
  year: number | null
  price: number | null
  status: ListingStatus
  source_site: string
  created_at: string
  thumbnail: string | null
  views_count: number
  leads_count: number
}

export interface ListingsFilters {
  status?: ListingStatus | 'all'
  make?: string
  model?: string
}

// ─── getListings ──────────────────────────────────────────────────────────────

export async function getListings(
  supabase: SupabaseClient,
  organizationId: string,
  filters?: ListingsFilters
): Promise<BilarListing[]> {
  if (!supabaseAdmin) return []

  let query = supabaseAdmin
    .from('listings')
    .select('id, title, make, model, year, price, status, source_site, created_at, images')
    .eq('organization_id', organizationId)
    .neq('status', 'deleted')
    .order('created_at', { ascending: false })

  if (filters?.status && filters.status !== 'all') {
    query = query.eq('status', filters.status)
  }
  if (filters?.make) {
    query = query.ilike('make', `%${filters.make}%`)
  }
  if (filters?.model) {
    query = query.ilike('model', `%${filters.model}%`)
  }

  const { data: rows, error } = await query

  if (error) {
    console.error('[bilar-listings-service] getListings error', error)
    return []
  }

  if (!rows || rows.length === 0) return []

  const listingIds = rows.map((r) => String(r.id))

  // Views och leads parallellt
  const [{ data: viewRows }, { data: leadRows }] = await Promise.all([
    supabaseAdmin
      .from('listing_views')
      .select('listing_id')
      .in('listing_id', listingIds),
    supabaseAdmin
      .from('leads')
      .select('listing_id')
      .eq('organization_id', organizationId)
      .in('listing_id', listingIds)
      .neq('status', 'archived'),
  ])

  const viewsByListing: Record<string, number> = {}
  for (const v of viewRows ?? []) {
    const id = String(v.listing_id)
    viewsByListing[id] = (viewsByListing[id] ?? 0) + 1
  }

  const leadsByListing: Record<string, number> = {}
  for (const l of leadRows ?? []) {
    const id = String(l.listing_id)
    leadsByListing[id] = (leadsByListing[id] ?? 0) + 1
  }

  return rows.map((row) => {
    const images = row.images
    const thumbnail =
      Array.isArray(images) && images.length > 0 ? String(images[0]) : null
    const id = String(row.id)
    return {
      id,
      title: String(row.title ?? ''),
      make: (row.make as string | null) ?? null,
      model: (row.model as string | null) ?? null,
      year: (row.year as number | null) ?? null,
      price: (row.price as number | null) ?? null,
      status: (row.status ?? 'active') as ListingStatus,
      source_site: String(row.source_site ?? 'bilar'),
      created_at: String(row.created_at),
      thumbnail,
      views_count: viewsByListing[id] ?? 0,
      leads_count: leadsByListing[id] ?? 0,
    }
  })
}

// ─── updateListingStatus ──────────────────────────────────────────────────────

export async function updateListingStatus(
  supabase: SupabaseClient,
  listingId: string,
  organizationId: string,
  status: 'active' | 'paused' | 'sold'
): Promise<{ success: true } | { success: false; error: string }> {
  const { error } = await supabase
    .from('listings')
    .update({ status })
    .eq('id', listingId)
    .eq('organization_id', organizationId)

  if (error) {
    console.error('[bilar-listings-service] updateListingStatus error', error)
    return { success: false, error: 'Kunde inte uppdatera annonsens status.' }
  }
  return { success: true }
}

// ─── deleteListing ────────────────────────────────────────────────────────────

export async function deleteListing(
  supabase: SupabaseClient,
  listingId: string,
  organizationId: string
): Promise<{ success: true } | { success: false; error: string }> {
  if (!supabaseAdmin) return { success: false, error: 'Databasanslutning saknas.' }

  // Verifiera ägarskap
  const { data: row, error: fetchError } = await supabaseAdmin
    .from('listings')
    .select('id, organization_id')
    .eq('id', listingId)
    .maybeSingle()

  if (fetchError || !row) {
    return { success: false, error: 'Annonsen hittades inte.' }
  }

  if ((row as { organization_id?: string | null }).organization_id !== organizationId) {
    return { success: false, error: 'Du får bara ta bort egna annonser.' }
  }

  // Soft delete — sätter status = 'deleted'
  const { error: deleteError } = await supabaseAdmin
    .from('listings')
    .update({ status: 'deleted' })
    .eq('id', listingId)
    .eq('organization_id', organizationId)

  if (deleteError) {
    console.error('[bilar-listings-service] deleteListing error', deleteError)
    return { success: false, error: 'Kunde inte ta bort annonsen.' }
  }

  return { success: true }
}
