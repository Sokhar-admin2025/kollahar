import { notFound } from 'next/navigation'
import { createClient } from '../../../lib/supabase/server'
import {
  getOrganizationBySlug,
  getOrganizationListings,
} from '../../../lib/features/bilar-public-service'
import type { PublicListing, DealerListingsFilters } from '../../../lib/features/bilar-public-service'
import BilarDealerProfileClient from './BilarDealerProfileClient'

export const dynamic = 'force-dynamic'
export const revalidate = 0

// ─── Types ────────────────────────────────────────────────────────────────────

interface PageProps {
  params: Promise<{ slug: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

// ─── Metadata ─────────────────────────────────────────────────────────────────

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params
  const supabase = await createClient()
  const dealer = await getOrganizationBySlug(supabase, slug)
  if (!dealer) return { title: 'Handlare hittades inte' }
  return {
    title: `${dealer.name} — KollaBilar`,
    description: `Se alla bilar från ${dealer.name}${dealer.city ? ` i ${dealer.city}` : ''}. ${dealer.active_count} aktiva annonser.`,
  }
}

// ─── Server Actions ───────────────────────────────────────────────────────────

async function toggleFavoriteAction(
  listingId: string
): Promise<{ success: boolean }> {
  'use server'
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false }

  const { data: existing } = await supabase
    .from('favorites')
    .select('id')
    .eq('user_id', user.id)
    .eq('listing_id', listingId)
    .maybeSingle()

  if (existing) {
    await supabase
      .from('favorites')
      .delete()
      .eq('user_id', user.id)
      .eq('listing_id', listingId)
  } else {
    await supabase
      .from('favorites')
      .insert({ user_id: user.id, listing_id: listingId })
  }
  return { success: true }
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const MAX_PRICE = 2_000_000

export default async function HandlarePage({ params, searchParams }: PageProps) {
  const { slug } = await params
  const sp = await searchParams

  // Parse filters from URL
  const make = typeof sp.make === 'string' ? sp.make : ''
  const minPrice = Math.max(0, parseInt(typeof sp.minPrice === 'string' ? sp.minPrice : '0') || 0)
  const maxPrice = Math.min(
    MAX_PRICE,
    parseInt(typeof sp.maxPrice === 'string' ? sp.maxPrice : String(MAX_PRICE)) || MAX_PRICE
  )

  const filters: DealerListingsFilters = {
    ...(make ? { make } : {}),
    ...(minPrice > 0 ? { minPrice } : {}),
    ...(maxPrice < MAX_PRICE ? { maxPrice } : {}),
  }

  const supabase = await createClient()

  // Fetch dealer first — needed for organization_id
  const dealer = await getOrganizationBySlug(supabase, slug)
  if (!dealer) notFound()

  // Parallel: filtered listings + unfiltered page-1 (for available makes) + auth user
  const [
    { listings, total },
    { listings: allListings },
    {
      data: { user },
    },
  ] = await Promise.all([
    getOrganizationListings(supabase, dealer.id, filters, 1),
    getOrganizationListings(supabase, dealer.id, {}, 1),
    supabase.auth.getUser(),
  ])

  // Derive unique makes from unfiltered first page
  const availableMakes = Array.from(
    new Set(
      allListings
        .map((l: PublicListing) => l.make)
        .filter((m): m is string => Boolean(m))
    )
  ).sort()

  // Bound load-more action capturing dealer.id in closure
  const loadMoreAction = async (
    page: number,
    serverFilters: Record<string, string>
  ): Promise<PublicListing[]> => {
    'use server'
    const sc = await createClient()
    const f: DealerListingsFilters = {}
    if (serverFilters.make) f.make = serverFilters.make
    if (serverFilters.minPrice) f.minPrice = parseInt(serverFilters.minPrice)
    if (serverFilters.maxPrice) f.maxPrice = parseInt(serverFilters.maxPrice)
    const { listings: more } = await getOrganizationListings(sc, dealer.id, f, page)
    return more
  }

  return (
    <BilarDealerProfileClient
      dealer={dealer}
      initialListings={listings}
      initialTotal={total}
      availableMakes={availableMakes}
      isLoggedIn={!!user}
      initialFilters={{ make, minPrice, maxPrice }}
      loadMoreAction={loadMoreAction}
      toggleFavoriteAction={toggleFavoriteAction}
    />
  )
}
