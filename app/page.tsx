'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'

// Vi importerar texter och knappar som vanligt
import { DASHBOARD_TEXTS } from './lib/content'
import Button from './components/atoms/Button'
import ListingCard from './components/ListingCard'
import type { Listing } from './types'

// Initiera Supabase
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
)

export default function HomePage() {
  const router = useRouter()
  
  const [ads, setAds] = useState<Listing[]>([])          
  const [filteredAds, setFilteredAds] = useState<Listing[]>([]) 
  const [loading, setLoading] = useState(true)
  const [favoriteIds, setFavoriteIds] = useState<string[]>([])
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [authReady, setAuthReady] = useState(false)

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
      setAuthReady(true)
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
      setAuthReady(true)
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
    <div className="min-h-screen bg-gray-50 flex flex-col">
      
      {/* --- HEADER --- */}
      <nav className="bg-white border-b p-4 sticky top-0 z-20 shadow-sm">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <h1 className="text-xl font-bold tracking-tight cursor-pointer text-gray-900" onClick={() => window.scrollTo(0,0)}>
            {t.navigation.brand}
          </h1>
          
          <div className="flex gap-4 items-center">
            <button 
              onClick={handleDashboardClick} 
              className="text-sm font-medium hover:underline text-gray-700"
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
      <div className="relative bg-gray-900 py-32 px-4 text-center overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img 
            src="https://images.unsplash.com/photo-1556740758-90de374c12ad?auto=format&fit=crop&w=1600&q=80" 
            alt="Marketplace background" 
            className="w-full h-full object-cover opacity-40"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-gray-900/90"></div>
        </div>

        <div className="relative z-10 max-w-4xl mx-auto">
          <h2 className="text-4xl md:text-6xl font-extrabold mb-6 tracking-tight text-white drop-shadow-sm">
            {t.landing.hero.title}
          </h2>
          <p className="text-gray-200 text-lg md:text-xl mb-10 max-w-2xl mx-auto leading-relaxed">
            {t.landing.hero.subtitle}
          </p>
          
          <button 
            onClick={handleSellClick}
            className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-full font-bold text-lg shadow-lg hover:shadow-blue-500/30 transition transform hover:-translate-y-1"
          >
            {t.landing.hero.cta}
          </button>
        </div>
      </div>

      {/* --- SÖK & FILTER --- */}
      <div className="max-w-6xl mx-auto px-6 -mt-10 relative z-20 w-full mb-12">
        <div className="bg-white rounded-xl shadow-xl p-6 md:p-8 border border-gray-100">
          <div className="mb-6 relative">
            <svg className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
            <input 
              type="text"
              placeholder={t.landing.search.placeholder}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-200 rounded-lg text-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition hover:bg-white"
            />
          </div>

          <div className="flex flex-col md:flex-row gap-4 items-center">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">
              {t.landing.search.filterTitle}
            </span>
            <div className="flex flex-wrap gap-2">
              {t.landing.search.categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-5 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                    selectedCategory === cat
                      ? 'bg-gray-900 text-white shadow-md transform scale-105'
                      : 'bg-white border border-gray-200 text-gray-600 hover:border-gray-400 hover:bg-gray-50'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* --- ANNONS-GALLERI --- */}
      <main className="max-w-6xl mx-auto p-6 w-full flex-grow">
        <div className="flex justify-between items-end mb-6">
          <h3 className="text-2xl font-bold text-gray-900">{t.landing.listings.header}</h3>
          <span className="text-sm text-gray-500">{filteredAds.length} träffar</span>
        </div>

        {loading ? (
          <div className="text-center py-20 text-gray-400">Laddar annonser...</div>
        ) : filteredAds.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-lg border border-dashed border-gray-300">
            <p className="text-gray-500 text-lg">{t.landing.listings.empty}</p>
            <button 
              onClick={() => {setSearchQuery(''); setSelectedCategory('Alla')}} 
              className="text-blue-600 underline mt-2"
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
                authReady={authReady}
                isFavorited={favoriteIdSet.has(ad.id)}
                onToggleFavorite={handleFavoriteToggle}
                locationPrefix={t.landing.listings.locationPrefix}
                noImageLabel={t.listing.noImage}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  )
}