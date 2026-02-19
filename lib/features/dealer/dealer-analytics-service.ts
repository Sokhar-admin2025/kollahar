import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

export interface ListingWithStats {
  id: string
  title: string
  status: string
  price: number
  previous_price: number | null
  bortskankes: boolean
  views: number
  leads: number
  /** Health: (views > 0) AND (>= 3 images) AND (description > 100 chars) */
  health: boolean
}

export interface DealerDashboardData {
  totalViews: number
  hotLeadsLast30Days: number
  unreadChatMessages: number
  activeListingsCount: number
  /** Inventory Health: active listings where health = true */
  healthyListingsCount: number
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

  // Use supabaseAdmin for listings to bypass RLS (avoids session/cookie issues).
  // We filter strictly by user_id = orgOwnerId; user is already verified as dealer.
  const listClient = supabaseAdmin ?? supabase

  let query = listClient
    .from('listings')
    .select('id, title, status, price, previous_price, bortskankes, images, description')
    .eq('user_id', orgOwnerId)
    .order('created_at', { ascending: false })

  if (!isAdmin && userEmail) {
    query = query.eq('contact_email', userEmail)
  }

  const { data: listings, error: listingsError } = await query

  if (listingsError) {
    console.error('[dealer-analytics] listings query error:', listingsError.message)
  }

  const listingIds = (listings ?? []).map((l: { id: string }) => l.id)

  // Hämta olästa chattmeddelanden (dealer som säljare) – separat från leads
  const { data: dealerConvs } = await supabase
    .from('conversations')
    .select('id')
    .eq('seller_id', orgOwnerId)
  const dealerConvIds = (dealerConvs ?? []).map((c: { id: string }) => c.id)

  let unreadChatMessages = 0
  if (dealerConvIds.length > 0) {
    const { count } = await supabase
      .from('messages')
      .select('id', { count: 'exact', head: true })
      .in('conversation_id', dealerConvIds)
      .eq('is_read', false)
      .neq('sender_id', orgOwnerId)
    unreadChatMessages = count ?? 0
  }

  // Always fetch leads by seller_id – Hot Leads counter works even when listingIds is empty.
  const leadsClient = supabaseAdmin ?? supabase

  const [leadsLast30Res, leadsAllRes] = await Promise.all([
    leadsClient
      .from('leads')
      .select('listing_id')
      .eq('seller_id', orgOwnerId)
      .eq('status', 'hot')
      .gte('created_at', thirtyDaysAgo.toISOString()),
    leadsClient
      .from('leads')
      .select('listing_id')
      .eq('seller_id', orgOwnerId),
  ])

  const leadsLast30 = (leadsLast30Res.data ?? []) as { listing_id: string }[]
  const leadsAll = (leadsAllRes.data ?? []) as { listing_id: string }[]
  const hotLeadsLast30Days = leadsLast30.length

  // Early return when no listings – but keep Hot Leads count from above
  if (listingIds.length === 0) {
    return {
      totalViews: 0,
      hotLeadsLast30Days,
      unreadChatMessages,
      activeListingsCount: 0,
      healthyListingsCount: 0,
      trendingListings: [],
      priceDropListings: [],
      inventory: [],
    }
  }

  // Use listing_views for Total Views (client-side view tracker)
  const [viewsRes] = await Promise.all([
    listClient
      .from('listing_views')
      .select('listing_id, created_at')
      .in('listing_id', listingIds),
  ])

  const viewsData = (viewsRes.data ?? []) as { listing_id: string; created_at: string }[]
  const listingMap = new Map(
    (listings ?? []).map((l: {
      id: string
      title: string
      status: string
      price: number
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
    viewsByListing.set(a.listing_id, (viewsByListing.get(a.listing_id) ?? 0) + 1)
    if (new Date(a.created_at) >= sevenDaysAgo) {
      viewsLast7ByListing.set(a.listing_id, (viewsLast7ByListing.get(a.listing_id) ?? 0) + 1)
    }
  }

  for (const l of leadsAll) {
    leadsByListing.set(l.listing_id, (leadsByListing.get(l.listing_id) ?? 0) + 1)
  }

  const totalViews = viewsData.length
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
      previous_price: number | null
      bortskankes: boolean
      images?: string[] | null
      description?: string | null
    }) => {
      const views = viewsByListing.get(l.id) ?? 0
      const images = l.images ?? []
      const descLen = (l.description ?? '').length
      const health = views > 0 && images.length >= 3 && descLen > 100
      return {
        id: l.id,
        title: l.title,
        status: l.status,
        price: l.price,
        previous_price: l.previous_price,
        bortskankes: l.bortskankes,
        views,
        leads: leadsByListing.get(l.id) ?? 0,
        health,
      }
    }
  )

  const healthyListingsCount = inventory.filter(
    (l) => l.status === 'active' && l.health
  ).length

  return {
    totalViews,
    hotLeadsLast30Days,
    unreadChatMessages,
    activeListingsCount: activeListings.length,
    healthyListingsCount,
    trendingListings,
    priceDropListings,
    inventory,
  }
}
