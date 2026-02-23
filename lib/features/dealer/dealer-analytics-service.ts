import { supabaseAdmin } from '@/lib/supabase/admin'

export interface ListingWithStats {
  id: string
  title: string
  status: string
  price: number
  make?: string | null
  model?: string | null
  year?: number | null
  previous_price: number | null
  bortskankes: boolean
  views: number
  leads: number
  favorites: number
  /** Health %: +40% (>3 images), +30% (desc>100), +30% (≥1 view). Images+desc ger poäng även utan visningar. */
  healthScore: number
}

export interface DealerDashboardData {
  totalViews: number
  totalLeads: number
  activeConversationsCount: number
  activeListingsCount: number
  /** Inventory Health: average health % across active listings */
  averageHealthPercent: number
  trendingListings: { id: string; title: string; views: number }[]
  priceDropListings: { id: string; title: string; price: number; previous_price: number }[]
  inventory: ListingWithStats[]
  leadActionItems: LeadActionItem[]
}

export type LeadStatus = 'new' | 'contacted' | 'qualified' | 'sold' | 'archived'

export interface LeadActionItem {
  id: string
  listing_id: string | null
  listing_title: string
  listing_make: string | null
  listing_model: string | null
  listing_year: number | null
  buyer_name: string
  buyer_email: string | null
  buyer_phone: string
  status: LeadStatus
  created_at: string
}

export interface DealerDashboardOptions {
  /** Org-ägarens id (user_id på listings). För säljare: parent_organization_id ?? userId */
  orgOwnerId: string
  /** Tenant-id (organization_id). Fallback till orgOwnerId för bakåtkompatibilitet. */
  organizationId?: string | null
  /** true = admin ser alla listningar; false = säljare ser endast contact_email = userEmail */
  isAdmin: boolean
  /** Säljarens e-post – används för filtrering när isAdmin = false */
  userEmail?: string | null
}

/**
 * Hämta all data för dealer-dashboarden.
 * Kräver account_type = 'company' (dealer).
 * Admin: alla listningar där user_id = orgOwnerId.
 * Seller: listningar där user_id = orgOwnerId AND contact_email = userEmail.
 */
