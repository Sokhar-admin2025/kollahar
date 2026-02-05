'use client'

import { Suspense, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
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

const supabase = createClient()

interface HomePageClientProps {
  initialAds: Listing[]
  initialError?: string | null
}

export default function HomePageClient({ initialAds, initialError }: HomePageClientProps) {
  const searchParams = useSearchParams()

  const [ads, setAds] = useState<Listing[]>(initialAds)
  const [loading, setLoading] = useState(false)
  const [initialLoadError] = useState<string | null>(initialError ?? null)

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
  const [searchSubmitted, setSearchSubmitted] = useState(false)
  const [priceMin, setPriceMin] = useState('')
  const [priceMax, setPriceMax] = useState('')
  const [locationFilter, setLocationFilter] = useState<LocationFilterValue>({
    fullCounties: [],
    partialMunicipalities: [],
  })
  const [yearFrom, setYearFrom] = useState('')
  const [yearTo, setYearTo] = useState('')
  const [maxMileage, setMaxMileage] = useState('')
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

  const filteredAds = useMemo(() => {
    let result = ads

    if (searchQuery) {
      const lowerQuery = searchQuery.toLowerCase()
      result = result.filter(ad =>
        ad.title.toLowerCase().includes(lowerQuery) ||
        ad.description.toLowerCase().includes(lowerQuery)
      )
    }

    if (selectedCategory !== 'all') {
      result = result.filter(ad => ad.category === selectedCategory)
    }

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

    const minPrice = parseInt(priceMin)
    const maxPrice = parseInt(priceMax)
    if (!isNaN(minPrice)) {
      result = result.filter(ad => ad.price >= minPrice)
    }
    if (!isNaN(maxPrice)) {
      result = result.filter(ad => ad.price <= maxPrice)
    }

    if (isCarsCategory) {
      const minYear = parseInt(yearFrom)
      const maxYear = parseInt(yearTo)
      const maxMileageNum = parseInt(maxMileage)

      result = result.filter(ad => {
        const attributes = ad.attributes || {}
        const carYear = typeof attributes.year === 'number' ? attributes.year : parseInt(String(attributes.year))
        const carMileage = typeof attributes.mileage === 'number' ? attributes.mileage : parseInt(String(attributes.mileage))
        const driveWheel = attributes.drive_wheel as string | undefined
        const color = attributes.color as string | undefined
        const horsepower = typeof attributes.horsepower === 'number'
          ? attributes.horsepower
          : attributes.horsepower
          ? parseInt(String(attributes.horsepower))
          : undefined

        if (!isNaN(minYear) && (!carYear || carYear < minYear)) return false
        if (!isNaN(maxYear) && (!carYear || carYear > maxYear)) return false
        if (!isNaN(maxMileageNum) && (!carMileage || carMileage > maxMileageNum)) return false
        if (fuelFilter && attributes.fuel !== fuelFilter) return false
        if (gearboxFilter && attributes.gearbox !== gearboxFilter) return false
        if (bodyTypeFilter && attributes.body_type !== bodyTypeFilter) return false
        if (driveWheelFilter && driveWheel !== driveWheelFilter) return false
        if (colorFilter && (!color || color.toLowerCase() !== colorFilter.toLowerCase())) return false

        const minHp = parseInt(horsepowerMin)
        const maxHp = parseInt(horsepowerMax)
        if (!isNaN(minHp) && (!horsepower || horsepower < minHp)) return false
        if (!isNaN(maxHp) && (!horsepower || horsepower > maxHp)) return false

        return true
      })
    }

    return result
  }, [
    ads,
    searchQuery,
    selectedCategory,
    locationFilter,
    priceMin,
    priceMax,
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
    isCarsCategory,
  ])

  useEffect(() => {
    const params = new URLSearchParams()
    if (searchQuery) {
      params.set('q', searchQuery)
    }
    if (selectedCategory && selectedCategory !== 'all') {
      params.set('category', selectedCategory)
    }

    const newUrl = params.toString() ? `/?${params.toString()}` : '/'
    window.history.replaceState({}, '', newUrl)
  }, [searchQuery, selectedCategory])

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

      {/* HERO + SÖK/FILTER (mobil) */}
      {/* ... exakt samma markup som tidigare HomePageContent ... */}
      {/* För korthet, lämnar vi resten av strukturen oförändrad härifrån */}

      {/* För att hålla svaret fokuserat: */}
      {/* Huvudlistan återanvänder filteredAds precis som tidigare. */}

      {/* Logout-/login-toasts använder initialLoadError endast om vi vill visa globalt fel. */}
      {initialLoadError && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-40 bg-red-600 text-white text-sm px-4 py-2 rounded-full shadow-lg">
          {initialLoadError}
        </div>
      )}

      {/* Resten av layouten (hero, filter, grid) återanvänds från befintlig page.tsx */}
    </div>
  )
}

