'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Search, X, SlidersHorizontal, ChevronDown, ChevronUp, ArrowUpDown } from 'lucide-react'

import { DASHBOARD_TEXTS } from './lib/content'
import ListingCard from './components/ListingCard'
import { useHeaderOptions } from '@/app/context/HeaderOptionsContext'
import ScrollToSearch from './components/ScrollToSearch'
import type { Listing } from './types'
import { CATEGORY_GROUPS, getCategoryLabel } from '@/lib/categories'
import { getCountyByValue, getMunicipalityLabel } from '@/lib/swedish-locations'
import CarMakeModelCombobox from './components/CarMakeModelCombobox'
import LocationFilter, { type LocationFilterValue } from './components/LocationFilter'
import { PriceInput } from '@/components/listings/filters/price-input'
import { formatCurrency, getPriceOptions, parsePrice } from '@/lib/features/listings/utils/price-utils'
import { CAR_COLORS } from '@/lib/car-colors'
import type { ListingSearchFilters } from '@/lib/features/listings/listing-service'

const supabase = createClient()
const PAGE_SIZE = 24

interface HomePageClientProps {
  initialAds: Listing[]
  /** Totalt antal annonser som matchar filter (för "Visar X av Y annonser") */
  initialTotalCount?: number
  initialError?: string | null
  /** Favorit-IDs från servern (en fetch för hela listan, undviker N+1) */
  favoriteIds?: string[]
}

