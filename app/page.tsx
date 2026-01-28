'use client'

import { Suspense, useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Search, X } from 'lucide-react'

// Vi importerar texter och knappar som vanligt
import { DASHBOARD_TEXTS } from './lib/content'
import ListingCard from './components/ListingCard'
import Header from './components/organisms/Header'
import ScrollToSearch from './components/ScrollToSearch'
import type { Listing } from './types'

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
  const router = useRouter()
  const searchParams = useSearchParams()
  
  const [ads, setAds] = useState<Listing[]>([])          
  const [filteredAds, setFilteredAds] = useState<Listing[]>([]) 
  const [loading, setLoading] = useState(true)
  const [favoriteIds, setFavoriteIds] = useState<string[]>([])
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [currentUserName, setCurrentUserName] = useState<string | null>(null)
  const [showLoggedOutToast, setShowLoggedOutToast] = useState(false)
  const [loggedOutReason, setLoggedOutReason] = useState<'logout' | 'deleted' | null>(null)
  const [showLoggedInToast, setShowLoggedInToast] = useState(false)
  const [loginType, setLoginType] = useState<'new' | 'returning' | null>(null)

  // Läs från URL-parametrar vid första laddningen
  const [searchQuery, setSearchQuery] = useState(() => searchParams.get('q') || '')
  const [selectedCategory, setSelectedCategory] = useState(() => searchParams.get('category') || 'Alla')
  const [searchSubmitted, setSearchSubmitted] = useState(false)

  const t = DASHBOARD_TEXTS

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
        setFilteredAds((data as Listing[]) || [])
      }

      setLoading(false)
    }

    fetchAds()
  }, [])

  // Visa logout-toast om logged_out finns i URL:en
  useEffect(() => {
    const loggedOutParam = searchParams.get('logged_out')
    if (!loggedOutParam) return

    // Spara orsak (vanlig logout eller kontoradering) innan vi städar URL:en
    setLoggedOutReason(loggedOutParam === 'deleted' ? 'deleted' : 'logout')
    setShowLoggedOutToast(true)

    // Rensa logged_out-parametern så toasten inte visas igen vid reload
    const params = new URLSearchParams(searchParams.toString())
    params.delete('logged_out')
    const newUrl = params.toString() ? `/?${params.toString()}` : '/'
    if (typeof window !== 'undefined') {
      window.history.replaceState({}, '', newUrl)
    }
  }, [searchParams])

  // Visa login-toast om logged_in finns i URL:en
  useEffect(() => {
    const loggedInParam = searchParams.get('logged_in')
    if (!loggedInParam) return

    setLoginType(loggedInParam === 'new' ? 'new' : 'returning')
    setShowLoggedInToast(true)

    // Rensa logged_in-parametern så toasten inte visas igen vid reload
    const params = new URLSearchParams(searchParams.toString())
    params.delete('logged_in')
    const newUrl = params.toString() ? `/?${params.toString()}` : '/'
    if (typeof window !== 'undefined') {
      window.history.replaceState({}, '', newUrl)
    }
  }, [searchParams])

  useEffect(() => {
    let isMounted = true

    const fetchFavorites = async (userId: string) => {
      const { data: favoritesData, error: favoritesError } = await supabase
        .from('favorites')
        .select('listing_id')
        .eq('user_id', userId)

      if (!isMounted) return

      if (favoritesError) {
        console.error('Fel vid hämtning av favoriter:', favoritesError)
        setFavoriteIds([])
      } else {
        setFavoriteIds(favoritesData?.map((favorite) => favorite.listing_id) ?? [])
      }
    }

    const initAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!isMounted) return
      const userId = session?.user?.id ?? null
      setCurrentUserId(userId)

      if (userId) {
        // Hämta favoriter
        await fetchFavorites(userId)

        // Hämta profilnamn för välkomst-toast
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', userId)
          .single()

        if (!isMounted) return
        setCurrentUserName(profile?.full_name ?? null)
      } else {
        setFavoriteIds([])
        setCurrentUserName(null)
      }
    }

    initAuth()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const userId = session?.user?.id ?? null
      setCurrentUserId(userId)

      if (userId) {
        fetchFavorites(userId)

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
        setFavoriteIds([])
        setCurrentUserName(null)
      }
    })

    return () => {
      isMounted = false
      subscription.unsubscribe()
    }
  }, [])

  // 2. Filtrera listan (real-time filtering)
  useEffect(() => {
    let result = ads

    if (searchQuery) {
      const lowerQuery = searchQuery.toLowerCase()
      result = result.filter(ad => 
        ad.title.toLowerCase().includes(lowerQuery) || 
        ad.description.toLowerCase().includes(lowerQuery)
      )
    }

    if (selectedCategory !== 'Alla') {
      result = result.filter(ad => ad.category === selectedCategory)
    }

    setFilteredAds(result)
  }, [searchQuery, selectedCategory, ads])

  // 3. Uppdatera URL-parametrar när sökning/kategori ändras
  useEffect(() => {
    const params = new URLSearchParams()
    if (searchQuery) {
      params.set('q', searchQuery)
    }
    if (selectedCategory && selectedCategory !== 'Alla') {
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

  const favoriteIdSet = useMemo(() => new Set(favoriteIds), [favoriteIds])

  const handleFavoriteToggle = (listingId: string, isFavorited: boolean) => {
    setFavoriteIds((prev) => {
      const next = new Set(prev)
      if (isFavorited) next.add(listingId)
      else next.delete(listingId)
      return Array.from(next)
    })
  }

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

            {/* Kategoriknappar (Pill-shape, EAA-vänliga) */}
            <div className="flex flex-col items-center gap-3">
              <span className="text-xs font-bold text-brand-text/70 uppercase tracking-widest">
                {t.landing.search.filterTitle}
              </span>
              <div className="flex flex-wrap gap-3 justify-center">
                {t.landing.search.categories.map((cat) => {
                  const isActive = selectedCategory === cat
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setSelectedCategory(cat)}
                      className={`min-h-[44px] px-5 md:px-6 rounded-full text-sm md:text-base font-medium inline-flex items-center justify-center transition-colors focus:outline-none focus:ring-2 focus:ring-brand-green focus:ring-offset-2 focus:ring-offset-brand-beige ${
                        isActive
                          ? 'bg-brand-green text-white border border-brand-green shadow-md'
                          : 'bg-white text-brand-text border border-gray-300 hover:bg-brand-green/10'
                      }`}
                    >
                      {cat}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* --- ANNONS-GALLERI --- */}
      <main id="search-results" className="max-w-6xl mx-auto p-3 w-full flex-grow">
        {/* ARIA-live region för skärmläsare */}
        <div 
          aria-live="polite" 
          aria-atomic="true" 
          className="sr-only"
        >
          {searchQuery 
            ? `Sökningen visar ${filteredAds.length} ${filteredAds.length === 1 ? 'resultat' : 'resultat'} för "${searchQuery}"`
            : selectedCategory !== 'Alla'
            ? `Visar ${filteredAds.length} ${filteredAds.length === 1 ? 'annons' : 'annonser'} i kategorin ${selectedCategory}`
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
                setSelectedCategory('Alla')
                setSearchSubmitted(false)
              }} 
              className="text-brand-green underline mt-2 hover:text-brand-green/80"
            >
              Rensa sökning
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {filteredAds.map((ad) => (
              <ListingCard
                key={ad.id}
                listing={ad}
                currentUserId={currentUserId}
              />
            ))}
          </div>
        )}
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
              ? 'Hurra! Välkommen till Kollahär!'
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