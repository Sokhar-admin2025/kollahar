import type { SupabaseClient } from '@supabase/supabase-js'
import { supabaseAdmin } from '../supabase/admin'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PublicOrganizationDetail {
  id: string
  name: string | null
  slug: string | null
  logo_url: string | null
  address: string | null
  city: string | null
  created_at: string
  is_company_verified: boolean
  show_financing: boolean
  sold_count: number
  active_count: number
}

export interface PublicListingDetail {
  id: string
  title: string
  make: string | null
  model: string | null
  year: number | null
  price: number | null
  images: string[]
  contact_via_chat: boolean
  show_phone: boolean
  contact_phone: string | null
  show_email: boolean
  attributes: {
    fuel_type?: string
    mileage?: number
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
  created_at: string
  views_count: number
  seller_id: string | null
  organization_id: string | null
  organization: PublicOrganizationDetail | null
}

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

// ─── getPublicListing ─────────────────────────────────────────────────────────

export async function getPublicListing(
  _supabase: SupabaseClient,
  listingId: string
): Promise<PublicListingDetail | null> {
  if (!supabaseAdmin) return null

  const { data: row, error } = await supabaseAdmin
    .from('listings')
    .select(
      'id, title, make, model, year, price, images, contact_via_chat, show_phone, contact_phone, show_email, attributes, created_at, user_id, organization_id, organizations(id, name, slug, logo_url, address, city, created_at)'
    )
    .eq('id', listingId)
    .eq('status', 'active')
    .maybeSingle()

  if (error || !row) return null

  const orgRaw = Array.isArray(row.organizations) ? row.organizations[0] : row.organizations
  const orgId = (row.organization_id as string | null) ?? null

  // Views count, sold count, active count, is_company_verified, show_financing parallellt
  const [viewsResult, soldResult, activeResult, verifiedResult, financingResult] = await Promise.all([
    supabaseAdmin
      .from('listing_views')
      .select('*', { count: 'exact', head: true })
      .eq('listing_id', listingId),

    orgId
      ? supabaseAdmin
          .from('listing_sales')
          .select('*', { count: 'exact', head: true })
          .eq('organization_id', orgId)
      : Promise.resolve({ count: 0 }),

    orgId
      ? supabaseAdmin
          .from('listings')
          .select('*', { count: 'exact', head: true })
          .eq('organization_id', orgId)
          .eq('source_site', 'bilar')
          .eq('status', 'active')
      : Promise.resolve({ count: 0 }),

    orgId
      ? supabaseAdmin
          .from('profiles')
          .select('id', { count: 'exact', head: true })
          .eq('organization_id', orgId)
          .eq('is_company_verified', true)
      : Promise.resolve({ count: 0 }),

    orgId
      ? supabaseAdmin
          .from('organizations')
          .select('show_financing')
          .eq('id', orgId)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ])

  const viewsCount = (viewsResult as { count: number | null }).count ?? 0
  const soldCount = (soldResult as { count: number | null }).count ?? 0
  const activeCount = (activeResult as { count: number | null }).count ?? 0
  const isVerified = ((verifiedResult as { count: number | null }).count ?? 0) > 0
  const showFinancing =
    Boolean((financingResult as { data: { show_financing?: boolean } | null })?.data?.show_financing) ?? false

  const organization: PublicOrganizationDetail | null = orgRaw
    ? {
        id: String((orgRaw as { id: unknown }).id ?? ''),
        name: ((orgRaw as { name?: string | null }).name as string | null) ?? null,
        slug: ((orgRaw as { slug?: string | null }).slug as string | null) ?? null,
        logo_url: ((orgRaw as { logo_url?: string | null }).logo_url as string | null) ?? null,
        address: ((orgRaw as { address?: string | null }).address as string | null) ?? null,
        city: ((orgRaw as { city?: string | null }).city as string | null) ?? null,
        created_at: String((orgRaw as { created_at?: unknown }).created_at ?? ''),
        is_company_verified: isVerified,
        show_financing: showFinancing,
        sold_count: soldCount,
        active_count: activeCount,
      }
    : null

  return {
    id: String(row.id),
    title: String(row.title ?? ''),
    make: (row.make as string | null) ?? null,
    model: (row.model as string | null) ?? null,
    year: (row.year as number | null) ?? null,
    price: (row.price as number | null) ?? null,
    images: Array.isArray(row.images) ? (row.images as string[]) : [],
    contact_via_chat: Boolean(row.contact_via_chat ?? true),
    show_phone: Boolean(row.show_phone ?? false),
    contact_phone: (row.contact_phone as string | null) ?? null,
    show_email: Boolean(row.show_email ?? false),
    attributes: (row.attributes as PublicListingDetail['attributes']) ?? {},
    created_at: String(row.created_at),
    views_count: viewsCount,
    seller_id: (row.user_id as string | null) ?? null,
    organization_id: orgId,
    organization,
  }
}

// ─── getRelatedListings ───────────────────────────────────────────────────────

export async function getRelatedListings(
  _supabase: SupabaseClient,
  organizationId: string,
  excludeListingId: string
): Promise<PublicListing[]> {
  if (!supabaseAdmin) return []

  const { data: rows, error } = await supabaseAdmin
    .from('listings')
    .select('id, title, make, model, year, price, images, attributes, seller_type, organizations(name, slug, logo_url)')
    .eq('source_site', 'bilar')
    .eq('status', 'active')
    .eq('organization_id', organizationId)
    .neq('id', excludeListingId)
    .order('created_at', { ascending: false })
    .limit(5)

  if (error || !rows) return []

  return rows.map((row): PublicListing => {
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
}

// ─── logView ──────────────────────────────────────────────────────────────────

export async function logView(
  _supabase: SupabaseClient,
  listingId: string,
  sellerId: string | null,
  viewerId?: string
): Promise<void> {
  if (!supabaseAdmin) return

  await supabaseAdmin.from('listing_views').insert({
    listing_id: listingId,
    seller_id: sellerId,
    viewer_id: viewerId ?? null,
  })
}

// ─── DealerProfile ────────────────────────────────────────────────────────────

export interface DealerProfile {
  id: string
  name: string | null
  slug: string | null
  logo_url: string | null
  address: string | null
  city: string | null
  created_at: string
  is_company_verified: boolean
  active_count: number
  sold_count: number
}

export interface DealerListingsFilters {
  make?: string
  minPrice?: number
  maxPrice?: number
}

// ─── getOrganizationBySlug ────────────────────────────────────────────────────

export async function getOrganizationBySlug(
  _supabase: SupabaseClient,
  slug: string
): Promise<DealerProfile | null> {
  if (!supabaseAdmin) return null

  const { data: org, error } = await supabaseAdmin
    .from('organizations')
    .select('id, name, slug, logo_url, address, city, created_at')
    .eq('slug', slug)
    .maybeSingle()

  if (error || !org) return null

  const orgId = String(org.id)

  const [activeResult, soldResult, verifiedResult] = await Promise.all([
    supabaseAdmin
      .from('listings')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', orgId)
      .eq('source_site', 'bilar')
      .eq('status', 'active'),

    supabaseAdmin
      .from('listing_sales')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', orgId),

    supabaseAdmin
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', orgId)
      .eq('is_company_verified', true),
  ])

  return {
    id: orgId,
    name: (org.name as string | null) ?? null,
    slug: (org.slug as string | null) ?? null,
    logo_url: (org.logo_url as string | null) ?? null,
    address: (org.address as string | null) ?? null,
    city: (org.city as string | null) ?? null,
    created_at: String(org.created_at),
    is_company_verified: ((verifiedResult as { count: number | null }).count ?? 0) > 0,
    active_count: (activeResult as { count: number | null }).count ?? 0,
    sold_count: (soldResult as { count: number | null }).count ?? 0,
  }
}

// ─── getOrganizationListings ──────────────────────────────────────────────────

export async function getOrganizationListings(
  _supabase: SupabaseClient,
  organizationId: string,
  filters?: DealerListingsFilters,
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
    .eq('organization_id', organizationId)
    .eq('source_site', 'bilar')
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .range(offset, offset + PAGE_SIZE - 1)

  if (filters?.make) {
    query = query.eq('make', filters.make)
  }
  if (filters?.minPrice) {
    query = query.gte('price', filters.minPrice)
  }
  if (filters?.maxPrice) {
    query = query.lte('price', filters.maxPrice)
  }

  const { data: rows, error, count } = await query

  if (error) {
    console.error('[bilar-public-service] getOrganizationListings error', error)
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
