'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Menu } from 'lucide-react'
import UserMenu from './components/UserMenu'

// Vi importerar texter och knappar som vanligt
import { DASHBOARD_TEXTS } from './lib/content'
import Button from './components/atoms/Button'
import ListingCard from './components/ListingCard'
import type { Listing } from './types'

// Initiera Supabase
const supabase = createClient()

export default function HomePage() {
  const router = useRouter()
  
  const [ads, setAds] = useState<Listing[]>([])          
  const [filteredAds, setFilteredAds] = useState<Listing[]>([]) 
  const [loading, setLoading] = useState(true)
  const [favoriteIds, setFavoriteIds] = useState<string[]>([])
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)

  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('Alla')
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
        await fetchFavorites(userId)
      } else {
        setFavoriteIds([])
      }
    }

    initAuth()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const userId = session?.user?.id ?? null
      setCurrentUserId(userId)
      if (userId) {
        fetchFavorites(userId)
      } else {
        setFavoriteIds([])
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

  const handleSearchInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value)
    // Reset searchSubmitted när användaren börjar skriva igen
    if (searchSubmitted) {
      setSearchSubmitted(false)
    }
  }

  // --- SÄKER NAVIGERING TILL "SÄLJ" ---
  const handleSellClick = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      router.push('/dashboard/create')
    } else {
      router.push('/login')
    }
  }

  const handleDashboardClick = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) router.push('/dashboard')
    else router.push('/login')
  }

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
      <nav className="bg-white border-b border-gray-200 p-4 sticky top-0 z-20 shadow-sm">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-2">
          {/* Logotyp / Brand */}
          <button
            type="button"
            onClick={() => window.scrollTo(0, 0)}
            className="text-2xl md:text-3xl font-display text-brand-green tracking-tight cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand-green focus:ring-offset-2 focus:ring-offset-white"
          >
            {t.navigation.brand}
          </button>

          {/* Sökfält - Desktop (mitt i headern) */}
          <div className="hidden md:flex flex-1 justify-start ml-4">
            <form onSubmit={handleSearch} className="relative w-full max-w-xl">
              <svg
                className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-text/50 z-10"
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
              <input
                type="search"
                aria-label={t.landing.search.placeholder}
                placeholder={t.landing.search.placeholder}
                value={searchQuery}
                onChange={handleSearchInputChange}
                className="w-full pl-11 pr-20 py-2.5 rounded-full border border-gray-300 text-sm md:text-base bg-white focus:outline-none focus:ring-2 focus:ring-brand-green focus:border-brand-green"
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
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
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

          {/* Navigation / Actions */}
          <div className="flex items-center gap-2">
            {/* Desktop: UserMenu för inloggad, annars Logga in + Sälj-knapp */}
            {currentUserId ? (
              <div className="hidden md:flex items-center gap-3">
                <Button onClick={handleSellClick}>
                  {t.navigation.sellBtn}
                </Button>
                <UserMenu />
              </div>
            ) : (
              <div className="hidden md:flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => router.push('/login')}
                  className="text-sm font-medium hover:underline text-brand-text/70 hover:text-brand-green transition"
                >
                  Logga in
                </button>
                <Button onClick={handleSellClick}>
                  {t.navigation.sellBtn}
                </Button>
              </div>
            )}

            {/* Mobil: enklare menyikon */}
            <button
              type="button"
              onClick={() => {
                if (currentUserId) {
                  router.push('/dashboard')
                } else {
                  router.push('/login')
                }
              }}
              className="inline-flex md:hidden items-center justify-center h-10 w-10 rounded-full border border-brand-green/30 text-brand-green hover:bg-brand-green/10 focus:outline-none focus:ring-2 focus:ring-brand-green focus:ring-offset-2 focus:ring-offset-white"
              aria-label={currentUserId ? 'Öppna Min Dashboard' : 'Logga in'}
            >
              <Menu className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>
        </div>
      </nav>

      {/* --- HERO SECTION --- */}
      <div className="relative bg-brand-beige py-6 md:py-10 px-4 text-center overflow-hidden">
        <div className="relative z-10 max-w-4xl mx-auto">
          {/* Hero-logotyp överst (endast desktop) */}
          <img
            src="/hero-logo.png"
            alt="Kollahär Logo"
            className="hidden md:block h-24 md:h-32 mx-auto mb-3 object-contain"
          />

          <h2 className="text-2xl md:text-4xl font-display font-extrabold mb-2 tracking-tight text-brand-green drop-shadow-sm">
            {t.landing.hero.title}
          </h2>
          
          {/* --- SÖK (Mobil) & KATEGORIER --- */}
          <div className="max-w-3xl mx-auto mt-3 mb-2">
            {/* Sökfält - endast mobil (lätt att nå med tummen) */}
            <form onSubmit={handleSearch} className="mb-4 relative block md:hidden">
              <svg
                className="absolute left-5 top-1/2 -translate-y-1/2 text-brand-text/50 z-10"
                xmlns="http://www.w3.org/2000/svg"
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
              <input
                type="search"
                aria-label={t.landing.search.placeholder}
                placeholder={t.landing.search.placeholder}
                value={searchQuery}
                onChange={handleSearchInputChange}
                className="w-full pl-12 pr-20 py-3 rounded-full bg-white text-base focus:outline-none focus:ring-2 focus:ring-brand-green shadow-md"
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
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
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
    </div>
  )
}