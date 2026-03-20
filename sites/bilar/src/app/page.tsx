import { createClient } from '../lib/supabase/server'
import {
  getPublicListings,
  getFeaturedMakes,
  getFavoriteIds,
} from '../lib/features/bilar-public-service'
import type { PublicListingsFilters, PublicListing } from '../lib/features/bilar-public-service'
import BilarHomeClient from './components/BilarHomeClient'

export const dynamic = 'force-dynamic'
export const revalidate = 0

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toStr(v: string | string[] | undefined): string {
  if (!v) return ''
  return Array.isArray(v) ? v[0] : v
}

function toNum(v: string | string[] | undefined): number | undefined {
  const s = toStr(v)
  if (!s) return undefined
  const n = Number(s)
  return Number.isNaN(n) ? undefined : n
}

// ─── Search params type ───────────────────────────────────────────────────────

interface HomeSearchParams {
  [key: string]: string | string[] | undefined
  q?: string | string[]
  make?: string | string[]
  model?: string | string[]
  minPrice?: string | string[]
  maxPrice?: string | string[]
  fuelType?: string | string[]
  gearbox?: string | string[]
  yearFrom?: string | string[]
  yearTo?: string | string[]
  page?: string | string[]
}

interface HomePageProps {
  searchParams?: Promise<HomeSearchParams>
}

// ─── Server Actions ───────────────────────────────────────────────────────────

async function loadMoreAction(
  page: number,
  filterMap: Record<string, string>
): Promise<PublicListing[]> {
  'use server'
  const supabase = await createClient()
  const filters: PublicListingsFilters = {
    q: filterMap.q || undefined,
    make: filterMap.make || undefined,
    model: filterMap.model || undefined,
    minPrice: filterMap.minPrice ? Number(filterMap.minPrice) : undefined,
    maxPrice: filterMap.maxPrice ? Number(filterMap.maxPrice) : undefined,
    fuelType: filterMap.fuelType || undefined,
    gearbox: filterMap.gearbox || undefined,
    yearFrom: filterMap.yearFrom ? Number(filterMap.yearFrom) : undefined,
    yearTo: filterMap.yearTo ? Number(filterMap.yearTo) : undefined,
  }
  const { listings } = await getPublicListings(supabase, filters, page)
  return listings
}

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

export default async function HomePage({ searchParams }: HomePageProps) {
  const params = (await searchParams) ?? {}

  const q = toStr(params.q)
  const make = toStr(params.make)
  const model = toStr(params.model)
  const minPrice = toNum(params.minPrice) ?? 0
  const maxPrice = toNum(params.maxPrice) ?? 2_000_000
  const fuelType = toStr(params.fuelType)
  const gearbox = toStr(params.gearbox)
  const yearFrom = toStr(params.yearFrom)
  const yearTo = toStr(params.yearTo)

  const filters: PublicListingsFilters = {
    q: q || undefined,
    make: make || undefined,
    model: model || undefined,
    minPrice: minPrice > 0 ? minPrice : undefined,
    maxPrice: maxPrice < 2_000_000 ? maxPrice : undefined,
    fuelType: fuelType || undefined,
    gearbox: gearbox || undefined,
    yearFrom: yearFrom ? Number(yearFrom) : undefined,
    yearTo: yearTo ? Number(yearTo) : undefined,
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const [{ listings, total }, featuredMakes, favoriteIds] = await Promise.all([
    getPublicListings(supabase, filters, 1),
    getFeaturedMakes(supabase),
    user ? getFavoriteIds(supabase) : Promise.resolve([]),
  ])

  return (
    <BilarHomeClient
      initialListings={listings}
      initialTotal={total}
      featuredMakes={featuredMakes}
      favoriteIds={favoriteIds}
      isLoggedIn={!!user}
      initialFilters={{
        q,
        make,
        model,
        minPrice,
        maxPrice,
        fuelType,
        gearbox,
        yearFrom,
        yearTo,
      }}
      loadMoreAction={loadMoreAction}
      toggleFavoriteAction={toggleFavoriteAction}
    />
  )
}
