import type { SupabaseClient } from '@supabase/supabase-js'
import { supabaseAdmin } from '../supabase/admin'

// ─────────────────────────────────────────────
// Typer
// ─────────────────────────────────────────────

export interface DashboardKpis {
  activeListings: number
  newLeads: number
  views30d: number
  salesThisMonth: number
  slaPercent: number | null  // null = otillräckligt underlag
}

export type LeadStatus = 'new' | 'contacted' | 'qualified' | 'sold' | 'archived'

export interface RecentLead {
  id: string
  buyerName: string
  listingTitle: string
  status: LeadStatus
  sourceSite: string
  createdAt: string
}

export interface RecentListing {
  id: string
  thumbnailUrl: string | null
  make: string | null
  model: string | null
  year: number | null
  price: number
  status: string
}

// ─────────────────────────────────────────────
// getDashboardKpis
// ─────────────────────────────────────────────

export async function getDashboardKpis(
  _supabase: SupabaseClient,
  organizationId: string,
  ownerUserId: string
): Promise<DashboardKpis> {
  const empty: DashboardKpis = {
    activeListings: 0,
    newLeads: 0,
    views30d: 0,
    salesThisMonth: 0,
    slaPercent: null,
  }

  if (!supabaseAdmin) {
    console.error('[bilar-dashboard] supabaseAdmin saknas.')
    return empty
  }

  const now = new Date()
  const thirtyDaysAgo = new Date(now)
  thirtyDaysAgo.setDate(now.getDate() - 30)
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

  // 1. Aktiva annonser
  const { count: activeListings } = await supabaseAdmin
    .from('listings')
    .select('*', { count: 'exact', head: true })
    .eq('organization_id', organizationId)
    .eq('status', 'active')
    .eq('source_site', 'bilar')

  // 2. Nya leads
  const { count: newLeads } = await supabaseAdmin
    .from('leads')
    .select('*', { count: 'exact', head: true })
    .eq('organization_id', organizationId)
    .eq('status', 'new')

  // 3. Visningar senaste 30 dagarna (seller_id = org owner)
  const { count: views30d } = await supabaseAdmin
    .from('listing_views')
    .select('*', { count: 'exact', head: true })
    .eq('seller_id', ownerUserId)
    .gte('created_at', thirtyDaysAgo.toISOString())

  // 4. Avslut innevarande månad
  const { count: salesThisMonth } = await supabaseAdmin
    .from('listing_sales')
    .select('*', { count: 'exact', head: true })
    .eq('organization_id', organizationId)
    .gte('sold_at', startOfMonth.toISOString())

  // 5. SLA-status — andel leads med svar inom 15 min, senaste 30 dagar
  const { data: recentLeads } = await supabaseAdmin
    .from('leads')
    .select('created_at, first_response_at')
    .eq('organization_id', organizationId)
    .gte('created_at', thirtyDaysAgo.toISOString())

  let slaPercent: number | null = null
  if (recentLeads && recentLeads.length > 0) {
    const withResponse = recentLeads.filter((l) => l.first_response_at != null)
    const withinSla = withResponse.filter((l) => {
      const diffMs =
        new Date(l.first_response_at).getTime() -
        new Date(l.created_at).getTime()
      return diffMs <= 15 * 60 * 1000
    })
    slaPercent = Math.round((withinSla.length / recentLeads.length) * 100)
  }

  return {
    activeListings: activeListings ?? 0,
    newLeads: newLeads ?? 0,
    views30d: views30d ?? 0,
    salesThisMonth: salesThisMonth ?? 0,
    slaPercent,
  }
}

// ─────────────────────────────────────────────
// getRecentLeads
// ─────────────────────────────────────────────

export async function getRecentLeads(
  _supabase: SupabaseClient,
  organizationId: string
): Promise<RecentLead[]> {
  if (!supabaseAdmin) return []

  const { data: leads } = await supabaseAdmin
    .from('leads')
    .select('id, status, source_site, created_at, buyer_id, listing_id, listings(title, make, model)')
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false })
    .limit(5)

  if (!leads || leads.length === 0) return []

  // Hämta köparprofiler
  const buyerIds = [...new Set(leads.map((l: { buyer_id: string | null }) => l.buyer_id).filter(Boolean))] as string[]

  const profileMap = new Map<string, string>()
  if (buyerIds.length > 0) {
    const { data: profiles } = await supabaseAdmin
      .from('profiles')
      .select('id, full_name')
      .in('id', buyerIds)

    for (const p of profiles ?? []) {
      if (p.id && p.full_name) profileMap.set(p.id, p.full_name)
    }
  }

  // Supabase returnerar FK-joins som array — vi tar första elementet
  type LeadRow = {
    id: string
    status: string | null
    source_site: string | null
    created_at: string
    buyer_id: string | null
    listing_id: string | null
    listings: { title?: string | null; make?: string | null; model?: string | null }[] | null
  }

  return (leads as LeadRow[]).map((l) => {
    const listing = Array.isArray(l.listings) ? l.listings[0] : null
    const listingTitle = listing?.title?.trim()
      || [listing?.make, listing?.model].filter(Boolean).join(' ')
      || 'Okänd annons'

    const status: LeadStatus =
      l.status === 'contacted' || l.status === 'qualified' || l.status === 'sold' || l.status === 'archived'
        ? (l.status as LeadStatus)
        : 'new'

    return {
      id: l.id,
      buyerName: (l.buyer_id && profileMap.get(l.buyer_id)) || 'Anonym',
      listingTitle,
      status,
      sourceSite: l.source_site ?? 'bilar',
      createdAt: l.created_at,
    }
  })
}

// ─────────────────────────────────────────────
// getRecentListings
// ─────────────────────────────────────────────

export async function getRecentListings(
  _supabase: SupabaseClient,
  organizationId: string
): Promise<RecentListing[]> {
  if (!supabaseAdmin) return []

  const { data: listings } = await supabaseAdmin
    .from('listings')
    .select('id, make, model, year, price, status, images')
    .eq('organization_id', organizationId)
    .eq('status', 'active')
    .eq('source_site', 'bilar')
    .order('created_at', { ascending: false })
    .limit(5)

  return (listings ?? []).map((l: {
    id: string
    make: string | null
    model: string | null
    year: number | null
    price: number
    status: string
    images: string[] | null
  }) => ({
    id: l.id,
    thumbnailUrl: l.images?.[0] ?? null,
    make: l.make,
    model: l.model,
    year: l.year,
    price: l.price,
    status: l.status,
  }))
}
