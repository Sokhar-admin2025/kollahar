'use client'

import { Suspense, useEffect, useState } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'

import { DASHBOARD_TEXTS } from '@/app/lib/content'
import Button from '@/app/components/atoms/Button'
import { messageService } from '@/app/services/messageService'
import FavoriteButton from '@/app/components/FavoriteButton'
import Header from '@/app/components/organisms/Header'
import { createClient } from '@/lib/supabase/client'
import type { Listing } from '@/app/types'
import { MapPin, Loader2 } from 'lucide-react'

const supabase = createClient()

export default function ListingDetailsPage() {
  return (
    <Suspense fallback={<div className="p-10 text-center">Laddar...</div>}>
      <ListingDetails />
    </Suspense>
  )
}

interface SellerProfile {
  id: string
  full_name: string | null
  location: string | null
  avatar_url: string | null
  consent_marketing: boolean
  consent_analytics: boolean
  updated_at: string
}

interface CurrentUser {
  id: string
}

function ListingDetails() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const id = params?.id
  const listingId = typeof id === 'string' ? id : id?.[0]
  const t = DASHBOARD_TEXTS.details

  // Bygg tillbaka-URL med bevara sökparametrar
  const backUrl = (() => {
    const q = searchParams.get('q')
    const category = searchParams.get('category')
    if (q || category) {
      const params = new URLSearchParams()
      if (q) params.set('q', q)
      if (category) params.set('category', category)
      return `/?${params.toString()}`
    }
    return '/'
  })()

  // State för Annons
  const [ad, setAd] = useState<Listing | null>(null)
  const [activeImage, setActiveImage] = useState<string | null>(null)
  
  // State för Säljare (NYTT!)
  const [sellerProfile, setSellerProfile] = useState<SellerProfile | null>(null)
  
  // State för Applikation
  const [loading, setLoading] = useState(true)
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null)
  const [contacting, setContacting] = useState(false)
  const [isFavorited, setIsFavorited] = useState(false)

  useEffect(() => {
    const fetchData = async () => {
      // 1. Hämta annonsen
      const { data: adData, error } = await supabase
        .from('listings')
        .select('*')
        .eq('id', listingId)
        .single()

      if (error) {
        console.error('Error fetching listing:', error)
      } else {
        setAd(adData)
        if (adData.images && adData.images.length > 0) {
          setActiveImage(adData.images[0])
        }

        // 3. Hämta säljarens profil (NYTT!)
        // Vi använder adData.user_id för att hitta rätt profil
        const { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', adData.user_id)
          .single()
        
        if (profileData) {
          setSellerProfile(profileData)
        }
      }

      setLoading(false)
    }

    if (listingId) fetchData()
  }, [listingId])

  useEffect(() => {
    let isMounted = true

    const fetchFavorite = async (userId: string, listing: string) => {
      const { data: favoriteData, error: favoriteError } = await supabase
        .from('favorites')
        .select('listing_id')
        .eq('user_id', userId)
        .eq('listing_id', listing)
        .maybeSingle()

      if (!isMounted) return

      if (favoriteError) {
        console.error('Error fetching favorite:', favoriteError)
        setIsFavorited(false)
      } else {
        setIsFavorited(!!favoriteData)
      }
    }

    const initAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!isMounted) return
      const user = session?.user ? { id: session.user.id } : null
      setCurrentUser(user)
      if (user && listingId) {
        await fetchFavorite(user.id, listingId)
      } else {
        setIsFavorited(false)
      }
    }

    initAuth()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const user = session?.user ? { id: session.user.id } : null
      setCurrentUser(user)
      if (user && listingId) {
        fetchFavorite(user.id, listingId)
      } else {
        setIsFavorited(false)
      }
    })

    return () => {
      isMounted = false
      subscription.unsubscribe()
    }
  }, [listingId])

  const handleContact = async () => {
    if (!ad) return

    if (!currentUser) {
      alert(DASHBOARD_TEXTS.messages.actions.loginToChat)
      router.push('/login')
      return
    }

    if (currentUser.id === ad.user_id) {
      alert("Du kan inte chatta på din egen annons! 😅")
      return
    }

    setContacting(true)

    try {
      const conversationId = await messageService.createConversation(
        ad.id,
        currentUser.id,
        ad.user_id
      )
      router.push('/dashboard/messages')
    } catch (error) {
      console.error(error)
      alert("Kunde inte starta chatten just nu.")
    } finally {
      setContacting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-brand-beige flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-brand-green" />
          <p className="text-brand-text antialiased">{t.loading}</p>
        </div>
      </div>
    )
  }
  
  if (!ad) return (
    <div className="p-10 text-center bg-brand-beige min-h-screen">
      <h2 className="text-xl font-display text-brand-green mb-4">{t.notFound.title}</h2>
      <Link href="/" className="text-brand-green underline hover:text-brand-green/80">{t.notFound.link}</Link>
    </div>
  )

  return (
    <div className="min-h-screen bg-brand-beige flex flex-col">
      <Header />
      
      <div className="max-w-4xl mx-auto py-10 px-4 flex-grow">
        <Link href={backUrl} className="inline-block mb-6 text-sm font-medium text-brand-text/70 hover:text-brand-green transition">
          {t.backToHome}
        </Link>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          
          {/* --- BILDGALLERI (VÄNSTER) --- */}
          <div className="flex flex-col gap-4">
            <div className="bg-white rounded-xl overflow-hidden shadow-md border border-gray-200 aspect-square relative">
              {activeImage ? (
                <img src={activeImage} alt={ad.title} className="w-full h-full object-cover transition-all duration-300" />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-brand-beige text-brand-text/60">
                  {t.noImage}
                </div>
              )}
              <div className="absolute top-4 left-4 bg-brand-green/95 text-white backdrop-blur px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider shadow-lg">
                {ad.category}
              </div>
            </div>

            {ad.images && ad.images.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-2">
                {ad.images.map((img: string, index: number) => (
                  <button 
                    key={index}
                    onClick={() => setActiveImage(img)}
                    className={`relative w-20 h-20 rounded-xl overflow-hidden border-2 flex-shrink-0 transition ${
                      activeImage === img ? 'border-brand-green ring-2 ring-brand-green/20' : 'border-transparent opacity-70 hover:opacity-100'
                    }`}
                  >
                    <img src={img} alt={`Bild ${index + 1}`} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* --- INFO (HÖGER) --- */}
          <div className="flex flex-col h-full">
            <div className="bg-white p-8 rounded-xl shadow-md border border-gray-200 flex-1 flex flex-col relative">
              {!(currentUser?.id && ad?.user_id === currentUser.id) && (
                <div className="absolute top-4 right-4">
                  <FavoriteButton listingId={ad.id} />
                </div>
              )}
              
              <div className="mb-6">
                <h1 className="text-3xl font-bold text-brand-green mb-2">{ad.title}</h1>
                <div className="flex items-center text-brand-text/70 text-sm">
                  <span className="mr-2">📍</span>
                  {ad.location}
                  <span className="mx-2">•</span>
                  {new Date(ad.created_at).toLocaleDateString()}
                </div>
              </div>

              <div className="text-4xl font-bold text-brand-green mb-8">
                {ad.price} kr
              </div>

              <div className="prose prose-sm text-brand-text mb-8 flex-grow">
                <h3 className="text-brand-text font-semibold mb-2">{t.sections.description}</h3>
                <p className="whitespace-pre-line">{ad.description}</p>
              </div>

              {/* --- NYTT: SÄLJARKORT --- */}
              <div className="mt-auto">
                <div className="mb-4 pt-6 border-t border-gray-100">
                  <p className="text-xs font-bold text-brand-text/60 uppercase tracking-widest mb-3">Säljare</p>
                  
                  <div className="flex items-center gap-4 bg-brand-beige p-3 rounded-xl border border-gray-200">
                    {/* Säljarens Bild */}
                    <div className="w-12 h-12 rounded-full bg-white border border-gray-200 overflow-hidden flex-shrink-0">
                      {sellerProfile?.avatar_url ? (
                        <img src={sellerProfile.avatar_url} alt="Säljare" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-300 text-xl">👤</div>
                      )}
                    </div>
                    
                    {/* Säljarens Namn + Plats */}
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-brand-text truncate">
                        {sellerProfile?.full_name || 'Anonym säljare'}
                      </h4>
                      {sellerProfile?.location && (
                        <p className="mt-0.5 flex items-center gap-1 text-xs text-brand-text/80 truncate">
                          <MapPin className="w-3.5 h-3.5 text-brand-green flex-shrink-0" strokeWidth={2.5} />
                          <span>{sellerProfile.location}</span>
                        </p>
                      )}
                      {!sellerProfile?.location && (
                        <p className="text-xs text-brand-text/60">Medlem på Kolla här!</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Kontaktknapp */}
                {ad.status === 'active' ? (
                  <Button 
                    onClick={handleContact} 
                    className="w-full py-4 text-lg font-bold shadow-lg"
                    disabled={contacting}
                  >
                    {contacting ? 'Öppnar chatt...' : t.contact.button}
                  </Button>
                ) : (
                   <div className="bg-brand-beige p-4 rounded-xl text-center text-brand-text/70 font-medium">
                     Denna vara är inte längre till salu.
                   </div>
                )}
                
                <p className="text-xs text-center text-gray-400 mt-4">
                  🔒 Handla tryggt. All kommunikation sker via Kolla här!.
                </p>
              </div>

            </div>
          </div>
        </div>
      </div>
    </div>
  )
}