import type { SupabaseClient } from '@supabase/supabase-js'
import { supabaseAdmin } from '../supabase/admin'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PublicListing {
  id: string
  title: string
  make: string | null
  model: string | null
  year: number | null
  price: number | null
  thumbnail: string | null
  seller_type: string
  organization: {
    name: string | null
    slug: string | null
    logo_url: string | null
  } | null
  attributes: {
    fuel_type?: string
    mileage?: number
    gearbox?: string
    is_upcoming?: boolean
  }
}

export interface PublicListingsFilters {
  q?: string
  make?: string
  model?: string
  minPrice?: number
  maxPrice?: number
  fuelType?: string
  gearbox?: string
  yearFrom?: number
  yearTo?: number
}

export interface FeaturedMake {
  make: string
  count: number
}

const PAGE_SIZE = 20

// ─── getPublicListings ────────────────────────────────────────────────────────

export async function getPublicListings(
  _supabase: SupabaseClient,
  filters?: PublicListingsFilters,
  page = 1
): Promise<{ listings: PublicListing[]; total: number }> {
  if (!supabaseAdmin) return { listings: [], total: 0 }

  const offset = (page - 1) * PAGE_SIZE

  let query = supabaseAdmin
    .from('listings')
    .select(
      'id, title, make, model, year, price, images, attributes, seller_type, organizations(name, slug, logo_url)',
      { count: 'exact' }
    )
    .eq('source_site', 'bilar')
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .range(offset, offset + PAGE_SIZE - 1)

  if (filters?.make) {
    query = query.ilike('make', `%${filters.make}%`)
  }
  if (filters?.model) {
    query = query.ilike('model', `%${filters.model}%`)
  }
  if (filters?.q) {
    const q = `%${filters.q}%`
    query = query.or(`title.ilike.${q},make.ilike.${q},model.ilike.${q}`)
  }
  if (filters?.minPrice) {
    query = query.gte('price', filters.minPrice)
  }
  if (filters?.maxPrice) {
    query = query.lte('price', filters.maxPrice)
  }
  if (filters?.yearFrom) {
    query = query.gte('year', filters.yearFrom)
  }
  if (filters?.yearTo) {
    query = query.lte('year', filters.yearTo)
  }
  if (filters?.fuelType) {
    query = query.filter('attributes->>fuel_type', 'eq', filters.fuelType)
  }
  if (filters?.gearbox) {
    query = query.filter('attributes->>gearbox', 'eq', filters.gearbox)
  }

  const { data: rows, error, count } = await query

  if (error) {
    console.error('[bilar-public-service] getPublicListings error', error)
    return { listings: [], total: 0 }
  }

  const listings = (rows ?? []).map((row): PublicListing => {
    const images = row.images
    const thumbnail =
      Array.isArray(images) && images.length > 0 ? String(images[0]) : null

    const orgs = row.organizations
    const org = Array.isArray(orgs) ? orgs[0] : orgs

    return {
      id: String(row.id),
      title: String(row.title ?? ''),
      make: (row.make as string | null) ?? null,
      model: (row.model as string | null) ?? null,
      year: (row.year as number | null) ?? null,
      price: (row.price as number | null) ?? null,
      thumbnail,
      seller_type: String(row.seller_type ?? 'company'),
      organization: org
        ? {
            name: (org.name as string | null) ?? null,
            slug: (org.slug as string | null) ?? null,
            logo_url: (org.logo_url as string | null) ?? null,
          }
        : null,
      attributes: (row.attributes as PublicListing['attributes']) ?? {},
    }
  })

  return { listings, total: count ?? 0 }
}

// ─── getFeaturedMakes ─────────────────────────────────────────────────────────

export async function getFeaturedMakes(_supabase: SupabaseClient): Promise<FeaturedMake[]> {
  if (!supabaseAdmin) return []

  const { data, error } = await supabaseAdmin
    .from('listings')
    .select('make')
    .eq('source_site', 'bilar')
    .eq('status', 'active')
    .not('make', 'is', null)

  if (error || !data) return []

  const counts: Record<string, number> = {}
  for (const row of data) {
    const make = row.make as string
    if (make) counts[make] = (counts[make] ?? 0) + 1
  }

  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([make, count]) => ({ make, count }))
}

// ─── getFavoriteIds ───────────────────────────────────────────────────────────

export async function getFavoriteIds(supabase: SupabaseClient): Promise<string[]> {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return []

  const { data } = await supabase
    .from('favorites')
    .select('listing_id')
    .eq('user_id', user.id)

  return (data ?? []).map((r) => String(r.listing_id))
}
