'use client'

import { useEffect, useMemo, useRef, useState, useTransition } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Search, X, SlidersHorizontal, ChevronDown, ChevronUp } from 'lucide-react'

import { DASHBOARD_TEXTS } from './lib/content'
import ListingCard from './components/ListingCard'
import Header from './components/organisms/Header'
import ScrollToSearch from './components/ScrollToSearch'
import type { Listing } from './types'
import { CATEGORY_GROUPS, getCategoryLabel } from '@/lib/categories'
import { getCountyByValue, getMunicipalityLabel } from '@/lib/swedish-locations'
import CarMakeModelCombobox from './components/CarMakeModelCombobox'
import LocationFilter, { type LocationFilterValue } from './components/LocationFilter'
import { getListings, type ListingSearchFilters } from '@/lib/features/listings/listing-service'

const supabase = createClient()
const PAGE_SIZE = 24

interface HomePageClientProps {
  initialAds: Listing[]
  initialError?: string | null
}

export default function HomePageClient({ initialAds, initialError }: HomePageClientProps) {
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const router = useRouter()

  const [ads, setAds] = useState<Listing[]>(initialAds)
  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(initialAds.length === PAGE_SIZE)
  const [serverError, setServerError] = useState<string | null>(initialError ?? null)
  const [isPending, startTransition] = useTransition()

  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [currentUserName, setCurrentUserName] = useState<string | null>(null)
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
    if (yearFrom) {
      params.set('minYear', yearFrom)
    }
    if (yearTo) {
      params.set('maxYear', yearTo)
    }
    if (maxMileage) {
      params.set('maxMileage', maxMileage)
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
  }, [searchQuery, selectedCategory, priceMin, priceMax, yearFrom, yearTo, maxMileage, sort, locationFilter])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setSearchSubmitted(true)
    if (filteredAds.length > 0) {
      const resultsElement = document.getElementById('search-results')
      if (resultsElement) {
        resultsElement.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
    }
  }

  const handleSearchInputChange = (value: string) => {
    setSearchQuery(value)
    if (searchSubmitted) {
      setSearchSubmitted(false)
    }
  }

  const resetCarFilters = () => {
    setYearFrom('')
    setYearTo('')
    setMaxMileage('')
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
    setLocationFilter({ fullCounties: [], partialMunicipalities: [] })
    resetCarFilters()
  }

  const isFirstFilterMount = useRef(true)

  /** Bygger serverfilter från aktuellt state (samma logik som page.tsx). */
  const buildFilters = (offset: number): ListingSearchFilters => {
    const minPrice = priceMin ? parseInt(priceMin, 10) : undefined
    const maxPrice = priceMax ? parseInt(priceMax, 10) : undefined
    const minYear = yearFrom ? parseInt(yearFrom, 10) : undefined
    const maxYear = yearTo ? parseInt(yearTo, 10) : undefined
    const maxMileageNum = maxMileage ? parseInt(maxMileage, 10) : undefined
    const hpMin = horsepowerMin ? parseInt(horsepowerMin, 10) : undefined
    const hpMax = horsepowerMax ? parseInt(horsepowerMax, 10) : undefined

    let location: string | undefined
    if (locationFilter.fullCounties.length > 0) {
      const county = getCountyByValue(locationFilter.fullCounties[0])
      location = county?.label
    }
    if (!location && locationFilter.partialMunicipalities.length > 0) {
      const m = locationFilter.partialMunicipalities[0]
      location = getMunicipalityLabel(m.countyValue, m.municipalityValue)
    }

    return {
      query: searchQuery.trim() || undefined,
      category: selectedCategory !== 'all' ? selectedCategory : undefined,
      location,
      minPrice: minPrice !== undefined && !Number.isNaN(minPrice) ? minPrice : undefined,
      maxPrice: maxPrice !== undefined && !Number.isNaN(maxPrice) ? maxPrice : undefined,
      minYear: minYear !== undefined && !Number.isNaN(minYear) ? minYear : undefined,
      maxYear: maxYear !== undefined && !Number.isNaN(maxYear) ? maxYear : undefined,
      maxMileage: maxMileageNum !== undefined && !Number.isNaN(maxMileageNum) ? maxMileageNum : undefined,
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
  }

  // Refetch första sidan när användaren ändrar filter (hoppar över initial mount).
  useEffect(() => {
    if (isFirstFilterMount.current) {
      isFirstFilterMount.current = false
      return
    }
    let cancelled = false
    setLoading(true)
    setServerError(null)
    getListings(buildFilters(0))
      .then((result) => {
        if (cancelled) return
        if (!result.success) {
          setServerError(result.error ?? null)
          setAds([])
          setHasMore(false)
        } else {
          const data = result.data ?? []
          setAds(data)
          setHasMore(data.length === PAGE_SIZE)
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [
    searchQuery,
    selectedCategory,
    sort,
    priceMin,
    priceMax,
    locationFilter,
    yearFrom,
    yearTo,
    maxMileage,
    fuelFilter,
    gearboxFilter,
    bodyTypeFilter,
    driveWheelFilter,
    colorFilter,
    horsepowerMin,
    horsepowerMax,
  ])

  const handleLoadMore = async () => {
    if (loadingMore || !hasMore) return
    setLoadingMore(true)
    setServerError(null)
    const nextOffset = ads.length
    const result = await getListings(buildFilters(nextOffset))
    if (!result.success) {
      setServerError(result.error ?? null)
      setHasMore(false)
      setLoadingMore(false)
      return
    }
    const newListings = result.data ?? []
    setAds((prev) => [...prev, ...newListings])
    setHasMore(newListings.length === PAGE_SIZE)
    setLoadingMore(false)
  }

  const fuelOptions = ['Bensin', 'Diesel', 'El', 'Gas', 'Hybrid'].sort()
  const gearboxOptions = ['Manuell', 'Automat']
  const bodyTypeOptions = ['Cab', 'Coupé', 'Halvkombi', 'Kombi', 'Minibuss', 'Sedan', 'Skåpbil', 'SUV'].sort()
  const driveWheelOptions = ['Framhjulsdrift', 'Bakhjulsdrift', 'Fyrhjulsdrift']
  const maxMileageOptions = ['1000', '3000', '5000', '10000', '15000', '20000', '20000+']

  const allYears = useMemo(() => {
    const currentYear = new Date().getFullYear()
    const years: number[] = []
    for (let y = 1990; y <= currentYear + 1; y++) {
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
    <div className="space-y-6">
      {/* Kategori */}
      <div>
        <label className="block text-sm font-medium text-brand-text mb-2 antialiased">Kategori</label>
        <select
          className="w-full p-3 border border-gray-300 rounded-xl bg-white text-brand-text antialiased"
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

      <div className="space-y-6">
        {/* Plats */}
        <div>
          <label className="block text-sm font-medium text-brand-text mb-2 antialiased">
            Plats
          </label>
          <LocationFilter
            value={locationFilter}
            onChange={setLocationFilter}
            stickySearch={isFilterOpen}
            selectedCategory={selectedCategory}
            searchQuery={searchQuery}
          />
        </div>

        {/* Pris */}
        <div>
          <label className="block text-sm font-medium text-brand-text mb-2 antialiased">
            Prisintervall (kr)
          </label>
          <div className="grid grid-cols-2 gap-3">
            <input
              type="number"
              min={0}
              placeholder="Min kr"
              className="w-full p-3 border border-gray-300 rounded-xl bg-white text-brand-text antialiased"
              value={priceMin}
              onChange={(e) => setPriceMin(e.target.value)}
            />
            <input
              type="number"
              min={0}
              placeholder="Max kr"
              className="w-full p-3 border border-gray-300 rounded-xl bg-white text-brand-text antialiased"
              value={priceMax}
              onChange={(e) => setPriceMax(e.target.value)}
            />
          </div>
        </div>

        {/* Bil-specifika primära filter */}
        {isCarsCategory && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-brand-text mb-2 antialiased">
                Märke & modell
              </label>
              <CarMakeModelCombobox
                value={{ make: '', model: '' }}
                onChange={() => {}}
                className=""
              />
              <p className="mt-1 text-xs text-brand-text/60">
                Sök efter bilmärke och modell (visuellt stöd, make/modell-filter kan aktiveras här senare).
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
                className="w-full p-3 border border-gray-300 rounded-xl bg-white text-brand-text antialiased"
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
        <div className="border-t border-gray-200 pt-4">
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
            <div className="mt-4 space-y-6">
              {/* Drivmedel */}
              <div>
                <label className="block text-sm font-medium text-brand-text mb-2 antialiased">Drivmedel</label>
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
                <label className="block text-sm font-medium text-brand-text mb-2 antialiased">Växellåda</label>
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
                <label className="block text-sm font-medium text-brand-text mb-2 antialiased">Kaross</label>
                <select
                  className="w-full p-3 border border-gray-300 rounded-xl bg-white text-brand-text antialiased"
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
                <label className="block text-sm font-medium text-brand-text mb-2 antialiased">Drivhjul</label>
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
                <label className="block text-sm font-medium text-brand-text mb-2 antialiased">Färg</label>
                <input
                  type="text"
                  placeholder="Alla färger"
                  className="w-full p-3 border border-gray-300 rounded-xl text-brand-text placeholder:text-gray-400 antialiased"
                  value={colorFilter}
                  onChange={(e) => setColorFilter(e.target.value)}
                />
              </div>

              {/* Effekt */}
              <div>
                <label className="block text-sm font-medium text-brand-text mb-2 antialiased">
                  Effekt (hk)
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="number"
                    min={0}
                    placeholder="Min hk"
                    className="w-full p-3 border border-gray-300 rounded-xl bg-white text-brand-text antialiased"
                    value={horsepowerMin}
                    onChange={(e) => setHorsepowerMin(e.target.value)}
                  />
                  <input
                    type="number"
                    min={0}
                    placeholder="Max hk"
                    className="w-full p-3 border border-gray-300 rounded-xl bg-white text-brand-text antialiased"
                    value={horsepowerMax}
                    onChange={(e) => setHorsepowerMax(e.target.value)}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      <button
        type="button"
        onClick={resetFilters}
        className="w-full py-2 text-sm text-brand-green underline hover:text-brand-green/80 antialiased"
      >
        Rensa filter
      </button>
    </div>
  )

  const isLoadingList = loading || isPending

  return (
    <div className="min-h-screen bg-brand-beige flex flex-col">
      {/* HEADER */}
      <Header
        showSearch={true}
        searchQuery={searchQuery}
        onSearchChange={handleSearchInputChange}
        onSearchSubmit={handleSearch}
        onClearSearch={() => {
          setSearchQuery('')
          setSearchSubmitted(false)
        }}
      />

      {/* HERO + mobil-sök/filter */}
      <div id="hero-section" className="relative bg-brand-beige py-6 md:py-10 px-4 text-center overflow-hidden">
        <div className="relative z-10 max-w-4xl mx-auto">
          <img
            src="/hero-logo.png"
            alt="Kollahär! Logo"
            className="hidden md:block h-24 md:h-32 mx-auto mb-3 object-contain"
          />

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

            <div className="flex items-center justify-center md:hidden">
              <button
                type="button"
                onClick={() => setIsFilterOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-gray-300 bg-white text-brand-text text-sm font-medium shadow-sm hover:bg-brand-beige"
              >
                <SlidersHorizontal className="w-4 h-4" aria-hidden="true" />
                Filter
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobil filter-drawer */}
      {isFilterOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setIsFilterOpen(false)}
          />
          <div className="absolute right-0 top-0 h-[95vh] w-[90%] max-w-[95%] bg-white shadow-xl flex flex-col overflow-hidden">
            <div className="shrink-0 p-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-brand-text">Filter</h3>
              <button
                type="button"
                onClick={() => setIsFilterOpen(false)}
                className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full hover:bg-brand-beige -m-2"
                aria-label="Stäng filter"
              >
                <X className="w-5 h-5" aria-hidden="true" />
              </button>
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden p-4 pb-4">
              {filterFields}
            </div>
            <div className="shrink-0 border-t border-gray-200 p-4 bg-white flex flex-col gap-2">
              <button
                type="button"
                onClick={() => {
                  resetFilters()
                  setSearchSubmitted(false)
                }}
                className="text-sm text-brand-green hover:underline py-2 min-h-[44px] flex items-center justify-center touch-manipulation"
              >
                Rensa filter
              </button>
              <button
                type="button"
                onClick={() => setIsFilterOpen(false)}
                className="w-full min-h-[48px] py-3 rounded-xl bg-brand-green text-white font-semibold shadow-md touch-manipulation"
              >
                Visa {filteredAds.length} resultat
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Huvudlista + desktop-filter + sortering + Visa fler */}
      <main id="search-results" className="w-full max-w-7xl mx-auto px-4 py-3 flex-grow relative">
        {isDesktopFilterOpen && (
          <div
            className="hidden lg:block fixed inset-0 bg-black/40 z-40 transition-opacity"
            onClick={() => setIsDesktopFilterOpen(false)}
            aria-hidden
          />
        )}

        <aside
          className={`hidden lg:block fixed inset-y-0 left-0 h-full w-[350px] bg-white shadow-2xl border-r border-gray-200 z-50 transition-transform duration-300 ease-in-out ${
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

          <div className="flex justify-between items-end gap-3 mb-3">
            <h3 className="text-2xl font-display text-brand-green">{t.landing.listings.header}</h3>
            <div className="flex items-center gap-3 shrink-0">
              <span className="text-sm text-brand-text/70">{filteredAds.length} träffar</span>

              <select
                value={sort ?? 'newest'}
                onChange={(e) =>
                  setSort(e.target.value as ListingSearchFilters['sort'])
                }
                className="hidden md:inline-block text-sm border border-gray-300 rounded-xl bg-white px-3 py-1 text-brand-text antialiased"
                aria-label="Sortera annonser"
              >
                <option value="newest">Senaste</option>
                <option value="oldest">Äldsta</option>
                <option value="price_asc">Pris (lägst först)</option>
                <option value="price_desc">Pris (högst först)</option>
              </select>

              <button
                type="button"
                onClick={() => setIsDesktopFilterOpen(!isDesktopFilterOpen)}
                className="hidden lg:inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-green text-white text-sm font-medium shadow-sm hover:bg-brand-green/90 transition-colors"
                aria-label={isDesktopFilterOpen ? 'Stäng filter' : 'Öppna filter'}
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

            {priceMin && (
              <button
                type="button"
                onClick={() => removeFilterChip('priceMin', '')}
                className="inline-flex items-center gap-1 px-3 py-1 text-xs rounded-full bg-brand-green/5 text-brand-text"
              >
                <span>Min {priceMin} kr</span>
                <X className="w-3 h-3" />
              </button>
            )}

            {priceMax && (
              <button
                type="button"
                onClick={() => removeFilterChip('priceMax', '')}
                className="inline-flex items-center gap-1 px-3 py-1 text-xs rounded-full bg-brand-green/5 text-brand-text"
              >
                <span>Max {priceMax} kr</span>
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
                <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                  {filteredAds.map((ad) => (
                    <ListingCard
                      key={ad.id}
                      listing={ad}
                      currentUserId={currentUserId}
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
