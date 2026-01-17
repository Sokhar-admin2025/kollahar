'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import Link from 'next/link'

import { DASHBOARD_TEXTS } from '../../lib/content'
import Button from '../../components/atoms/Button'
import { messageService } from '../../services/messageService'
import FavoriteButton from '../../components/FavoriteButton'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
)

export default function ListingDetails() {
  const params = useParams()
  const router = useRouter()
  const id = params?.id
  const listingId = typeof id === 'string' ? id : id?.[0]
  const t = DASHBOARD_TEXTS.details

  // State för Annons
  const [ad, setAd] = useState<any>(null)
  const [activeImage, setActiveImage] = useState<string | null>(null)
  
  // State för Säljare (NYTT!)
  const [sellerProfile, setSellerProfile] = useState<any>(null)
  
  // State för Applikation
  const [loading, setLoading] = useState(true)
  const [currentUser, setCurrentUser] = useState<any>(null)
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
      const user = session?.user ?? null
      setCurrentUser(user)
      if (user && listingId) {
        await fetchFavorite(user.id, listingId)
      } else {
        setIsFavorited(false)
      }
    }

    initAuth()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const user = session?.user ?? null
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

  if (loading) return <div className="p-10 text-center">{t.loading}</div>
  
  if (!ad) return (
    <div className="p-10 text-center">
      <h2 className="text-xl font-bold mb-4">{t.notFound.title}</h2>
      <Link href="/" className="text-blue-600 underline">{t.notFound.link}</Link>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-4xl mx-auto">
        
        <Link href="/" className="inline-block mb-6 text-sm font-medium text-gray-500 hover:text-black transition">
          {t.backToHome}
        </Link>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          
          {/* --- BILDGALLERI (VÄNSTER) --- */}
          <div className="flex flex-col gap-4">
            <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-200 aspect-square relative">
              {activeImage ? (
                <img src={activeImage} alt={ad.title} className="w-full h-full object-cover transition-all duration-300" />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gray-100 text-gray-400">
                  {t.noImage}
                </div>
              )}
              <div className="absolute top-4 left-4 bg-white/90 backdrop-blur px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider shadow-sm">
                {ad.category}
              </div>
            </div>

            {ad.images && ad.images.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-2">
                {ad.images.map((img: string, index: number) => (
                  <button 
                    key={index}
                    onClick={() => setActiveImage(img)}
                    className={`relative w-20 h-20 rounded-lg overflow-hidden border-2 flex-shrink-0 transition ${
                      activeImage === img ? 'border-blue-600 ring-2 ring-blue-100' : 'border-transparent opacity-70 hover:opacity-100'
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
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-200 flex-1 flex flex-col relative">
              {!(currentUser?.id && ad?.user_id === currentUser.id) && (
                <div className="absolute top-4 right-4">
                  <FavoriteButton listingId={ad.id} />
                </div>
              )}
              
              <div className="mb-6">
                <h1 className="text-3xl font-extrabold text-gray-900 mb-2">{ad.title}</h1>
                <div className="flex items-center text-gray-500 text-sm">
                  <span className="mr-2">📍</span>
                  {ad.location}
                  <span className="mx-2">•</span>
                  {new Date(ad.created_at).toLocaleDateString()}
                </div>
              </div>

              <div className="text-4xl font-bold text-blue-600 mb-8">
                {ad.price} kr
              </div>

              <div className="prose prose-sm text-gray-600 mb-8 flex-grow">
                <h3 className="text-gray-900 font-semibold mb-2">{t.sections.description}</h3>
                <p className="whitespace-pre-line">{ad.description}</p>
              </div>

              {/* --- NYTT: SÄLJARKORT --- */}
              <div className="mt-auto">
                <div className="mb-4 pt-6 border-t border-gray-100">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Säljare</p>
                  
                  <div className="flex items-center gap-4 bg-gray-50 p-3 rounded-xl border border-gray-100">
                    {/* Säljarens Bild */}
                    <div className="w-12 h-12 rounded-full bg-white border border-gray-200 overflow-hidden flex-shrink-0">
                      {sellerProfile?.avatar_url ? (
                        <img src={sellerProfile.avatar_url} alt="Säljare" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-300 text-xl">👤</div>
                      )}
                    </div>
                    
                    {/* Säljarens Namn */}
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-gray-900 truncate">
                        {sellerProfile?.full_name || 'Anonym säljare'}
                      </h4>
                      {sellerProfile?.website && (
                         <a href={sellerProfile.website} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline truncate block">
                           {sellerProfile.website.replace(/^https?:\/\//, '')}
                         </a>
                      )}
                      {!sellerProfile?.website && (
                        <p className="text-xs text-gray-500">Medlem på Sokhar</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Kontaktknapp */}
                {ad.status === 'active' ? (
                  <Button 
                    onClick={handleContact} 
                    className="w-full py-4 text-lg font-bold shadow-lg shadow-blue-500/20"
                    disabled={contacting}
                  >
                    {contacting ? 'Öppnar chatt...' : t.contact.button}
                  </Button>
                ) : (
                   <div className="bg-gray-100 p-4 rounded-lg text-center text-gray-500 font-medium">
                     Denna vara är inte längre till salu.
                   </div>
                )}
                
                <p className="text-xs text-center text-gray-400 mt-4">
                  🔒 Handla tryggt. All kommunikation sker via Sokhar.
                </p>
              </div>

            </div>
          </div>
        </div>
      </div>
    </div>
  )
}