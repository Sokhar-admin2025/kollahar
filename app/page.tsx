'use client'

import { Suspense, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Search, X, SlidersHorizontal, ChevronDown, ChevronUp } from 'lucide-react'
import DualRangeSlider from './components/DualRangeSlider'

// Vi importerar texter och knappar som vanligt
import { DASHBOARD_TEXTS } from './lib/content'
import ListingCard from './components/ListingCard'
import Header from './components/organisms/Header'
import ScrollToSearch from './components/ScrollToSearch'
import type { Listing } from './types'
import { CATEGORY_GROUPS, getCategoryLabel } from '@/lib/categories'

// Initiera Supabase
const supabase = createClient()

export default function HomePage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center">Laddar...</div>}>
      <HomePageContent />
    </Suspense>
  )
}

function HomePageContent() {
  const searchParams = useSearchParams()
  
  const [ads, setAds] = useState<Listing[]>([])          
  const [loading, setLoading] = useState(true)
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

  // Läs från URL-parametrar vid första laddningen
  const [searchQuery, setSearchQuery] = useState(() => searchParams.get('q') || '')
  const [selectedCategory, setSelectedCategory] = useState(() => searchParams.get('category') || 'all')
  const [searchSubmitted, setSearchSubmitted] = useState(false)
  const [priceMin, setPriceMin] = useState('')
  const [priceMax, setPriceMax] = useState('')
  const [locationFilter, setLocationFilter] = useState('')
  const [yearMin, setYearMin] = useState('')
  const [yearMax, setYearMax] = useState('')
  const [mileageMin, setMileageMin] = useState('')
  const [mileageMax, setMileageMax] = useState('')
  const [fuelFilter, setFuelFilter] = useState('')
  const [gearboxFilter, setGearboxFilter] = useState('')
  const [bodyTypeFilter, setBodyTypeFilter] = useState('')
  const [isFilterOpen, setIsFilterOpen] = useState(false)
  const [isDesktopFilterOpen, setIsDesktopFilterOpen] = useState(false)
  const [showMoreFilters, setShowMoreFilters] = useState(false)
  
  // Dual range slider values (convert from string to number)
  const priceMinNum = parseInt(priceMin) || 0
  const priceMaxNum = parseInt(priceMax) || 1000000
  const yearMinNum = parseInt(yearMin) || 1960
  const yearMaxNum = parseInt(yearMax) || new Date().getFullYear() + 1
  const mileageMinNum = parseInt(mileageMin) || 0
  const mileageMaxNum = parseInt(mileageMax) || 500000

  const t = DASHBOARD_TEXTS
  const isCarsCategory = selectedCategory === 'cars'

  // 1. Hämta data DIREKT (Utan service-fil)
  useEffect(() => {
    const fetchAds = async () => {
      const { data, error } = await supabase
        .from('listings')
        .select('*')
        .eq('status', 'active')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Fel vid hämtning:', error)
      } else {
        setAds((data as Listing[]) || [])
      }

      setLoading(false)
    }

    fetchAds()
  }, [])

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
        // Hämta profilnamn för välkomst-toast
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

    if (locationFilter) {
      const lowerLocation = locationFilter.toLowerCase()
      result = result.filter(ad => ad.location?.toLowerCase().includes(lowerLocation))
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
      const minYear = parseInt(yearMin)
      const maxYear = parseInt(yearMax)
      const minMileage = parseInt(mileageMin)
      const maxMileage = parseInt(mileageMax)

      result = result.filter(ad => {
        const attributes = ad.attributes || {}
        const carYear = typeof attributes.year === 'number' ? attributes.year : parseInt(String(attributes.year))
        const carMileage = typeof attributes.mileage === 'number' ? attributes.mileage : parseInt(String(attributes.mileage))

        if (!isNaN(minYear) && (!carYear || carYear < minYear)) return false
        if (!isNaN(maxYear) && (!carYear || carYear > maxYear)) return false
        if (!isNaN(minMileage) && (!carMileage || carMileage < minMileage)) return false
        if (!isNaN(maxMileage) && (!carMileage || carMileage > maxMileage)) return false
        if (fuelFilter && attributes.fuel !== fuelFilter) return false
        if (gearboxFilter && attributes.gearbox !== gearboxFilter) return false
        if (bodyTypeFilter && attributes.body_type !== bodyTypeFilter) return false

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
    yearMin,
    yearMax,
    mileageMin,
    mileageMax,
    fuelFilter,
    gearboxFilter,
    bodyTypeFilter,
    isCarsCategory,
  ])

  // 3. Uppdatera URL-parametrar när sökning/kategori ändras
  useEffect(() => {
    const params = new URLSearchParams()
    if (searchQuery) {
      params.set('q', searchQuery)
    }
    if (selectedCategory && selectedCategory !== 'all') {
      params.set('category', selectedCategory)
    }
    
    const newUrl = params.toString() ? `/?${params.toString()}` : '/'
    // Använd replaceState för att inte skapa ny historik-post
    window.history.replaceState({}, '', newUrl)
  }, [searchQuery, selectedCategory])

  // Hantera sökning (för EAA - explicit submit)
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    // Real-time filtering sker redan via useEffect, men vi markerar att sökning är submit:ad
    setSearchSubmitted(true)
    // Fokusera på resultatet för skärmläsare
    if (filteredAds.length > 0) {
      // Scrolla till resultaten
      const resultsElement = document.getElementById('search-results')
      if (resultsElement) {
        resultsElement.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
    }
  }

  const handleSearchInputChange = (value: string) => {
    setSearchQuery(value)
    // Reset searchSubmitted när användaren börjar skriva igen
    if (searchSubmitted) {
      setSearchSubmitted(false)
    }
  }

  // --- SÄKER NAVIGERING TILL "SÄLJ" ---

  const resetCarFilters = () => {
    setYearMin('')
    setYearMax('')
    setMileageMin('')
    setMileageMax('')
    setFuelFilter('')
    setGearboxFilter('')
    setBodyTypeFilter('')
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
    setLocationFilter('')
    resetCarFilters()
  }

  const fuelOptions = ['Bensin', 'Diesel', 'El', 'Gas', 'Hybrid'].sort()
  const gearboxOptions = ['Manuell', 'Automat']
  const bodyTypeOptions = ['Cab', 'Coupé', 'Halvkombi', 'Kombi', 'Minibuss', 'Sedan', 'Skåpbil', 'SUV'].sort()

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

      {/* Obligatoriska filter överst */}
      <div className="space-y-6">
        <h3 className="text-sm font-semibold text-brand-text uppercase tracking-wider">Obligatoriska filter</h3>
        
        {/* Pris - Dual Range Slider */}
        <DualRangeSlider
          min={0}
          max={1000000}
          minValue={priceMinNum}
          maxValue={priceMaxNum}
          onMinChange={(val) => setPriceMin(val.toString())}
          onMaxChange={(val) => setPriceMax(val.toString())}
          step={1000}
          label="Pris"
          unit=" kr"
        />

        {/* År & Mil (endast för bilar) */}
        {isCarsCategory && (
          <>
            <DualRangeSlider
              min={1960}
              max={new Date().getFullYear() + 1}
              minValue={yearMinNum}
              maxValue={yearMaxNum}
              onMinChange={(val) => setYearMin(val.toString())}
              onMaxChange={(val) => setYearMax(val.toString())}
              step={1}
              label="Modellår"
            />

            <DualRangeSlider
              min={0}
              max={500000}
              minValue={mileageMinNum}
              maxValue={mileageMaxNum}
              onMinChange={(val) => setMileageMin(val.toString())}
              onMaxChange={(val) => setMileageMax(val.toString())}
              step={1000}
              label="Miltal"
              unit=" mil"
            />
          </>
        )}
      </div>

      {/* Fler filter (Collapsible) */}
      <div className="border-t border-gray-200 pt-4">
        <button
          type="button"
          onClick={() => setShowMoreFilters(!showMoreFilters)}
          className="flex items-center justify-between w-full text-left text-brand-text hover:text-brand-green transition-colors"
        >
          <span className="text-sm font-medium antialiased">Fler filter</span>
          {showMoreFilters ? (
            <ChevronUp className="w-5 h-5" />
          ) : (
            <ChevronDown className="w-5 h-5" />
          )}
        </button>

        {showMoreFilters && (
          <div className="mt-4 space-y-6">
            {/* Plats */}
            <div>
              <label className="block text-sm font-medium text-brand-text mb-2 antialiased">Plats</label>
              <input
                type="text"
                placeholder="Hela Sverige"
                className="w-full p-3 border border-gray-300 rounded-xl text-brand-text placeholder:text-gray-400 antialiased"
                value={locationFilter}
                onChange={(e) => setLocationFilter(e.target.value)}
              />
            </div>

            {/* Bil-specifika filter */}
            {isCarsCategory && (
              <>
                {/* Drivmedel (Chips) */}
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

                {/* Växellåda (Chips) */}
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
              </>
            )}
          </div>
        )}
      </div>

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
      
      {/* --- HEADER --- */}
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

      {/* --- HERO SECTION --- */}
      <div id="hero-section" className="relative bg-brand-beige py-6 md:py-10 px-4 text-center overflow-hidden">
        <div className="relative z-10 max-w-4xl mx-auto">
          {/* Hero-logotyp överst (endast desktop) */}
          <img
            src="/hero-logo.png"
            alt="Kollahär! Logo"
            className="hidden md:block h-24 md:h-32 mx-auto mb-3 object-contain"
          />

          <h2 className="hidden md:block text-2xl md:text-4xl font-display font-extrabold mb-2 tracking-tight text-brand-green drop-shadow-sm">
            {t.landing.hero.title}
          </h2>
          
          {/* --- SÖK (Mobil) & KATEGORIER --- */}
          <div className="max-w-3xl mx-auto mt-3 mb-2">
            {/* Sökfält - endast mobil (lätt att nå med tummen) */}
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

            {/* Filter-knapp (Mobil) */}
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

      {isFilterOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setIsFilterOpen(false)}
          />
          <div className="absolute right-0 top-0 h-full w-[90%] max-w-[95%] bg-white p-6 overflow-y-auto shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-brand-text">Filter</h3>
              <button
                type="button"
                onClick={() => setIsFilterOpen(false)}
                className="p-2 rounded-full hover:bg-brand-beige"
                aria-label="Stäng filter"
              >
                <X className="w-5 h-5" aria-hidden="true" />
              </button>
            </div>
            {filterFields}
            <button
              type="button"
              onClick={() => setIsFilterOpen(false)}
              className="mt-6 w-full py-3 rounded-xl bg-brand-green text-white font-semibold"
            >
              Visa resultat
            </button>
          </div>
        </div>
      )}

      {/* --- ANNONS-GALLERI --- */}
      <main id="search-results" className="max-w-6xl mx-auto p-3 w-full flex-grow relative">
        {/* Desktop Filter Etikett (Sticky, till vänster i mitten) */}
        <button
          type="button"
          onClick={() => setIsDesktopFilterOpen(!isDesktopFilterOpen)}
          className="hidden md:flex fixed left-0 top-1/2 -translate-y-1/2 z-40 bg-brand-green text-white px-3 py-6 rounded-r-xl shadow-lg hover:bg-brand-green/90 transition-all font-medium items-center justify-center"
          style={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }}
        >
          Filter
        </button>

        {/* Desktop Filter Overlay */}
        {isDesktopFilterOpen && (
          <div
            className="hidden md:block fixed inset-0 bg-black/40 z-40"
            onClick={() => setIsDesktopFilterOpen(false)}
          />
        )}

        {/* Desktop Filter Sidebar (Rullas fram) */}
        <aside
          className={`hidden md:block fixed left-0 top-0 h-full w-64 bg-white shadow-xl border-r border-gray-200 z-50 transition-transform duration-300 ease-in-out ${
            isDesktopFilterOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
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

        {/* Annonser (Behåller bredd, 5 per rad på desktop) */}
        <div className="md:pl-0">
          {/* ARIA-live region för skärmläsare */}
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
          
          <div className="flex justify-between items-end mb-3">
            <h3 className="text-2xl font-display text-brand-green">{t.landing.listings.header}</h3>
            <span className="text-sm text-brand-text/70">{filteredAds.length} träffar</span>
          </div>

          {loading ? (
            <div className="text-center py-20 text-brand-text/60">Laddar annonser...</div>
          ) : filteredAds.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-xl shadow-md border border-dashed border-gray-300">
              <p className="text-brand-text/70 text-lg">{t.landing.listings.empty}</p>
              <button 
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
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
              {filteredAds.map((ad) => (
                <ListingCard
                  key={ad.id}
                  listing={ad}
                  currentUserId={currentUserId}
                />
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Scroll to Search-knapp */}
      <ScrollToSearch />

      {/* Logout / konto-raderat toast */}
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

      {/* Login-toast */}
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