import HomePageClient from './HomePageClient'
import { createClient } from '@/lib/supabase/server'
import { getListings, getFavoriteIds, type ListingSearchFilters } from '@/lib/features/listings/listing-service'

const PAGE_SIZE = 24

type HomePageSearchParams = {
  [key: string]: string | string[] | undefined
  q?: string | string[]
  category?: string | string[]
  location?: string | string[]
  minPrice?: string | string[]
  maxPrice?: string | string[]
  bortskankes?: string | string[]
  seller?: string | string[]
  minYear?: string | string[]
  maxYear?: string | string[]
  maxMileage?: string | string[]
  make?: string | string[]
  model?: string | string[]
  sort?: string | string[]
}

interface HomePageProps {
  searchParams?: Promise<HomePageSearchParams>
}

export default async function HomePage({ searchParams }: HomePageProps) {
  const params = (await searchParams) ?? {}
  const qParam = params.q
  const categoryParam = params.category
  const locationParam = params.location
  const minPriceParam = params.minPrice
  const maxPriceParam = params.maxPrice
  const minYearParam = params.minYear
  const maxYearParam = params.maxYear
  const maxMileageParam = params.maxMileage
  const makeParam = params.make
  const modelParam = params.model
  const sortParam = params.sort
  const bortskankesParam = params.bortskankes
  const sellerParam = params.seller

  const toStringOrUndefined = (value: string | string[] | undefined): string | undefined => {
    if (!value) return undefined
    return Array.isArray(value) ? value[0] : value
  }

  const toNumberOrUndefined = (value: string | string[] | undefined): number | undefined => {
    const str = toStringOrUndefined(value)
    if (!str) return undefined
    const num = Number(str)
    return Number.isNaN(num) ? undefined : num
  }

  const bortskankes = toStringOrUndefined(bortskankesParam) === '1'
  const sellerParamVal = toStringOrUndefined(sellerParam)
  const sellerType = (sellerParamVal === 'private' || sellerParamVal === 'company' ? sellerParamVal : 'all') as 'all' | 'private' | 'company'

  const filters: ListingSearchFilters = {
    query: toStringOrUndefined(qParam),
    category: toStringOrUndefined(categoryParam) || 'all',
    location: toStringOrUndefined(locationParam),
    bortskankes: bortskankes || undefined,
    sellerType: sellerType !== 'all' ? sellerType : undefined,
    minPrice: toNumberOrUndefined(minPriceParam),
    maxPrice: toNumberOrUndefined(maxPriceParam),
    minYear: toNumberOrUndefined(minYearParam),
    maxYear: toNumberOrUndefined(maxYearParam),
    maxMileage: toNumberOrUndefined(maxMileageParam),
    make: toStringOrUndefined(makeParam) || undefined,
    model: toStringOrUndefined(modelParam) || undefined,
    offset: 0,
    limit: PAGE_SIZE,
    sort: (toStringOrUndefined(sortParam) as ListingSearchFilters['sort']) ?? 'newest',
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [listingsResult, favoriteIdsResult] = await Promise.all([
    getListings(filters),
    user ? getFavoriteIds(user.id) : Promise.resolve({ success: true as const, data: [] as string[] }),
  ])

  const initialAds = listingsResult.success ? listingsResult.data ?? [] : []
  const initialTotalCount = listingsResult.success ? listingsResult.totalCount ?? initialAds.length : undefined
  const initialError = listingsResult.success ? null : listingsResult.error ?? 'Kunde inte hämta annonser just nu.'
  const favoriteIds = favoriteIdsResult.success && favoriteIdsResult.data ? favoriteIdsResult.data : []

  return (
    <HomePageClient
      initialAds={initialAds}
      initialTotalCount={initialTotalCount}
      initialError={initialError}
      favoriteIds={favoriteIds}
    />
  )
}