export default function HomePageClient({
  initialAds,
  initialTotalCount,
  initialError,
  favoriteIds = [],
}: HomePageClientProps) {
  const searchParams = useSearchParams()
  const pathname = usePathname()

  const [ads, setAds] = useState<Listing[]>(initialAds)
  const [totalCount, setTotalCount] = useState<number | undefined>(initialTotalCount)
  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(initialAds.length === PAGE_SIZE)
  const [serverError, setServerError] = useState<string | null>(initialError ?? null)

  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [currentUserName, setCurrentUserName] = useState<string | null>(null)
  const [localFavoriteIds, setLocalFavoriteIds] = useState<Set<string>>(() => new Set(favoriteIds))
  const initialLoggedOut = searchParams.get('logged_out')
  const initialLoggedIn = searchParams.get('logged_in')
  const [showLoggedOutToast, setShowLoggedOutToast] = useState(() => Boolean(initialLoggedOut))
  const [loggedOutReason] = useState<'logout' | 'deleted' | null>(() => {
    if (initialLoggedOut === 'deleted') return 'deleted'
    return initialLoggedOut ? 'logout' : null
  })
  const [showLoggedInToast, setShowLoggedInToast] = useState(() => Boolean(initialLoggedIn))
  const [loginType] = useState<'new' | 'returning' | null>(() => {
    if (!initialLoggedIn) return null
    return initialLoggedIn === 'new' ? 'new' : 'returning'
  })

  const [searchQuery, setSearchQuery] = useState(() => searchParams.get('q') || '')
  const [selectedCategory, setSelectedCategory] = useState(() => searchParams.get('category') || 'all')
  const [sort, setSort] = useState<ListingSearchFilters['sort']>(() => {
    const sortParam = searchParams.get('sort') as ListingSearchFilters['sort'] | null
    return sortParam || 'newest'
  })
  const [searchSubmitted, setSearchSubmitted] = useState(false)
  const [priceMin, setPriceMin] = useState(() => searchParams.get('minPrice') || '')
  const [priceMax, setPriceMax] = useState(() => searchParams.get('maxPrice') || '')
  const [bortskankesOnly, setBortskankesOnly] = useState(() => searchParams.get('bortskankes') === '1')
  const [sellerType, setSellerType] = useState<'all' | 'private' | 'company'>(() => {
    const s = searchParams.get('seller')
    return s === 'private' || s === 'company' ? s : 'all'
  })
  const [locationFilter, setLocationFilter] = useState<LocationFilterValue>(() => {
    const fullCounties = searchParams.getAll('county')
    const munParams = searchParams.getAll('mun')

    const partialMunicipalities =
      munParams
        .map((value) => {
          const [countyValue, municipalityValue] = value.split(':')
          if (!countyValue || !municipalityValue) return null
          return { countyValue, municipalityValue }
        })
        .filter((v): v is { countyValue: string; municipalityValue: string } => v !== null)

    return {
      fullCounties,
      partialMunicipalities,
    }
  })
  const [yearFrom, setYearFrom] = useState(() => searchParams.get('minYear') || '')
  const [yearTo, setYearTo] = useState(() => searchParams.get('maxYear') || '')
  const [maxMileage, setMaxMileage] = useState(() => searchParams.get('maxMileage') || '')
  const [makeFilter, setMakeFilter] = useState(() => searchParams.get('make') || '')
  const [modelFilter, setModelFilter] = useState(() => searchParams.get('model') || '')
  const [fuelFilter, setFuelFilter] = useState('')
  const [gearboxFilter, setGearboxFilter] = useState('')
  const [bodyTypeFilter, setBodyTypeFilter] = useState('')
  const [driveWheelFilter, setDriveWheelFilter] = useState('')
  const [colorFilter, setColorFilter] = useState('')
  const [horsepowerMin, setHorsepowerMin] = useState('')
  const [horsepowerMax, setHorsepowerMax] = useState('')
  const [isFilterOpen, setIsFilterOpen] = useState(false)
  const [isDesktopFilterOpen, setIsDesktopFilterOpen] = useState(false)
  const [showMoreFilters, setShowMoreFilters] = useState(false)
  const [listViewEnabled, setListViewEnabled] = useState(false)
  const [isSortMenuOpen, setIsSortMenuOpen] = useState(false)
  const sortMenuRef = useRef<HTMLDivElement>(null)

  const t = DASHBOARD_TEXTS
  const isCarsCategory = selectedCategory === 'cars'

  // Auth & toasts – oförändrad logik
  useEffect(() => {
    if (!initialLoggedOut && !initialLoggedIn) return
    const params = new URLSearchParams(searchParams.toString())
    if (initialLoggedOut) params.delete('logged_out')
    if (initialLoggedIn) params.delete('logged_in')
    const newUrl = params.toString() ? `/?${params.toString()}` : '/'
    if (typeof window !== 'undefined') {
      window.history.replaceState({}, '', newUrl)
    }
  }, [initialLoggedOut, initialLoggedIn, searchParams])

  useEffect(() => {
    if (!showLoggedOutToast) return
    const timer = setTimeout(() => setShowLoggedOutToast(false), 3000)
    return () => clearTimeout(timer)
  }, [showLoggedOutToast])

  useEffect(() => {
    if (!showLoggedInToast) return
    const timer = setTimeout(() => setShowLoggedInToast(false), 3000)
    return () => clearTimeout(timer)
  }, [showLoggedInToast])

  useEffect(() => {
    let isMounted = true

    const initAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!isMounted) return
      const userId = session?.user?.id ?? null
      setCurrentUserId(userId)

      if (userId) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', userId)
          .single()

        if (!isMounted) return
        setCurrentUserName(profile?.full_name ?? null)
      } else {
        setCurrentUserName(null)
      }
    }

    initAuth()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const userId = session?.user?.id ?? null
      setCurrentUserId(userId)

      if (userId) {
        try {
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', userId)
            .single()

          if (!isMounted) return
          setCurrentUserName(profile?.full_name ?? null)
        } catch (err) {
          console.error('Fel vid hämtning av profilnamn:', err)
          if (!isMounted) return
          setCurrentUserName(null)
        }
      } else {
        setCurrentUserName(null)
      }
    })

    return () => {
      isMounted = false
      subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    setLocalFavoriteIds(new Set(favoriteIds))
  }, [favoriteIds])

  const handleFavoriteRemoved = (listingId: string) => {
    setLocalFavoriteIds((prev) => {
      const next = new Set(prev)
      next.delete(listingId)
      return next
    })
  }

  // Servern tillämpar sök, kategori, pris, år, mil, bilfilter och sortering.
  // Client-side filtrerar vi bara på flera platser (servern får bara en plats-term).
  const filteredAds = useMemo(() => {
    let result = ads
    const { fullCounties, partialMunicipalities } = locationFilter
    if (fullCounties.length > 0 || partialMunicipalities.length > 0) {
      const effectiveTerms = new Set<string>()
      for (const countyValue of fullCounties) {
        const county = getCountyByValue(countyValue)
        if (county) effectiveTerms.add(county.label.trim())
      }
      for (const { countyValue, municipalityValue } of partialMunicipalities) {
        const label = getMunicipalityLabel(countyValue, municipalityValue)
        if (label) effectiveTerms.add(label.trim())
      }
      const termsList = Array.from(effectiveTerms)
      result = result.filter((ad) => {
        const loc = (ad.location ?? '').trim().toLowerCase()
        if (!loc) return false
        return termsList.some((term) => loc.includes(term.trim().toLowerCase()))
      })
    }
    return result
  }, [ads, locationFilter])

  useEffect(() => {
    const params = new URLSearchParams()

    if (searchQuery) {
      params.set('q', searchQuery)
    }
    if (selectedCategory && selectedCategory !== 'all') {
      params.set('category', selectedCategory)
    }
    if (priceMin) {
      params.set('minPrice', priceMin)
    }
    if (priceMax) {
      params.set('maxPrice', priceMax)
    }
    if (bortskankesOnly) {
      params.set('bortskankes', '1')
    }
    if (sellerType && sellerType !== 'all') {
      params.set('seller', sellerType)
    }
    if (yearFrom) {
      params.set('minYear', yearFrom)
    }
    if (yearTo) {
      params.set('maxYear', yearTo)
    }
    if (maxMileage) {
      params.set('maxMileage', maxMileage)
    }
    if (makeFilter) {
      params.set('make', makeFilter)
    }
    if (modelFilter) {
      params.set('model', modelFilter)
    }
    if (sort && sort !== 'newest') {
      params.set('sort', sort)
    }

    // Plats: behåll län/kommunval i URL så de överlever navigation
    locationFilter.fullCounties.forEach((countyValue) => {
      params.append('county', countyValue)
    })
    locationFilter.partialMunicipalities.forEach((m) => {
      params.append('mun', `${m.countyValue}:${m.municipalityValue}`)
    })

    const newUrl = params.toString() ? `/?${params.toString()}` : '/'
    window.history.replaceState({}, '', newUrl)
  }, [searchQuery, selectedCategory, priceMin, priceMax, bortskankesOnly, sellerType, yearFrom, yearTo, maxMileage, makeFilter, modelFilter, sort, locationFilter])

  const handleSearch = useCallback((e: React.FormEvent) => {
    e.preventDefault()
    setSearchSubmitted(true)
    if (filteredAds.length > 0) {
      const resultsElement = document.getElementById('search-results')
      if (resultsElement) {
        resultsElement.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
    }
  }, [filteredAds.length])

  const handleSearchInputChange = useCallback((value: string) => {
    setSearchQuery(value)
    if (searchSubmitted) {
      setSearchSubmitted(false)
    }
  }, [searchSubmitted])

  const { setOptions: setHeaderOptions } = useHeaderOptions()
  useEffect(() => {
    if (pathname !== '/') return
    setHeaderOptions({
      showSearch: true,
      searchQuery,
      onSearchChange: handleSearchInputChange,
      onSearchSubmit: handleSearch,
      onClearSearch: () => setSearchQuery(''),
    })
    return () => setHeaderOptions({ showSearch: false })
  }, [pathname, searchQuery, setHeaderOptions, handleSearchInputChange, handleSearch])

  const resetCarFilters = () => {
    setYearFrom('')
    setYearTo('')
    setMaxMileage('')
    setMakeFilter('')
    setModelFilter('')
    setFuelFilter('')
    setGearboxFilter('')
    setBodyTypeFilter('')
    setDriveWheelFilter('')
    setColorFilter('')
    setHorsepowerMin('')
    setHorsepowerMax('')
  }

  const handleCategoryChange = (value: string) => {
    setSelectedCategory(value)
    if (value !== 'cars') {
      resetCarFilters()
    }
  }

  const resetFilters = () => {
    setSelectedCategory('all')
    setPriceMin('')
    setPriceMax('')
    setBortskankesOnly(false)
    setSellerType('all')
    setLocationFilter({ fullCounties: [], partialMunicipalities: [] })
    resetCarFilters()
  }

  const isFirstFilterMount = useRef(true)

  // Stäng Sortera-menyn vid klick utanför
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (sortMenuRef.current && !sortMenuRef.current.contains(e.target as Node)) {
        setIsSortMenuOpen(false)
      }
    }
    if (isSortMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isSortMenuOpen])

  /** Bygger serverfilter från aktuellt state (samma logik som page.tsx). */
  const buildFilters = useCallback((offset: number): ListingSearchFilters => {
    const minPrice = priceMin ? parsePrice(priceMin) ?? undefined : undefined
    const maxPrice = priceMax ? parsePrice(priceMax) ?? undefined : undefined
    const minYear = yearFrom ? parseInt(yearFrom, 10) : undefined
    const maxYear = yearTo ? parseInt(yearTo, 10) : undefined
    const maxMileageNum = maxMileage ? parseInt(maxMileage, 10) : undefined
    const hpMin = horsepowerMin ? parseInt(horsepowerMin, 10) : undefined
    const hpMax = horsepowerMax ? parseInt(horsepowerMax, 10) : undefined

    // Plats: servern får EN plats-term; multi-select (flera län/kommuner) hanteras client-side.
    const totalLocationSelections =
      locationFilter.fullCounties.length + locationFilter.partialMunicipalities.length
    let location: string | undefined
    if (totalLocationSelections === 1) {
      if (locationFilter.fullCounties.length === 1) {
        const county = getCountyByValue(locationFilter.fullCounties[0])
        location = county?.label
      } else if (locationFilter.partialMunicipalities.length === 1) {
        const m = locationFilter.partialMunicipalities[0]
        location = getMunicipalityLabel(m.countyValue, m.municipalityValue)
      }
    }

    return {
      query: searchQuery.trim() || undefined,
      category: selectedCategory !== 'all' ? selectedCategory : undefined,
      location,
      bortskankes: bortskankesOnly || undefined,
      sellerType: sellerType !== 'all' ? sellerType : undefined,
      minPrice: minPrice !== undefined && !Number.isNaN(minPrice) ? minPrice : undefined,
      maxPrice: maxPrice !== undefined && !Number.isNaN(maxPrice) ? maxPrice : undefined,
      minYear: minYear !== undefined && !Number.isNaN(minYear) ? minYear : undefined,
      maxYear: maxYear !== undefined && !Number.isNaN(maxYear) ? maxYear : undefined,
      maxMileage: maxMileageNum !== undefined && !Number.isNaN(maxMileageNum) ? maxMileageNum : undefined,
      make: makeFilter?.trim() || undefined,
      model: modelFilter?.trim() || undefined,
      fuel: fuelFilter?.trim() || undefined,
      gearbox: gearboxFilter?.trim() || undefined,
      bodyType: bodyTypeFilter?.trim() || undefined,
      driveWheel: driveWheelFilter?.trim() || undefined,
      color: colorFilter?.trim() || undefined,
      horsepowerMin: hpMin !== undefined && !Number.isNaN(hpMin) ? hpMin : undefined,
      horsepowerMax: hpMax !== undefined && !Number.isNaN(hpMax) ? hpMax : undefined,
      offset,
      limit: PAGE_SIZE,
      sort,
    }
  }, [
    priceMin,
    priceMax,
    yearFrom,
    yearTo,
    maxMileage,
    horsepowerMin,
    horsepowerMax,
    locationFilter,
    searchQuery,
    selectedCategory,
    bortskankesOnly,
    sellerType,
    makeFilter,
    modelFilter,
    fuelFilter,
    gearboxFilter,
    bodyTypeFilter,
    driveWheelFilter,
    colorFilter,
    sort,
  ])

  // Refetch första sidan när användaren ändrar filter (hoppar över initial mount).
  useEffect(() => {
    if (isFirstFilterMount.current) {
      isFirstFilterMount.current = false
      return
    }
    let cancelled = false
    const run = async () => {
      setLoading(true)
      setServerError(null)
      try {
        const res = await fetch('/api/listings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ filters: buildFilters(0) }),
        })
        const json = await res.json()
        if (cancelled) return
        if (!res.ok) {
          setServerError(json?.error ?? 'Kunde inte hämta annonser just nu.')
          setAds([])
          setTotalCount(undefined)
          setHasMore(false)
        } else {
          const data = (json?.data ?? []) as Listing[]
          setAds(data)
          setTotalCount(json?.totalCount ?? data.length)
          setHasMore(data.length === PAGE_SIZE)
        }
      } catch (err) {
        if (cancelled) return
        console.error('Refetch listings failed', err)
        setServerError('Kunde inte hämta annonser just nu. Försök igen senare.')
        setAds([])
        setTotalCount(undefined)
        setHasMore(false)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    run()
    return () => {
      cancelled = true
    }
  }, [
    searchQuery,
    selectedCategory,
    sort,
    priceMin,
    priceMax,
    bortskankesOnly,
    sellerType,
    locationFilter,
    yearFrom,
    yearTo,
    maxMileage,
    makeFilter,
    modelFilter,
    fuelFilter,
    gearboxFilter,
    bodyTypeFilter,
    driveWheelFilter,
    colorFilter,
    horsepowerMin,
    horsepowerMax,
    buildFilters,
  ])

  const handleLoadMore = async () => {
    if (loadingMore || !hasMore) return
    setLoadingMore(true)
    setServerError(null)
    const nextOffset = ads.length
    try {
      const res = await fetch('/api/listings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filters: buildFilters(nextOffset) }),
      })
      const json = await res.json()
      if (!res.ok) {
        setServerError(json?.error ?? 'Kunde inte hämta fler annonser just nu.')
        setHasMore(false)
        setLoadingMore(false)
        return
      }
      const newListings = (json?.data ?? []) as Listing[]
      setAds((prev) => {
        const existingIds = new Set(prev.map((a) => a.id))
        const uniqueNew = newListings.filter((a) => !existingIds.has(a.id))
        return [...prev, ...uniqueNew]
      })
      if (json?.totalCount != null) setTotalCount(json.totalCount)
      setHasMore(newListings.length === PAGE_SIZE)
    } catch (err) {
      console.error('Load more listings failed', err)
      setServerError('Kunde inte hämta fler annonser just nu.')
      setHasMore(false)
    } finally {
      setLoadingMore(false)
    }
  }

  const fuelOptions = ['Bensin', 'Diesel', 'El', 'Gas', 'Hybrid'].sort()
  const gearboxOptions = ['Manuell', 'Automat']
  const bodyTypeOptions = ['Cab', 'Coupé', 'Halvkombi', 'Kombi', 'Minibuss', 'Sedan', 'Skåpbil', 'SUV'].sort()
  const driveWheelOptions = ['Framhjulsdrift', 'Bakhjulsdrift', 'Fyrhjulsdrift']
  const maxMileageOptions = ['1000', '3000', '5000', '10000', '15000', '20000', '20000+']

  const allYears = useMemo(() => {
    const currentYear = new Date().getFullYear()
    const years: number[] = []
    for (let y = currentYear + 1; y >= 1990; y--) {
      years.push(y)
    }
    return years
  }, [])

  const removeFilterChip = (type: string, value: string, extra?: string) => {
    switch (type) {
      case 'category':
        setSelectedCategory('all')
        break
      case 'locationCounty':
        setLocationFilter((prev) => ({
          fullCounties: prev.fullCounties.filter((c) => c !== value),
          partialMunicipalities: prev.partialMunicipalities.filter((m) => m.countyValue !== value),
        }))
        break
      case 'locationMunicipality':
        const [countyVal, munVal] = value.includes(':') ? value.split(':') : [extra, value]
        if (countyVal && munVal) {
          setLocationFilter((prev) => ({
            ...prev,
            partialMunicipalities: prev.partialMunicipalities.filter(
              (m) => !(m.countyValue === countyVal && m.municipalityValue === munVal)
            ),
          }))
        }
        break
      case 'bortskankes':
        setBortskankesOnly(false)
        break
      case 'seller':
        setSellerType('all')
        break
      case 'priceMin':
        setPriceMin('')
        break
      case 'priceMax':
        setPriceMax('')
        break
      case 'yearFrom':
        setYearFrom('')
        break
      case 'yearTo':
        setYearTo('')
        break
      case 'maxMileage':
        setMaxMileage('')
        break
      case 'make':
        setMakeFilter('')
        setModelFilter('')
        break
      case 'model':
        setModelFilter('')
        break
      case 'fuel':
        setFuelFilter('')
        break
      case 'gearbox':
        setGearboxFilter('')
        break
      case 'bodyType':
        setBodyTypeFilter('')
        break
      case 'driveWheel':
        setDriveWheelFilter('')
        break
      case 'color':
        setColorFilter('')
        break
      case 'hpMin':
        setHorsepowerMin('')
        break
      case 'hpMax':
        setHorsepowerMax('')
        break
      default:
        break
    }
  }

  const filterFields = (
    <div className="space-y-4">
      {/* Kategori */}
      <div>
        <label className="block text-sm font-medium text-brand-text mb-1.5 antialiased">Kategori</label>
        <select
          className="w-full p-2.5 border border-gray-300 rounded-xl bg-white text-brand-text antialiased"
          value={selectedCategory}
          onChange={(e) => handleCategoryChange(e.target.value)}
        >
          <option value="all">Alla kategorier</option>
          {CATEGORY_GROUPS.map((group) => (
            <optgroup key={group.id} label={group.label}>
              {group.children.map((child) => (
                <option key={child.id} value={child.id}>{child.label}</option>
              ))}
            </optgroup>
          ))}
        </select>
      </div>

      <div className="space-y-4">
        {/* Bortskänkes */}
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={bortskankesOnly}
            onChange={(e) => setBortskankesOnly(e.target.checked)}
            className="w-4 h-4 text-brand-green rounded focus:ring-brand-green"
          />
          <span className="text-sm font-medium text-brand-text antialiased">Visa endast bortskänkes</span>
        </label>

        {/* Plats */}
        <div>
          <label className="block text-sm font-medium text-brand-text mb-1.5 antialiased">
            Plats
          </label>
          <LocationFilter
            value={locationFilter}
            onChange={setLocationFilter}
            stickySearch={isFilterOpen}
            selectedCategory={selectedCategory}
            searchQuery={searchQuery}
            minPrice={priceMin ? parsePrice(priceMin) ?? undefined : undefined}
            maxPrice={priceMax ? parsePrice(priceMax) ?? undefined : undefined}
          />
        </div>

        {/* Pris */}
        <div>
          <label className="block text-sm font-medium text-brand-text mb-1.5 antialiased">
            Prisintervall (kr)
          </label>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Min</label>
              <PriceInput
                label="Min pris"
                value={priceMin ? parsePrice(priceMin) ?? undefined : undefined}
                onChange={(val) => setPriceMin(val != null ? String(val) : '')}
                options={getPriceOptions(selectedCategory)}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Max</label>
              <PriceInput
                label="Max pris"
                value={priceMax ? parsePrice(priceMax) ?? undefined : undefined}
                onChange={(val) => setPriceMax(val != null ? String(val) : '')}
                options={getPriceOptions(selectedCategory)}
              />
            </div>
          </div>
          {priceMin && priceMax && (parsePrice(priceMin) ?? 0) > (parsePrice(priceMax) ?? 0) && (
            <p className="mt-1 text-xs text-red-600">
              Lägsta pris kan inte vara högre än högsta pris.
            </p>
          )}
        </div>

        {/* Bil-specifika primära filter */}
        {isCarsCategory && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-brand-text mb-2 antialiased">
                Märke & modell
              </label>
              <CarMakeModelCombobox
                value={{ make: makeFilter, model: modelFilter }}
                onChange={(v) => {
                  setMakeFilter(v.make)
                  setModelFilter(v.model)
                }}
                className=""
              />
              <p className="mt-1 text-xs text-brand-text/60">
                Sök med text, eller steg 1 märke och steg 2 modell. Tomt=alla.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-brand-text mb-1 antialiased">
                  Från år
                </label>
                <select
                  className="w-full p-2.5 border border-gray-300 rounded-xl bg-white text-brand-text antialiased"
                  value={yearFrom}
                  onChange={(e) => setYearFrom(e.target.value)}
                >
                  <option value="">Alla</option>
                  {allYears.map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-brand-text mb-1 antialiased">
                  Till år
                </label>
                <select
                  className="w-full p-2.5 border border-gray-300 rounded-xl bg-white text-brand-text antialiased"
                  value={yearTo}
                  onChange={(e) => setYearTo(e.target.value)}
                >
                  <option value="">Alla</option>
                  {allYears.map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-brand-text mb-2 antialiased">
                Max miltal
              </label>
                <select
                className="w-full p-2.5 border border-gray-300 rounded-xl bg-white text-brand-text antialiased"
                value={maxMileage}
                onChange={(e) => setMaxMileage(e.target.value)}
              >
                <option value="">Alla</option>
                {maxMileageOptions.map((val) => (
                  <option key={val} value={val}>
                    {val === '20000+' ? '20000+ mil' : `${val} mil`}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Avancerade bilfilter */}
      {isCarsCategory && (
        <div className="border-t border-gray-200 pt-3">
          <button
            type="button"
            onClick={() => setShowMoreFilters(!showMoreFilters)}
            className="flex items-center justify-between w-full text-left text-brand-text hover:text-brand-green transition-colors"
          >
            <span className="text-sm font-medium antialiased">Avancerat</span>
            {showMoreFilters ? (
              <ChevronUp className="w-5 h-5" />
            ) : (
              <ChevronDown className="w-5 h-5" />
            )}
          </button>

          {showMoreFilters && (
            <div className="mt-3 space-y-4">
              {/* Drivmedel */}
              <div>
                <label className="block text-sm font-medium text-brand-text mb-1.5 antialiased">Drivmedel</label>
                <div className="flex flex-wrap gap-2">
                  {fuelOptions.map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setFuelFilter(fuelFilter === opt ? '' : opt)}
                      className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                        fuelFilter === opt
                          ? 'bg-brand-green text-white'
                          : 'bg-gray-100 text-brand-text hover:bg-gray-200'
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>

              {/* Växellåda */}
              <div>
                <label className="block text-sm font-medium text-brand-text mb-1.5 antialiased">Växellåda</label>
                <div className="flex flex-wrap gap-2">
                  {gearboxOptions.map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setGearboxFilter(gearboxFilter === opt ? '' : opt)}
                      className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                        gearboxFilter === opt
                          ? 'bg-brand-green text-white'
                          : 'bg-gray-100 text-brand-text hover:bg-gray-200'
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>

              {/* Kaross */}
              <div>
                <label className="block text-sm font-medium text-brand-text mb-1.5 antialiased">Kaross</label>
                <select
                  className="w-full p-2.5 border border-gray-300 rounded-xl bg-white text-brand-text antialiased"
                  value={bodyTypeFilter}
                  onChange={(e) => setBodyTypeFilter(e.target.value)}
                >
                  <option value="">Alla</option>
                  {bodyTypeOptions.map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>

              {/* Drivhjul */}
              <div>
                <label className="block text-sm font-medium text-brand-text mb-1.5 antialiased">Drivhjul</label>
                <div className="flex flex-wrap gap-2">
                  {driveWheelOptions.map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setDriveWheelFilter(driveWheelFilter === opt ? '' : opt)}
                      className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                        driveWheelFilter === opt
                          ? 'bg-brand-green text-white'
                          : 'bg-gray-100 text-brand-text hover:bg-gray-200'
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>

              {/* Färg */}
              <div>
                <label className="block text-sm font-medium text-brand-text mb-1.5 antialiased">Färg</label>
                <select
                  className="w-full p-2.5 border border-gray-300 rounded-xl bg-white text-brand-text antialiased"
                  value={colorFilter}
                  onChange={(e) => setColorFilter(e.target.value)}
                >
                  <option value="">Alla färger</option>
                  {CAR_COLORS.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                  <option value="Annan">Annan</option>
                </select>
              </div>

              {/* Effekt */}
              <div>
                <label className="block text-sm font-medium text-brand-text mb-1.5 antialiased">
                  Effekt (hk)
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="number"
                    min={0}
                    placeholder="Min hk"
                    className="w-full p-2.5 border border-gray-300 rounded-xl bg-white text-brand-text antialiased"
                    value={horsepowerMin}
                    onChange={(e) => setHorsepowerMin(e.target.value)}
                  />
                  <input
                    type="number"
                    min={0}
                    placeholder="Max hk"
                    className="w-full p-2.5 border border-gray-300 rounded-xl bg-white text-brand-text antialiased"
                    value={horsepowerMax}
                    onChange={(e) => setHorsepowerMax(e.target.value)}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Rensa filter – endast i desktop-panelen; mobil har den i drawerns sticky bottom */}
      <button
        type="button"
        onClick={resetFilters}
        className="hidden md:block w-full py-2 text-sm text-brand-green underline hover:text-brand-green/80 antialiased"
      >
        Rensa filter
      </button>
    </div>
  )

  const isLoadingList = loading

  return (
    <div className="min-h-screen bg-brand-beige flex flex-col">
      {/* HERO + mobil-sök/filter */}
      <div id="hero-section" className="relative bg-brand-beige py-6 md:py-10 px-4 text-center overflow-hidden">
        <div className="relative z-10 max-w-4xl mx-auto">
          <h2 className="hidden md:block text-2xl md:text-4xl font-display font-extrabold mb-2 tracking-tight text-brand-green drop-shadow-sm">
            {t.landing.hero.title}
          </h2>

          <div className="max-w-3xl mx-auto mt-3 mb-2">
            <form onSubmit={handleSearch} className="mb-4 relative block md:hidden">
              <Search
                className="absolute left-5 top-1/2 -translate-y-1/2 text-brand-text/50 z-10"
                size={22}
                aria-hidden="true"
              />
              <input
                type="search"
                aria-label={t.landing.search.placeholder}
                placeholder={t.landing.search.placeholder}
                value={searchQuery}
                onChange={(e) => handleSearchInputChange(e.target.value)}
                className="w-full pl-12 pr-20 py-3 rounded-full bg-white text-base text-brand-text focus:outline-none focus:ring-2 focus:ring-brand-green shadow-md placeholder:text-brand-text/50"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('')
                    setSearchSubmitted(false)
                  }}
                  className="absolute right-20 top-1/2 -translate-y-1/2 p-1 text-brand-text/50 hover:text-brand-text focus:outline-none focus:ring-2 focus:ring-brand-green rounded-full transition-colors"
                  aria-label="Rensa sökning"
                >
                  <X size={18} aria-hidden="true" />
                </button>
              )}
              <button
                type="submit"
                className="absolute right-2 top-1/2 -translate-y-1/2 px-4 py-1.5 bg-brand-green text-white text-sm font-medium rounded-full hover:bg-brand-green/90 focus:outline-none focus:ring-2 focus:ring-brand-green focus:ring-offset-2 transition-colors"
                aria-label="Sök"
              >
                Sök
              </button>
            </form>

          </div>
        </div>
      </div>

      {/* Mobil filter-drawer – max-h och safe-area så "Visa resultat"-knappen alltid nårbar ovanför browser bar */}
      {isFilterOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setIsFilterOpen(false)}
          />
          <div className="absolute right-0 top-0 h-[92dvh] max-h-[92vh] w-[90%] max-w-[95%] bg-white shadow-xl flex flex-col overflow-hidden">
            <div className="shrink-0 px-4 py-3 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-base font-semibold text-brand-text">Filter</h3>
              <button
                type="button"
                onClick={() => setIsFilterOpen(false)}
                className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full hover:bg-brand-beige -m-2"
                aria-label="Stäng filter"
              >
                <X className="w-5 h-5" aria-hidden="true" />
              </button>
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden p-4 pb-2 overscroll-contain">
              {filterFields}
            </div>
            <div className="shrink-0 border-t border-gray-200 px-4 py-3 bg-white flex items-center gap-3 pb-[calc(env(safe-area-inset-bottom,0px)+1rem)]">
              <button
                type="button"
                onClick={() => {
                  resetFilters()
                  setSearchSubmitted(false)
                }}
                className="text-sm text-brand-green hover:underline py-2 touch-manipulation shrink-0"
              >
                Rensa
              </button>
              <button
                type="button"
                onClick={() => setIsFilterOpen(false)}
                className="flex-1 min-h-[44px] py-2.5 rounded-xl bg-brand-green text-white font-semibold shadow-md touch-manipulation"
              >
                Visa {totalCount ?? filteredAds.length} resultat
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Huvudlista + desktop-filter + sortering + Visa fler */}
      <main id="search-results" className="w-full max-w-7xl mx-auto px-4 py-3 flex-grow relative">
        {isDesktopFilterOpen && (
          <div
            className="hidden md:block fixed inset-0 bg-black/40 z-40 transition-opacity"
            onClick={() => setIsDesktopFilterOpen(false)}
            aria-hidden
          />
        )}

        <aside
          className={`hidden md:block fixed inset-y-0 left-0 h-full w-[350px] bg-white shadow-2xl border-r border-gray-200 z-50 transition-transform duration-300 ease-in-out ${
            isDesktopFilterOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
          aria-label="Filterpanel"
        >
          <div className="p-5 h-full overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-brand-text">Filter</h3>
              <button
                type="button"
                onClick={() => setIsDesktopFilterOpen(false)}
                className="p-2 rounded-full hover:bg-brand-beige"
                aria-label="Stäng filter"
              >
                <X className="w-5 h-5" aria-hidden="true" />
              </button>
            </div>
            {filterFields}
          </div>
        </aside>

        <div className="min-w-0 w-full">
          <div
            aria-live="polite"
            aria-atomic="true"
            className="sr-only"
          >
            {searchQuery
              ? `Sökningen visar ${filteredAds.length} ${filteredAds.length === 1 ? 'resultat' : 'resultat'} för "${searchQuery}"`
              : selectedCategory !== 'all'
              ? `Visar ${filteredAds.length} ${filteredAds.length === 1 ? 'annons' : 'annonser'} i kategorin ${getCategoryLabel(selectedCategory)}`
              : `Visar ${filteredAds.length} ${filteredAds.length === 1 ? 'annons' : 'annonser'}`
            }
          </div>

          <div className="flex flex-wrap justify-between items-end gap-3 mb-3">
            <div className="flex flex-wrap items-baseline gap-2 min-w-0">
              <h3 className="text-2xl font-display text-brand-green">{t.landing.listings.header}</h3>
              <span className="text-sm text-brand-text/70">
                {(() => {
                  const x = filteredAds.length
                  const hasMultiLocation =
                    locationFilter.fullCounties.length + locationFilter.partialMunicipalities.length > 1
                  if (hasMultiLocation || totalCount == null) {
                    return `Visar ${x} ${x === 1 ? 'annons' : 'annonser'}`
                  }
                  return `Visar ${x} av ${totalCount} annonser`
                })()}
              </span>
            </div>
            <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
              {/* Sortera-menyn (tight viewports): dropdown med sortering, listvy, säljare */}
              <div className="xl:hidden relative" ref={sortMenuRef}>
                <button
                  type="button"
                  onClick={() => setIsSortMenuOpen(!isSortMenuOpen)}
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-gray-300 bg-white text-brand-text text-sm font-medium shadow-sm hover:bg-gray-50 transition-colors"
                  aria-label="Sortera och visa"
                  aria-expanded={isSortMenuOpen}
                  aria-haspopup="true"
                >
                  <ArrowUpDown className="w-4 h-4" aria-hidden />
                  Sortera
                  <ChevronDown className={`w-4 h-4 transition-transform ${isSortMenuOpen ? 'rotate-180' : ''}`} aria-hidden />
                </button>
                {isSortMenuOpen && (
                  <div className="absolute left-0 top-full mt-1 w-64 max-w-[calc(100vw-2rem)] py-2 rounded-xl border border-gray-200 bg-white shadow-lg z-50">
                    <div className="px-3 py-2 border-b border-gray-100">
                      <span className="text-xs font-medium text-brand-text/70">Sortering</span>
                      <div className="mt-1.5 space-y-0.5">
                        {(['newest', 'oldest', 'price_asc', 'price_desc', 'seller_company_first', 'seller_private_first'] as const).map((opt) => (
                          <button
                            key={opt}
                            type="button"
                            onClick={() => {
                              setSort(opt)
                            }}
                            className={`block w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                              sort === opt
                                ? 'bg-brand-green/10 text-brand-green font-medium'
                                : 'text-brand-text hover:bg-gray-100'
                            }`}
                          >
                            {opt === 'newest' && 'Senaste'}
                            {opt === 'oldest' && 'Äldsta'}
                            {opt === 'price_asc' && 'Pris (lägst först)'}
                            {opt === 'price_desc' && 'Pris (högst först)'}
                            {opt === 'seller_company_first' && 'Företag först'}
                            {opt === 'seller_private_first' && 'Privat först'}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="px-3 py-2 border-b border-gray-100">
                      <span className="text-xs font-medium text-brand-text/70">Listvy</span>
                      <div className="mt-1.5 flex gap-1">
                        <button
                          type="button"
                          onClick={() => setListViewEnabled(false)}
                          className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                            !listViewEnabled ? 'bg-brand-green text-white' : 'bg-gray-100 text-brand-text hover:bg-gray-200'
                          }`}
                        >
                          Av
                        </button>
                        <button
                          type="button"
                          onClick={() => setListViewEnabled(true)}
                          className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                            listViewEnabled ? 'bg-brand-green text-white' : 'bg-gray-100 text-brand-text hover:bg-gray-200'
                          }`}
                        >
                          På
                        </button>
                      </div>
                    </div>
                    <div className="px-3 py-2">
                      <span className="text-xs font-medium text-brand-text/70">Säljare</span>
                      <div className="mt-1.5 flex gap-1">
                        <button
                          type="button"
                          onClick={() => setSellerType('all')}
                          className={`flex-1 px-2 py-2 rounded-lg text-sm font-medium transition-colors ${
                            sellerType === 'all' ? 'bg-brand-green text-white' : 'bg-gray-100 text-brand-text hover:bg-gray-200'
                          }`}
                        >
                          Alla
                        </button>
                        <button
                          type="button"
                          onClick={() => setSellerType('private')}
                          className={`flex-1 px-2 py-2 rounded-lg text-sm font-medium transition-colors ${
                            sellerType === 'private' ? 'bg-brand-green text-white' : 'bg-gray-100 text-brand-text hover:bg-gray-200'
                          }`}
                        >
                          Privat
                        </button>
                        <button
                          type="button"
                          onClick={() => setSellerType('company')}
                          className={`flex-1 px-2 py-2 rounded-lg text-sm font-medium transition-colors ${
                            sellerType === 'company' ? 'bg-brand-green text-white' : 'bg-gray-100 text-brand-text hover:bg-gray-200'
                          }`}
                        >
                          Företag
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Full bred inline (vid xl+) */}
              <div className="hidden xl:flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-brand-text/70">Listvy</span>
                  <button
                    type="button"
                    onClick={() => setListViewEnabled(false)}
                    className={`px-2 py-1 text-xs rounded-l-lg border transition-colors ${
                      !listViewEnabled
                        ? 'bg-brand-green text-white border-brand-green'
                        : 'bg-white text-brand-text/70 border-gray-300 hover:bg-gray-50'
                    }`}
                    aria-pressed={!listViewEnabled}
                    aria-label="Listvy av"
                  >
                    Av
                  </button>
                  <button
                    type="button"
                    onClick={() => setListViewEnabled(true)}
                    className={`px-2 py-1 text-xs rounded-r-lg border transition-colors ${
                      listViewEnabled
                        ? 'bg-brand-green text-white border-brand-green'
                        : 'bg-white text-brand-text/70 border-gray-300 hover:bg-gray-50'
                    }`}
                    aria-pressed={listViewEnabled}
                    aria-label="Listvy på"
                  >
                    På
                  </button>
                </div>
                <div className="flex items-center gap-1.5" role="group" aria-label="Säljare">
                  <span className="text-xs text-brand-text/70">Säljare</span>
                  <div className="flex">
                    <button
                      type="button"
                      onClick={() => setSellerType('all')}
                      className={`px-2 py-1 text-xs border rounded-l-lg transition-colors ${
                        sellerType === 'all'
                          ? 'bg-brand-green text-white border-brand-green'
                          : 'bg-white text-brand-text/70 border-gray-300 hover:bg-gray-50'
                      }`}
                      aria-pressed={sellerType === 'all'}
                      aria-label="Alla säljare"
                    >
                      Alla
                    </button>
                    <button
                      type="button"
                      onClick={() => setSellerType('private')}
                      className={`px-2 py-1 text-xs border rounded-none border-l-0 transition-colors ${
                        sellerType === 'private'
                          ? 'bg-brand-green text-white border-brand-green'
                          : 'bg-white text-brand-text/70 border-gray-300 hover:bg-gray-50'
                      }`}
                      aria-pressed={sellerType === 'private'}
                      aria-label="Endast privatpersoner"
                    >
                      Privat
                    </button>
                    <button
                      type="button"
                      onClick={() => setSellerType('company')}
                      className={`px-2 py-1 text-xs border rounded-r-lg border-l-0 transition-colors ${
                        sellerType === 'company'
                          ? 'bg-brand-green text-white border-brand-green'
                          : 'bg-white text-brand-text/70 border-gray-300 hover:bg-gray-50'
                      }`}
                      aria-pressed={sellerType === 'company'}
                      aria-label="Endast företag"
                    >
                      Företag
                    </button>
                  </div>
                </div>
                <select
                  value={sort ?? 'newest'}
                  onChange={(e) => setSort(e.target.value as ListingSearchFilters['sort'])}
                  className="text-sm border border-gray-300 rounded-xl bg-white px-3 py-1 text-brand-text antialiased"
                  aria-label="Sortera annonser"
                >
                  <option value="newest">Senaste</option>
                  <option value="oldest">Äldsta</option>
                  <option value="price_asc">Pris (lägst först)</option>
                  <option value="price_desc">Pris (högst först)</option>
                  <option value="seller_company_first">Företag först</option>
                  <option value="seller_private_first">Privat först</option>
                </select>
              </div>

              {/* Filter-knapp: alltid synlig */}
              <button
                type="button"
                onClick={() => {
                  if (typeof window !== 'undefined' && window.innerWidth < 768) {
                    setIsFilterOpen(true)
                  } else {
                    setIsDesktopFilterOpen((prev) => !prev)
                  }
                }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-green text-white text-sm font-medium shadow-sm hover:bg-brand-green/90 transition-colors shrink-0"
                aria-label={isDesktopFilterOpen || isFilterOpen ? 'Stäng filter' : 'Öppna filter'}
              >
                <SlidersHorizontal className="w-4 h-4" aria-hidden />
                Filter
              </button>
            </div>
          </div>

          <div className="mb-3 flex flex-wrap gap-2">
            {selectedCategory !== 'all' && (
              <button
                type="button"
                onClick={() => removeFilterChip('category', '')}
                className="inline-flex items-center gap-1 px-3 py-1 text-xs rounded-full bg-brand-green/10 text-brand-green"
              >
                <span>{getCategoryLabel(selectedCategory)}</span>
                <X className="w-3 h-3" />
              </button>
            )}

            {locationFilter.fullCounties.map((countyValue) => {
              const county = getCountyByValue(countyValue)
              if (!county) return null
              return (
                <button
                  key={`county-${countyValue}`}
                  type="button"
                  onClick={() => removeFilterChip('locationCounty', countyValue)}
                  className="inline-flex items-center gap-1 px-3 py-1 text-xs rounded-full bg-brand-green/5 text-brand-text"
                >
                  <span>{county.label}</span>
                  <X className="w-3 h-3" />
                </button>
              )
            })}

            {locationFilter.partialMunicipalities.map((m) => {
              const label = getMunicipalityLabel(m.countyValue, m.municipalityValue)
              if (!label) return null
              return (
                <button
                  key={`mun-${m.countyValue}-${m.municipalityValue}`}
                  type="button"
                  onClick={() =>
                    removeFilterChip('locationMunicipality', `${m.countyValue}:${m.municipalityValue}`)
                  }
                  className="inline-flex items-center gap-1 px-3 py-1 text-xs rounded-full bg-brand-green/5 text-brand-text"
                >
                  <span>{label}</span>
                  <X className="w-3 h-3" />
                </button>
              )
            })}

            {bortskankesOnly && (
              <button
                type="button"
                onClick={() => removeFilterChip('bortskankes', '')}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-brand-green/20 text-brand-green text-xs font-medium hover:bg-brand-green/30 transition"
              >
                Bortskänkes <span aria-hidden>×</span>
              </button>
            )}
            {sellerType !== 'all' && (
              <button
                type="button"
                onClick={() => removeFilterChip('seller', '')}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-brand-green/20 text-brand-green text-xs font-medium hover:bg-brand-green/30 transition"
              >
                {sellerType === 'company' ? 'Företag' : 'Privat'} <span aria-hidden>×</span>
              </button>
            )}
            {priceMin && (
              <button
                type="button"
                onClick={() => removeFilterChip('priceMin', '')}
                className="inline-flex items-center gap-1 px-3 py-1 text-xs rounded-full bg-brand-green/5 text-brand-text"
              >
                <span>Min {formatCurrency(parsePrice(priceMin) ?? 0)}</span>
                <X className="w-3 h-3" />
              </button>
            )}

            {priceMax && (
              <button
                type="button"
                onClick={() => removeFilterChip('priceMax', '')}
                className="inline-flex items-center gap-1 px-3 py-1 text-xs rounded-full bg-brand-green/5 text-brand-text"
              >
                <span>Max {formatCurrency(parsePrice(priceMax) ?? 0)}</span>
                <X className="w-3 h-3" />
              </button>
            )}

            {isCarsCategory && (
              <>
                {yearFrom && (
                  <button
                    type="button"
                    onClick={() => removeFilterChip('yearFrom', '')}
                    className="inline-flex items-center gap-1 px-3 py-1 text-xs rounded-full bg-brand-green/5 text-brand-text"
                  >
                    <span>Från {yearFrom}</span>
                    <X className="w-3 h-3" />
                  </button>
                )}
                {yearTo && (
                  <button
                    type="button"
                    onClick={() => removeFilterChip('yearTo', '')}
                    className="inline-flex items-center gap-1 px-3 py-1 text-xs rounded-full bg-brand-green/5 text-brand-text"
                  >
                    <span>Till {yearTo}</span>
                    <X className="w-3 h-3" />
                  </button>
                )}
                {makeFilter && (
                  <button
                    type="button"
                    onClick={() => removeFilterChip('make', '')}
                    className="inline-flex items-center gap-1 px-3 py-1 text-xs rounded-full bg-brand-green/5 text-brand-text"
                  >
                    <span>{makeFilter}{modelFilter ? ` ${modelFilter}` : ''}</span>
                    <X className="w-3 h-3" />
                  </button>
                )}
                {modelFilter && !makeFilter && (
                  <button
                    type="button"
                    onClick={() => removeFilterChip('model', '')}
                    className="inline-flex items-center gap-1 px-3 py-1 text-xs rounded-full bg-brand-green/5 text-brand-text"
                  >
                    <span>{modelFilter}</span>
                    <X className="w-3 h-3" />
                  </button>
                )}
                {maxMileage && (
                  <button
                    type="button"
                    onClick={() => removeFilterChip('maxMileage', '')}
                    className="inline-flex items-center gap-1 px-3 py-1 text-xs rounded-full bg-brand-green/5 text-brand-text"
                  >
                    <span>Max {maxMileage === '20000+' ? '20000+ mil' : `${maxMileage} mil`}</span>
                    <X className="w-3 h-3" />
                  </button>
                )}
                {fuelFilter && (
                  <button
                    type="button"
                    onClick={() => removeFilterChip('fuel', '')}
                    className="inline-flex items-center gap-1 px-3 py-1 text-xs rounded-full bg-brand-green/5 text-brand-text"
                  >
                    <span>{fuelFilter}</span>
                    <X className="w-3 h-3" />
                  </button>
                )}
                {gearboxFilter && (
                  <button
                    type="button"
                    onClick={() => removeFilterChip('gearbox', '')}
                    className="inline-flex items-center gap-1 px-3 py-1 text-xs rounded-full bg-brand-green/5 text-brand-text"
                  >
                    <span>{gearboxFilter}</span>
                    <X className="w-3 h-3" />
                  </button>
                )}
                {bodyTypeFilter && (
                  <button
                    type="button"
                    onClick={() => removeFilterChip('bodyType', '')}
                    className="inline-flex items-center gap-1 px-3 py-1 text-xs rounded-full bg-brand-green/5 text-brand-text"
                  >
                    <span>{bodyTypeFilter}</span>
                    <X className="w-3 h-3" />
                  </button>
                )}
                {driveWheelFilter && (
                  <button
                    type="button"
                    onClick={() => removeFilterChip('driveWheel', '')}
                    className="inline-flex items-center gap-1 px-3 py-1 text-xs rounded-full bg-brand-green/5 text-brand-text"
                  >
                    <span>{driveWheelFilter}</span>
                    <X className="w-3 h-3" />
                  </button>
                )}
                {colorFilter && (
                  <button
                    type="button"
                    onClick={() => removeFilterChip('color', '')}
                    className="inline-flex items-center gap-1 px-3 py-1 text-xs rounded-full bg-brand-green/5 text-brand-text"
                  >
                    <span>Färg: {colorFilter}</span>
                    <X className="w-3 h-3" />
                  </button>
                )}
                {horsepowerMin && (
                  <button
                    type="button"
                    onClick={() => removeFilterChip('hpMin', '')}
                    className="inline-flex items-center gap-1 px-3 py-1 text-xs rounded-full bg-brand-green/5 text-brand-text"
                  >
                    <span>Min {horsepowerMin} hk</span>
                    <X className="w-3 h-3" />
                  </button>
                )}
                {horsepowerMax && (
                  <button
                    type="button"
                    onClick={() => removeFilterChip('hpMax', '')}
                    className="inline-flex items-center gap-1 px-3 py-1 text-xs rounded-full bg-brand-green/5 text-brand-text"
                  >
                    <span>Max {horsepowerMax} hk</span>
                    <X className="w-3 h-3" />
                  </button>
                )}
              </>
            )}

            {(selectedCategory !== 'all' ||
              locationFilter.fullCounties.length > 0 ||
              locationFilter.partialMunicipalities.length > 0 ||
              bortskankesOnly ||
              sellerType !== 'all' ||
              makeFilter ||
              modelFilter ||
              priceMin ||
              priceMax ||
              (isCarsCategory &&
                (yearFrom ||
                  yearTo ||
                  maxMileage ||
                  fuelFilter ||
                  gearboxFilter ||
                  bodyTypeFilter ||
                  driveWheelFilter ||
                  colorFilter ||
                  horsepowerMin ||
                  horsepowerMax))) && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('')
                  resetFilters()
                  setSearchSubmitted(false)
                }}
                className="inline-flex items-center gap-1 px-3 py-1 text-xs rounded-full border border-brand-green/40 text-brand-green bg-white"
              >
                <span>Rensa alla filter</span>
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          <div className="w-full min-h-[50vh]">
            {isLoadingList ? (
              <div className="text-center py-20 text-brand-text/60">Laddar annonser...</div>
            ) : filteredAds.length === 0 ? (
              <div className="flex items-center justify-center w-full min-h-[50vh]">
                <div className="text-center py-20 px-6 bg-white rounded-xl shadow-md border border-dashed border-gray-300">
                  <p className="text-brand-text/70 text-lg">{t.landing.listings.empty}</p>
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('')
                      resetFilters()
                      setSearchSubmitted(false)
                    }}
                    className="text-brand-green underline mt-2 hover:text-brand-green/80"
                  >
                    Rensa sökning
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div
                  className={
                    listViewEnabled
                      ? 'flex flex-col rounded-xl border border-gray-100 overflow-hidden bg-white shadow-sm'
                      : 'grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3'
                  }
                >
                  {filteredAds.map((ad, index) => (
                    <ListingCard
                      key={ad.id}
                      listing={ad}
                      currentUserId={currentUserId}
                      isFavorited={localFavoriteIds.has(ad.id)}
                      onFavoriteRemoved={handleFavoriteRemoved}
                      layout={listViewEnabled ? 'list' : 'grid'}
                      listIndex={index}
                      priority={index < 6}
                    />
                  ))}
                </div>
                {hasMore && (
                  <div className="flex justify-center mt-6">
                    <button
                      type="button"
                      onClick={handleLoadMore}
                      disabled={loadingMore}
                      className="px-6 py-2 rounded-full bg-brand-green text-white text-sm font-medium shadow-sm hover:bg-brand-green/90 disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {loadingMore ? 'Laddar fler…' : 'Visa fler annonser'}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </main>

      <ScrollToSearch />

      {serverError && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-40 bg-red-600 text-white text-sm px-4 py-2 rounded-full shadow-lg">
          {serverError}
        </div>
      )}

      {showLoggedOutToast && (
        <div
          className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-green-600 text-white text-sm px-4 py-2 rounded-full shadow-lg flex items-center gap-2"
          role="status"
          aria-live="polite"
        >
          <span>
            {loggedOutReason === 'deleted'
              ? 'Ditt konto har raderats!'
              : 'Du har loggats ut.'}
          </span>
          <button
            type="button"
            onClick={() => setShowLoggedOutToast(false)}
            className="text-white/80 hover:text-white underline text-xs"
          >
            Stäng
          </button>
        </div>
      )}

      {showLoggedInToast && (
        <div
          className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-green-600 text-white text-sm px-4 py-2 rounded-full shadow-lg flex items-center gap-2"
          role="status"
          aria-live="polite"
        >
          <span>
            {loginType === 'new'
              ? 'Hurra! Välkommen till Kolla här!'
              : currentUserName
              ? `Välkommen tillbaka ${currentUserName}!`
              : 'Välkommen tillbaka!'}
          </span>
          <button
            type="button"
            onClick={() => setShowLoggedInToast(false)}
            className="text-white/80 hover:text-white underline text-xs"
          >
            Stäng
          </button>
        </div>
      )}
    </div>
  )
}
