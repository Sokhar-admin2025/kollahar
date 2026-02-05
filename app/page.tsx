import HomePageClient from './HomePageClient'
import { getListings, type ListingSearchFilters } from '@/lib/features/listings/listing-service'

const PAGE_SIZE = 24

type HomePageSearchParams = {
  [key: string]: string | string[] | undefined
  q?: string | string[]
  category?: string | string[]
  location?: string | string[]
  minPrice?: string | string[]
  maxPrice?: string | string[]
  minYear?: string | string[]
  maxYear?: string | string[]
  maxMileage?: string | string[]
  sort?: string | string[]
}

interface HomePageProps {
  searchParams?: HomePageSearchParams
}

export default async function HomePage({ searchParams }: HomePageProps) {
  const qParam = searchParams?.q
  const categoryParam = searchParams?.category
  const locationParam = searchParams?.location
  const minPriceParam = searchParams?.minPrice
  const maxPriceParam = searchParams?.maxPrice
  const minYearParam = searchParams?.minYear
  const maxYearParam = searchParams?.maxYear
  const maxMileageParam = searchParams?.maxMileage
  const sortParam = searchParams?.sort

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

  const filters: ListingSearchFilters = {
    query: toStringOrUndefined(qParam),
    category: toStringOrUndefined(categoryParam) || 'all',
    location: toStringOrUndefined(locationParam),
    minPrice: toNumberOrUndefined(minPriceParam),
    maxPrice: toNumberOrUndefined(maxPriceParam),
    minYear: toNumberOrUndefined(minYearParam),
    maxYear: toNumberOrUndefined(maxYearParam),
    maxMileage: toNumberOrUndefined(maxMileageParam),
    offset: 0,
    limit: PAGE_SIZE,
    sort: (toStringOrUndefined(sortParam) as ListingSearchFilters['sort']) ?? 'newest',
  }

  const result = await getListings(filters)

  const initialAds = result.success ? result.data ?? [] : []
  const initialError = result.success ? null : result.error ?? 'Kunde inte hämta annonser just nu.'

  return <HomePageClient initialAds={initialAds} initialError={initialError} />
}