export async function getDealerDashboardData(
  userId: string,
  options?: DealerDashboardOptions
): Promise<DealerDashboardData> {
  const orgOwnerId = options?.orgOwnerId ?? userId
  const organizationId = options?.organizationId?.trim() || orgOwnerId
  const isAdmin = options?.isAdmin ?? true
  const userEmail = options?.userEmail?.trim() || null

  if (!supabaseAdmin) {
    console.error('[dealer-analytics] supabaseAdmin saknas – SUPABASE_SERVICE_ROLE_KEY krävs.')
    return {
      totalViews: 0,
      totalLeads: 0,
      activeConversationsCount: 0,
      activeListingsCount: 0,
      averageHealthPercent: 0,
      trendingListings: [],
      priceDropListings: [],
      inventory: [],
      leadActionItems: [],
    }
  }

  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

  // 1. Total Views – direkt count från listing_views (alltid, även utan listings)
  const { count: totalViewsCount, error: viewsError } = await supabaseAdmin
    .from('listing_views')
    .select('*', { count: 'exact', head: true })
    .eq('organization_id', organizationId)

  if (viewsError) {
    console.error('[dealer-analytics] listing_views count error:', viewsError.message, 'code:', viewsError.code)
  }
  const totalViews = totalViewsCount ?? 0
  console.log('[dealer-analytics] orgOwnerId:', orgOwnerId, 'organizationId:', organizationId, 'totalViews (count):', totalViews)

  // 2. Listings – supabaseAdmin, user_id = orgOwnerId, inga status-filter (alla: active, sold, deleted)
  let listingsQuery = supabaseAdmin
    .from('listings')
    .select('id, title, status, price, make, model, year, previous_price, bortskankes, images, description')
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false })

  if (!isAdmin && userEmail) {
    listingsQuery = listingsQuery.eq('contact_email', userEmail)
  }

  const { data: listings, error: listingsError } = await listingsQuery

  if (listingsError) {
    console.error('[dealer-analytics] listings query error:', listingsError.message, 'code:', listingsError.code)
  }
  const listingIds = (listings ?? []).map((l: { id: string }) => l.id)
  console.log('[dealer-analytics] Listings found for user:', (listings ?? []).length, 'orgOwnerId:', orgOwnerId)

  // 3. Aktiva konversationer
  const { data: dealerConvs } = await supabaseAdmin
    .from('conversations')
    .select('id')
    .eq('seller_id', orgOwnerId)
  const activeConversationsCount = (dealerConvs ?? []).length

  // 4. Leads
  const { data: leadsAllData } = await supabaseAdmin
    .from('leads')
    .select('id, listing_id, buyer_name, buyer_email, buyer_phone, status, created_at, listing:listings(id, title, make, model, year)')
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false })

  const leadsAll = (leadsAllData ?? []) as Array<{
    id: string
    listing_id: string | null
    buyer_name: string
    buyer_email?: string | null
    buyer_phone: string
    status?: string | null
    created_at: string
    listing?: {
      id?: string
      title?: string | null
      make?: string | null
      model?: string | null
      year?: number | null
    } | null
  }>
  const totalLeads = leadsAll.length
  const leadActionItems: LeadActionItem[] = leadsAll.map((lead) => ({
    id: lead.id,
    listing_id: lead.listing_id,
    listing_title: lead.listing?.title?.trim() || 'Borttagen annons',
    listing_make: lead.listing?.make ?? null,
    listing_model: lead.listing?.model ?? null,
    listing_year: lead.listing?.year ?? null,
    buyer_name: lead.buyer_name,
    buyer_email: lead.buyer_email ?? null,
    buyer_phone: lead.buyer_phone,
    status: (lead.status === 'contacted' || lead.status === 'qualified' || lead.status === 'sold' || lead.status === 'archived'
      ? lead.status
      : 'new'),
    created_at: lead.created_at,
  }))

  // 5. listing_views för per-listing breakdown (trending, inventory)
  const { data: viewsDataRaw } = await supabaseAdmin
    .from('listing_views')
    .select('listing_id, created_at')
    .eq('organization_id', organizationId)

  const viewsData = (viewsDataRaw ?? []) as { listing_id: string; created_at: string }[]

  // Early return när inga listings – men totalViews/leads behålls
  if (listingIds.length === 0) {
    return {
      totalViews,
      totalLeads,
      activeConversationsCount,
      activeListingsCount: 0,
      averageHealthPercent: 0,
      trendingListings: [],
      priceDropListings: [],
      inventory: [],
      leadActionItems,
    }
  }
  const listingMap = new Map(
    (listings ?? []).map((l: {
      id: string
      title: string
      status: string
      price: number
      make?: string | null
      model?: string | null
      year?: number | null
      previous_price: number | null
      bortskankes: boolean
      images?: string[] | null
      description?: string | null
    }) => [
      l.id,
      {
        title: l.title,
        status: l.status,
        price: l.price,
        make: l.make ?? null,
        model: l.model ?? null,
        year: l.year ?? null,
        previous_price: l.previous_price,
        bortskankes: l.bortskankes,
        images: l.images ?? [],
        description: l.description ?? '',
      },
    ])
  )

  const viewsByListing = new Map<string, number>()
  const viewsLast7ByListing = new Map<string, number>()
  const leadsByListing = new Map<string, number>()

  for (const a of viewsData) {
    if (a.listing_id) {
      viewsByListing.set(a.listing_id, (viewsByListing.get(a.listing_id) ?? 0) + 1)
      if (new Date(a.created_at) >= sevenDaysAgo) {
        viewsLast7ByListing.set(a.listing_id, (viewsLast7ByListing.get(a.listing_id) ?? 0) + 1)
      }
    }
  }

  for (const l of leadsAll) {
    if (l.listing_id) {
      leadsByListing.set(l.listing_id, (leadsByListing.get(l.listing_id) ?? 0) + 1)
    }
  }

  // 6. Favorites per listing
  const { data: favoritesData } = await supabaseAdmin
    .from('favorites')
    .select('listing_id')
    .in('listing_id', listingIds)

  const favoritesByListing = new Map<string, number>()
  for (const f of (favoritesData ?? []) as { listing_id: string }[]) {
    if (f.listing_id) {
      favoritesByListing.set(f.listing_id, (favoritesByListing.get(f.listing_id) ?? 0) + 1)
    }
  }

  const activeListings = (listings ?? []).filter((l: { status: string }) => l.status === 'active')

  const trendingListings = listingIds
    .map((id) => ({
      id,
      title: listingMap.get(id)?.title ?? 'Okänd',
      views: viewsLast7ByListing.get(id) ?? 0,
    }))
    .filter((l) => l.views > 0)
    .sort((a, b) => b.views - a.views)
    .slice(0, 3)

  const priceDropListings = (listings ?? [])
    .filter(
      (l: { previous_price: number | null; price: number }) =>
        l.previous_price != null && l.price < l.previous_price
    )
    .map((l: { id: string; title: string; price: number; previous_price: number }) => ({
      id: l.id,
      title: l.title,
      price: l.price,
      previous_price: l.previous_price,
    }))
    .slice(0, 5)

  const inventory: ListingWithStats[] = (listings ?? []).map(
    (l: {
      id: string
      title: string
      status: string
      price: number
      make?: string | null
      model?: string | null
      year?: number | null
      previous_price: number | null
      bortskankes: boolean
      images?: string[] | null
      description?: string | null
    }) => {
      const views = viewsByListing.get(l.id) ?? 0
      const images = l.images ?? []
      const descLen = (l.description ?? '').length
      const healthScore =
        (images.length > 3 ? 40 : 0) +
        (descLen > 100 ? 30 : 0) +
        (views >= 1 ? 30 : 0)
      return {
        id: l.id,
        title: l.title,
        status: l.status,
        price: l.price,
        make: l.make ?? null,
        model: l.model ?? null,
        year: l.year ?? null,
        previous_price: l.previous_price,
        bortskankes: l.bortskankes,
        views,
        leads: leadsByListing.get(l.id) ?? 0,
        favorites: favoritesByListing.get(l.id) ?? 0,
        healthScore,
      }
    }
  )

  // Health-snitt över hela inventariet (alla statusar)
  const averageHealthPercent =
    inventory.length > 0
      ? Math.round(
          inventory.reduce((s, l) => s + l.healthScore, 0) / inventory.length
        )
      : 0

  console.log('[dealer-analytics] Calculated health:', averageHealthPercent, 'inventory:', inventory.length)

  return {
    totalViews,
    totalLeads,
    activeConversationsCount,
    activeListingsCount: activeListings.length,
    averageHealthPercent,
    trendingListings,
    priceDropListings,
    inventory,
    leadActionItems,
  }
}
