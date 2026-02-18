import { createClient } from '@/lib/supabase/server'

export interface ListingWithStats {
  id: string
  title: string
  status: string
  price: number
  previous_price: number | null
  bortskankes: boolean
  views: number
  leads: number
}

export interface DealerDashboardData {
  totalViews: number
  hotLeadsLast30Days: number
  activeListingsCount: number
  trendingListings: { id: string; title: string; views: number }[]
  priceDropListings: { id: string; title: string; price: number; previous_price: number }[]
  inventory: ListingWithStats[]
}

export interface DealerDashboardOptions {
  /** Org-ägarens id (user_id på listings). För säljare: parent_organization_id ?? userId */
  orgOwnerId: string
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
  const supabase = await createClient()
  const orgOwnerId = options?.orgOwnerId ?? userId
  const isAdmin = options?.isAdmin ?? true
  const userEmail = options?.userEmail?.trim() || null

  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  let query = supabase
    .from('listings')
    .select('id, title, status, price, previous_price, bortskankes')
    .eq('user_id', orgOwnerId)
    .order('created_at', { ascending: false })

  if (!isAdmin && userEmail) {
    query = query.eq('contact_email', userEmail)
  }

  const { data: listings } = await query

  const listingIds = (listings ?? []).map((l: { id: string }) => l.id)
  if (listingIds.length === 0) {
    return {
      totalViews: 0,
      hotLeadsLast30Days: 0,
      activeListingsCount: 0,
      trendingListings: [],
      priceDropListings: [],
      inventory: [],
    }
  }

  const [analyticsRes, leadsLast30Res, leadsAllRes] = await Promise.all([
    supabase
      .from('analytics_events')
      .select('listing_id, event_type, created_at')
      .in('listing_id', listingIds)
      .eq('event_type', 'view'),
    supabase
      .from('leads')
      .select('listing_id')
      .in('listing_id', listingIds)
      .eq('status', 'hot')
      .gte('created_at', thirtyDaysAgo.toISOString()),
    supabase
      .from('leads')
      .select('listing_id')
      .in('listing_id', listingIds),
  ])

  const analytics = (analyticsRes.data ?? []) as { listing_id: string; created_at: string }[]
  const leadsLast30 = (leadsLast30Res.data ?? []) as { listing_id: string }[]
  const leadsAll = (leadsAllRes.data ?? []) as { listing_id: string }[]
  const listingMap = new Map(
    (listings ?? []).map((l: { id: string; title: string; status: string; price: number; previous_price: number | null; bortskankes: boolean }) => [
      l.id,
      { title: l.title, status: l.status, price: l.price, previous_price: l.previous_price, bortskankes: l.bortskankes },
    ])
  )

  const viewsByListing = new Map<string, number>()
  const viewsLast7ByListing = new Map<string, number>()
  const leadsByListing = new Map<string, number>()

  for (const a of analytics) {
    viewsByListing.set(a.listing_id, (viewsByListing.get(a.listing_id) ?? 0) + 1)
    if (new Date(a.created_at) >= sevenDaysAgo) {
      viewsLast7ByListing.set(a.listing_id, (viewsLast7ByListing.get(a.listing_id) ?? 0) + 1)
    }
  }

  for (const l of leadsAll) {
    leadsByListing.set(l.listing_id, (leadsByListing.get(l.listing_id) ?? 0) + 1)
  }

  const totalViews = analytics.length
  const hotLeadsLast30Days = leadsLast30.length
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
    (l: { id: string; title: string; status: string; price: number; previous_price: number | null; bortskankes: boolean }) => ({
      id: l.id,
      title: l.title,
      status: l.status,
      price: l.price,
      previous_price: l.previous_price,
      bortskankes: l.bortskankes,
      views: viewsByListing.get(l.id) ?? 0,
      leads: leadsByListing.get(l.id) ?? 0,
    })
  )

  return {
    totalViews,
    hotLeadsLast30Days,
    activeListingsCount: activeListings.length,
    trendingListings,
    priceDropListings,
    inventory,
  }
}
