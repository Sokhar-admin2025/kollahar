import type { SupabaseClient } from '@supabase/supabase-js'
import { supabaseAdmin } from '../supabase/admin'

export type ListingStatus = 'active' | 'paused' | 'sold' | 'deleted' | 'draft'

export interface BilarListingAttributes {
  mileage?: number
  fuel_type?: string
  gearbox?: string
  color?: string
  body_type?: string
  condition?: string
  inspection_valid_until?: string
  down_payment?: number
  is_upcoming?: boolean
  equipment?: string[]
  description?: string
}

export interface BilarListingFormData {
  title: string
  make: string
  model: string
  year: number | null
  price: number | null
  status: 'active' | 'draft'
  images: string[]
  contact_via_chat: boolean
  show_phone: boolean
  contact_phone: string
  show_email: boolean
  attributes: BilarListingAttributes
}

export interface BilarListingDetail {
  id: string
  title: string
  make: string | null
  model: string | null
  year: number | null
  price: number | null
  status: ListingStatus
  images: string[]
  contact_via_chat: boolean
  show_phone: boolean
  contact_phone: string | null
  show_email: boolean
  attributes: BilarListingAttributes
  created_at: string
}

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
  _supabase: SupabaseClient,
  listingId: string,
  organizationId: string,
  status: 'active' | 'paused' | 'sold'
): Promise<{ success: true } | { success: false; error: string }> {
  if (!supabaseAdmin) return { success: false, error: 'Databasanslutning saknas.' }

  const { error } = await supabaseAdmin
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

// ─── createListing ────────────────────────────────────────────────────────────

export async function createListing(
  _supabase: SupabaseClient,
  organizationId: string,
  userId: string,
  data: BilarListingFormData
): Promise<{ success: true; id: string } | { success: false; error: string }> {
  if (!supabaseAdmin) return { success: false, error: 'Databasanslutning saknas.' }

  const { data: row, error } = await supabaseAdmin
    .from('listings')
    .insert({
      title: data.title,
      make: data.make || null,
      model: data.model || null,
      year: data.year,
      price: data.price,
      status: data.status,
      images: data.images,
      contact_via_chat: data.contact_via_chat,
      show_phone: data.show_phone,
      contact_phone: data.contact_phone || null,
      show_email: data.show_email,
      description: data.attributes.description || '',
      location: '',
      attributes: data.attributes,
      organization_id: organizationId,
      user_id: userId,
      seller_type: 'company',
      source_site: 'bilar',
      category: 'cars',
    })
    .select('id')
    .single()

  if (error || !row) {
    console.error('[bilar-listings-service] createListing error', error)
    return { success: false, error: 'Kunde inte skapa annonsen.' }
  }

  return { success: true, id: String(row.id) }
}

// ─── getListing ───────────────────────────────────────────────────────────────

export async function getListing(
  _supabase: SupabaseClient,
  listingId: string,
  organizationId: string
): Promise<BilarListingDetail | null> {
  if (!supabaseAdmin) return null

  const { data: row, error } = await supabaseAdmin
    .from('listings')
    .select(
      'id, title, make, model, year, price, status, images, contact_via_chat, show_phone, contact_phone, show_email, attributes, created_at'
    )
    .eq('id', listingId)
    .eq('organization_id', organizationId)
    .neq('status', 'deleted')
    .maybeSingle()

  if (error || !row) return null

  return {
    id: String(row.id),
    title: String(row.title ?? ''),
    make: (row.make as string | null) ?? null,
    model: (row.model as string | null) ?? null,
    year: (row.year as number | null) ?? null,
    price: (row.price as number | null) ?? null,
    status: (row.status ?? 'draft') as ListingStatus,
    images: Array.isArray(row.images) ? (row.images as string[]) : [],
    contact_via_chat: Boolean(row.contact_via_chat ?? true),
    show_phone: Boolean(row.show_phone ?? false),
    contact_phone: (row.contact_phone as string | null) ?? null,
    show_email: Boolean(row.show_email ?? false),
    attributes: (row.attributes as BilarListingAttributes) ?? {},
    created_at: String(row.created_at),
  }
}

// ─── updateListing ────────────────────────────────────────────────────────────

export async function updateListing(
  _supabase: SupabaseClient,
  listingId: string,
  organizationId: string,
  data: BilarListingFormData
): Promise<{ success: true } | { success: false; error: string }> {
  if (!supabaseAdmin) return { success: false, error: 'Databasanslutning saknas.' }

  const { error } = await supabaseAdmin
    .from('listings')
    .update({
      title: data.title,
      make: data.make || null,
      model: data.model || null,
      year: data.year,
      price: data.price,
      status: data.status,
      images: data.images,
      contact_via_chat: data.contact_via_chat,
      show_phone: data.show_phone,
      contact_phone: data.contact_phone || null,
      show_email: data.show_email,
      attributes: data.attributes,
    })
    .eq('id', listingId)
    .eq('organization_id', organizationId)

  if (error) {
    console.error('[bilar-listings-service] updateListing error', error)
    return { success: false, error: 'Kunde inte spara annonsen.' }
  }

  return { success: true }
}
