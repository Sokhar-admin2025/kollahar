'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

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

  // 2. Filtrera listan
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
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <h1 className="text-xl font-display text-brand-green tracking-tight cursor-pointer" onClick={() => window.scrollTo(0,0)}>
            {t.navigation.brand}
          </h1>
          
          <div className="flex gap-4 items-center">
            <button 
              onClick={handleDashboardClick} 
              className="text-sm font-medium hover:underline text-brand-text/70 hover:text-brand-green transition"
            >
              {t.navigation.myPage}
            </button>
            
            <Button onClick={handleSellClick}>
              {t.navigation.sellBtn}
            </Button>
          </div>
        </div>
      </nav>

      {/* --- HERO SECTION --- */}
      <div className="relative bg-brand-beige py-20 md:py-32 px-4 text-center overflow-hidden">
        <div className="relative z-10 max-w-4xl mx-auto">
          <h2 className="text-4xl md:text-6xl font-display font-extrabold mb-6 tracking-tight text-brand-green drop-shadow-sm">
            {t.landing.hero.title}
          </h2>
          <p className="text-brand-text text-lg md:text-xl mb-10 max-w-2xl mx-auto leading-relaxed">
            {t.landing.hero.subtitle}
          </p>
          
          {/* --- SÖK & FILTER INNE I HERO --- */}
          <div className="max-w-3xl mx-auto mt-12 mb-8">
            {/* Sökfält */}
            <div className="mb-6 relative">
              <svg className="absolute left-6 top-1/2 transform -translate-y-1/2 text-brand-text/50 z-10" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
              <input 
                type="text"
                placeholder={t.landing.search.placeholder}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-14 pr-6 py-5 bg-white rounded-xl text-lg focus:ring-2 focus:ring-brand-green focus:outline-none transition shadow-lg"
              />
            </div>

            {/* Kategoriknappar */}
            <div className="flex flex-col items-center gap-4">
              <span className="text-xs font-bold text-brand-text/70 uppercase tracking-widest">
                {t.landing.search.filterTitle}
              </span>
              <div className="flex flex-wrap gap-3 justify-center">
                {t.landing.search.categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-6 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                      selectedCategory === cat
                        ? 'bg-brand-green text-white shadow-lg'
                        : 'bg-white text-brand-text hover:bg-brand-green/10 border border-brand-green/20'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* --- ANNONS-GALLERI --- */}
      <main className="max-w-6xl mx-auto p-6 w-full flex-grow">
        <div className="flex justify-between items-end mb-6">
          <h3 className="text-2xl font-display text-brand-green">{t.landing.listings.header}</h3>
          <span className="text-sm text-brand-text/70">{filteredAds.length} träffar</span>
        </div>

        {loading ? (
          <div className="text-center py-20 text-brand-text/60">Laddar annonser...</div>
        ) : filteredAds.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-xl shadow-md border border-dashed border-gray-300">
            <p className="text-brand-text/70 text-lg">{t.landing.listings.empty}</p>
            <button 
              onClick={() => {setSearchQuery(''); setSelectedCategory('Alla')}} 
              className="text-brand-green underline mt-2 hover:text-brand-green/80"
            >
              Rensa sökning
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
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