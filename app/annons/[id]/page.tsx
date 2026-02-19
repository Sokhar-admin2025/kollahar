'use client'

import { Suspense, useEffect, useState, useRef } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'

import { DASHBOARD_TEXTS } from '@/app/lib/content'
import Button from '@/app/components/atoms/Button'
import { createConversationAction } from '@/app/actions/message-actions'
import { logListingViewAction } from '@/app/actions/listing-view-actions'
import FavoriteButton from '@/app/components/FavoriteButton'
import { createClient } from '@/lib/supabase/client'
import type { Listing } from '@/app/types'
import { getListingById } from '@/lib/features/listings/listing-service'
import { Loader2, ChevronLeft, ChevronRight, Calendar, Gauge, Fuel, Settings2, Car, Palette, Zap, BadgeCheck, Share2, Link2 } from 'lucide-react'
import { getCategoryLabel, CATEGORY_GROUPS } from '@/lib/categories'
import { formatCurrency } from '@/lib/features/listings/utils/price-utils'

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
  account_type?: 'private' | 'company'
  is_company_verified?: boolean
  address?: string | null
  zip_code?: string | null
  city?: string | null
  website?: string | null
  bio?: string | null
  org_number?: string | null
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

  // Bygg tillbaka-URL och bevara relevanta filter-parametrar (inkl. plats)
  const backUrl = (() => {
    const q = searchParams.get('q')
    const category = searchParams.get('category')
    const minPrice = searchParams.get('minPrice')
    const maxPrice = searchParams.get('maxPrice')
    const minYear = searchParams.get('minYear')
    const maxYear = searchParams.get('maxYear')
    const maxMileage = searchParams.get('maxMileage')
    const sort = searchParams.get('sort')
    const counties = searchParams.getAll('county')
    const municipalities = searchParams.getAll('mun')

    const params = new URLSearchParams()

    if (q) params.set('q', q)
    if (category) params.set('category', category)
    if (minPrice) params.set('minPrice', minPrice)
    if (maxPrice) params.set('maxPrice', maxPrice)
    if (minYear) params.set('minYear', minYear)
    if (maxYear) params.set('maxYear', maxYear)
    if (maxMileage) params.set('maxMileage', maxMileage)
    if (sort && sort !== 'newest') params.set('sort', sort)

    counties.forEach((c) => params.append('county', c))
    municipalities.forEach((m) => params.append('mun', m))

    const qs = params.toString()
    if (!qs) return '/'
    return `/?${qs}`
  })()

  // State för Annons
  const [ad, setAd] = useState<Listing | null>(null)
  const [activeImageIndex, setActiveImageIndex] = useState(0)
  
  // State för Säljare (NYTT!)
  const [sellerProfile, setSellerProfile] = useState<SellerProfile | null>(null)
  
  // State för Applikation
  const [loading, setLoading] = useState(true)
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null)
  const [contacting, setContacting] = useState(false)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [showCopiedToast, setShowCopiedToast] = useState(false)
  const [shareMenuOpen, setShareMenuOpen] = useState(false)
  const shareMenuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const fetchData = async () => {
      if (!listingId) {
        setLoading(false)
        return
      }

      setFetchError(null)
      const result = await getListingById(listingId)

      if (!result.success) {
        console.error('Error fetching listing:', result.error)
        setFetchError(result.error ?? 'Kunde inte hämta annonsen.')
        setAd(null)
        setLoading(false)
        return
      }

      const adData = result.data
      if (adData) {
        setAd(adData)
        if (adData.images && adData.images.length > 0) {
          setActiveImageIndex(0)
        }

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

    fetchData()
  }, [listingId])

  useEffect(() => {
    let isMounted = true

    const initAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!isMounted) return
      const user = session?.user ? { id: session.user.id } : null
      setCurrentUser(user)
    }

    initAuth()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const user = session?.user ? { id: session.user.id } : null
      setCurrentUser(user)
    })

    return () => {
      isMounted = false
      subscription.unsubscribe()
    }
  }, [listingId])

  // View tracker – logs views from both logged-in and anonymous users.
  // sessionStorage prevents double-counting: same listing in same tab/session within 30 min = 1 view.
  useEffect(() => {
    if (!listingId || !ad) return

    const DEBOUNCE_MS = 30 * 60 * 1000
    const key = `listing_view_${listingId}`

    try {
      const last = sessionStorage.getItem(key)
      if (last) {
        const ts = Number(last)
        if (!Number.isNaN(ts) && Date.now() - ts < DEBOUNCE_MS) return
      }
    } catch {
      // sessionStorage not available (e.g. private mode)
    }

    const logView = async () => {
      const { ok } = await logListingViewAction(listingId, ad.user_id, currentUser?.id ?? null)
      if (ok) {
        try {
          sessionStorage.setItem(key, String(Date.now()))
        } catch {
          // ignore
        }
      }
    }

    logView()
  }, [listingId, ad?.id, currentUser?.id])

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
      const result = await createConversationAction(ad.id, ad.user_id)
      if (result.success) {
        router.push('/dashboard/messages')
      } else {
        alert(result.error ?? "Kunde inte starta chatten just nu.")
      }
    } catch (error) {
      console.error(error)
      alert("Kunde inte starta chatten just nu.")
    } finally {
      setContacting(false)
    }
  }

  const getShareUrl = () => (typeof window !== 'undefined' ? window.location.href : '')
  const getShareText = () => `${ad?.title ?? 'Annons'} – Kolla här!`

  const handleCopyLink = () => {
    copyToClipboard(getShareUrl())
    setShareMenuOpen(false)
  }

  const handleShareNative = async () => {
    const url = getShareUrl()
    const text = getShareText()
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({ title: text, url })
        setShareMenuOpen(false)
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          copyToClipboard(url)
          setShareMenuOpen(false)
        }
      }
    } else {
      copyToClipboard(url)
      setShareMenuOpen(false)
    }
  }

  const copyToClipboard = (text: string) => {
    if (typeof navigator?.clipboard?.writeText === 'function') {
      navigator.clipboard.writeText(text).then(() => {
        setShowCopiedToast(true)
      })
    }
  }

  useEffect(() => {
    if (!showCopiedToast) return
    const t = setTimeout(() => setShowCopiedToast(false), 2000)
    return () => clearTimeout(t)
  }, [showCopiedToast])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (shareMenuRef.current && !shareMenuRef.current.contains(e.target as Node)) {
        setShareMenuOpen(false)
      }
    }
    if (shareMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [shareMenuOpen])

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
    <div className="p-10 text-center bg-brand-beige min-h-screen flex flex-col items-center">
      {fetchError && (
        <div
          className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-red-600 text-white text-sm px-4 py-2 rounded-full shadow-lg flex items-center gap-2 max-w-[90vw]"
          role="alert"
          aria-live="polite"
        >
          <span>{fetchError}</span>
          <button
            type="button"
            onClick={() => setFetchError(null)}
            className="text-white/80 hover:text-white underline text-xs whitespace-nowrap"
          >
            Stäng
          </button>
        </div>
      )}
      <h2 className="text-xl font-display text-brand-green mb-4">{t.notFound.title}</h2>
      <Link href={backUrl} className="text-brand-green underline hover:text-brand-green/80">{t.notFound.link}</Link>
    </div>
  )

  const isSold = ad.status === 'sold' || !!ad.deleted_at
  const images = ad.images || []
  const activeImage = images[activeImageIndex] || null

  const goToPrevious = () => {
    if (images.length === 0) return
    setActiveImageIndex((prev) => (prev - 1 + images.length) % images.length)
  }

  const goToNext = () => {
    if (images.length === 0) return
    setActiveImageIndex((prev) => (prev + 1) % images.length)
  }

  const sellerDisplayLocation = sellerProfile
    ? sellerProfile.account_type === 'company'
      ? (sellerProfile.city || sellerProfile.address)?.trim() || null
      : sellerProfile.location
    : null

  return (
    <div className="min-h-screen bg-brand-beige flex flex-col">
      <div className="max-w-4xl mx-auto py-10 px-4 flex-grow">
        <Link href={backUrl} className="inline-block mb-6 text-sm font-medium text-brand-text/70 hover:text-brand-green transition">
          {t.backToHome}
        </Link>

        {isSold && (
          <div className="mb-6 rounded-xl bg-amber-500/90 text-white px-6 py-4 text-center shadow-lg border-2 border-amber-600" role="alert">
            <p className="text-xl md:text-2xl font-bold uppercase tracking-wide">Tyvärr, denna vara är såld</p>
            <p className="text-sm mt-1 opacity-95">Du kan fortfarande se innehållet men det går inte att kontakta säljaren.</p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          
          {/* --- BILDGALLERI (VÄNSTER) --- */}
          <div className="flex flex-col gap-4">
            <div className={`bg-white rounded-xl overflow-hidden shadow-md border border-gray-200 aspect-square relative ${isSold ? 'opacity-75' : ''}`}>
              {activeImage ? (
                <img src={activeImage} alt={ad.title} className="w-full h-full object-cover transition-all duration-300" />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-brand-beige text-brand-text/60">
                  {t.noImage}
                </div>
              )}
              {images.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={goToPrevious}
                    className="absolute left-3 top-1/2 -translate-y-1/2 bg-white/90 text-brand-text rounded-full p-2 shadow-md hover:bg-white"
                    aria-label="Föregående bild"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button
                    type="button"
                    onClick={goToNext}
                    className="absolute right-3 top-1/2 -translate-y-1/2 bg-white/90 text-brand-text rounded-full p-2 shadow-md hover:bg-white"
                    aria-label="Nästa bild"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </>
              )}
              <div className="absolute top-4 left-4 bg-brand-green/95 text-white backdrop-blur px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider shadow-lg">
                {getCategoryLabel(ad.category)}
              </div>
            </div>

            {images.length > 1 && (
              <div className={`flex gap-2 overflow-x-auto pb-2 ${isSold ? 'opacity-75' : ''}`}>
                {images.map((img: string, index: number) => (
                  <button 
                    key={index}
                    onClick={() => setActiveImageIndex(index)}
                    className={`relative w-20 h-20 rounded-xl overflow-hidden border-2 flex-shrink-0 transition ${
                      activeImageIndex === index ? 'border-brand-green ring-2 ring-brand-green/20' : 'border-transparent opacity-70 hover:opacity-100'
                    }`}
                  >
                    <Image
                      src={img}
                      alt={`Bild ${index + 1}`}
                      fill
                      className="object-cover"
                      sizes="80px"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* --- INFO (HÖGER) --- */}
          <div className="flex flex-col h-full">
            <div className="bg-white p-8 rounded-xl shadow-md border border-gray-200 flex-1 flex flex-col relative">
              <div className="flex items-center justify-between gap-4 mb-2">
                <div className="flex items-center text-brand-text/70 text-sm flex-wrap gap-x-2 min-w-0">
                  {(() => {
                    const loc = ad.location.includes(',') ? ad.location.split(',')[0].trim() : ad.location
                    const isCompany = sellerProfile?.account_type === 'company'
                    const locationText = loc ? (isCompany ? `Företag i ${loc}` : loc) : null
                    return locationText ? (
                      <>
                        <span>{locationText}</span>
                        <span>•</span>
                      </>
                    ) : null
                  })()}
                  <span>{new Date(ad.created_at).toLocaleDateString()}</span>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <div className="relative" ref={shareMenuRef}>
                    <button
                      type="button"
                      onClick={() => setShareMenuOpen((prev) => !prev)}
                      className="flex items-center justify-center gap-1 w-10 h-10 rounded-full border border-gray-200 hover:bg-brand-beige hover:border-brand-green/30 text-brand-text transition-colors"
                      aria-label="Dela annons"
                      aria-expanded={shareMenuOpen}
                      aria-haspopup="true"
                    >
                      <Share2 className="w-5 h-5" />
                    </button>
                    {shareMenuOpen && (
                      <div className="absolute right-0 top-full mt-2 py-1 bg-white rounded-xl shadow-lg border border-gray-200 min-w-[180px] z-50">
                        <button
                          type="button"
                          onClick={handleCopyLink}
                          className="w-full flex items-center gap-2 px-4 py-2.5 text-left text-sm text-brand-text hover:bg-brand-beige transition-colors"
                        >
                          <Link2 className="w-4 h-4 text-brand-green flex-shrink-0" />
                          Kopiera länk
                        </button>
                        {typeof navigator !== 'undefined' && 'share' in navigator && (
                          <button
                            type="button"
                            onClick={handleShareNative}
                            className="w-full flex items-center gap-2 px-4 py-2.5 text-left text-sm text-brand-text hover:bg-brand-beige transition-colors"
                          >
                            <Share2 className="w-4 h-4 text-brand-green flex-shrink-0" />
                            Dela via...
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                  {!(currentUser?.id && ad?.user_id === currentUser.id) && (
                    <FavoriteButton listingId={ad.id} />
                  )}
                </div>
              </div>
              <h1 className="text-3xl font-bold text-brand-green mb-6">{ad.title}</h1>

              <div className="text-4xl font-bold text-brand-green mb-8 text-right">
                {ad.bortskankes ? 'Bortskänkes' : formatCurrency(ad.price)}
              </div>

              <div className="prose prose-sm text-brand-text mb-8 flex-grow">
                <h3 className="text-brand-text font-semibold mb-2">{t.sections.description}</h3>
                <p className="whitespace-pre-line">{ad.description}</p>
              </div>

              {/* --- BIL-SPECIFIKA ATTRIBUT (endast för bilar) --- */}
              {ad.category === 'cars' && ad.attributes && (
                <div className="mb-8 pt-6 border-t border-gray-100">
                  <h3 className="text-brand-text font-semibold mb-4 antialiased">Bildetaljer</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {/* Modellår */}
                    {(() => {
                      const year = typeof ad.attributes.year === 'number' ? ad.attributes.year :
                                  typeof ad.attributes.year === 'string' ? parseInt(ad.attributes.year) : null;
                      return year ? (
                        <div className="flex items-center gap-2 bg-brand-beige/50 p-3 rounded-lg border border-gray-200">
                          <Calendar className="w-4 h-4 text-brand-green flex-shrink-0" />
                          <div>
                            <p className="text-xs text-brand-text/60 antialiased">Modellår</p>
                            <p className="text-sm font-semibold text-brand-text antialiased">{year}</p>
                          </div>
                        </div>
                      ) : null;
                    })()}

                    {/* Miltal */}
                    {(() => {
                      const mileage = typeof ad.attributes.mileage === 'number' ? ad.attributes.mileage :
                                     typeof ad.attributes.mileage === 'string' ? parseInt(ad.attributes.mileage) : null;
                      const formattedMileage = mileage ? new Intl.NumberFormat('sv-SE').format(mileage) + ' mil' : null;
                      return formattedMileage ? (
                        <div className="flex items-center gap-2 bg-brand-beige/50 p-3 rounded-lg border border-gray-200">
                          <Gauge className="w-4 h-4 text-brand-green flex-shrink-0" />
                          <div>
                            <p className="text-xs text-brand-text/60 antialiased">Miltal</p>
                            <p className="text-sm font-semibold text-brand-text antialiased">{formattedMileage}</p>
                          </div>
                        </div>
                      ) : null;
                    })()}

                    {/* Växellåda */}
                    {(() => {
                      const gearbox = typeof ad.attributes.gearbox === 'string' ? ad.attributes.gearbox : null;
                      return gearbox ? (
                        <div className="flex items-center gap-2 bg-brand-beige/50 p-3 rounded-lg border border-gray-200">
                          <Settings2 className="w-4 h-4 text-brand-green flex-shrink-0" />
                          <div>
                            <p className="text-xs text-brand-text/60 antialiased">Växellåda</p>
                            <p className="text-sm font-semibold text-brand-text antialiased">{gearbox}</p>
                          </div>
                        </div>
                      ) : null;
                    })()}

                    {/* Drivmedel */}
                    {(() => {
                      const fuel = typeof ad.attributes.fuel === 'string' ? ad.attributes.fuel : null;
                      return fuel ? (
                        <div className="flex items-center gap-2 bg-brand-beige/50 p-3 rounded-lg border border-gray-200">
                          <Fuel className="w-4 h-4 text-brand-green flex-shrink-0" />
                          <div>
                            <p className="text-xs text-brand-text/60 antialiased">Drivmedel</p>
                            <p className="text-sm font-semibold text-brand-text antialiased">{fuel}</p>
                          </div>
                        </div>
                      ) : null;
                    })()}

                    {/* Karosstyp */}
                    {(() => {
                      const bodyType = typeof ad.attributes.body_type === 'string' ? ad.attributes.body_type : null;
                      return bodyType ? (
                        <div className="flex items-center gap-2 bg-brand-beige/50 p-3 rounded-lg border border-gray-200">
                          <Car className="w-4 h-4 text-brand-green flex-shrink-0" />
                          <div>
                            <p className="text-xs text-brand-text/60 antialiased">Karosstyp</p>
                            <p className="text-sm font-semibold text-brand-text antialiased">{bodyType}</p>
                          </div>
                        </div>
                      ) : null;
                    })()}

                    {/* Färg */}
                    {(() => {
                      const color = typeof ad.attributes.color === 'string' ? ad.attributes.color : null;
                      const colorCustom = typeof ad.attributes.color_custom === 'string' ? ad.attributes.color_custom : null;
                      const displayColor = colorCustom || color;
                      return displayColor ? (
                        <div className="flex items-center gap-2 bg-brand-beige/50 p-3 rounded-lg border border-gray-200">
                          <Palette className="w-4 h-4 text-brand-green flex-shrink-0" />
                          <div>
                            <p className="text-xs text-brand-text/60 antialiased">Färg</p>
                            <p className="text-sm font-semibold text-brand-text antialiased">{displayColor}</p>
                          </div>
                        </div>
                      ) : null;
                    })()}

                    {/* Skick (endast för icke-fordon) */}
                    {(() => {
                      // Kontrollera om kategorin tillhör "Fordon"-gruppen
                      const vehiclesGroup = CATEGORY_GROUPS.find(group => group.id === 'vehicles')
                      const isVehicleCategory = vehiclesGroup?.children.some(child => child.id === ad.category) ?? false
                      // Visa endast skick om det INTE är en fordon-kategori
                      if (isVehicleCategory) return null
                      const condition = typeof ad.attributes.condition === 'string' ? ad.attributes.condition : null;
                      return condition ? (
                        <div className="flex items-center gap-2 bg-brand-beige/50 p-3 rounded-lg border border-gray-200">
                          <div className="w-4 h-4 flex-shrink-0 flex items-center justify-center">
                            <span className="text-brand-green text-xs">✓</span>
                          </div>
                          <div>
                            <p className="text-xs text-brand-text/60 antialiased">Skick</p>
                            <p className="text-sm font-semibold text-brand-text antialiased">{condition}</p>
                          </div>
                        </div>
                      ) : null;
                    })()}

                    {/* Hästkrafter */}
                    {(() => {
                      const horsePower = typeof ad.attributes.horse_power === 'number' ? ad.attributes.horse_power :
                                        typeof ad.attributes.horse_power === 'string' ? parseInt(ad.attributes.horse_power) : null;
                      return horsePower ? (
                        <div className="flex items-center gap-2 bg-brand-beige/50 p-3 rounded-lg border border-gray-200">
                          <Zap className="w-4 h-4 text-brand-green flex-shrink-0" />
                          <div>
                            <p className="text-xs text-brand-text/60 antialiased">Hästkrafter</p>
                            <p className="text-sm font-semibold text-brand-text antialiased">{horsePower} hk</p>
                          </div>
                        </div>
                      ) : null;
                    })()}

                    {/* Drivhjul */}
                    {(() => {
                      const driveWheel = typeof ad.attributes.drive_wheel === 'string' ? ad.attributes.drive_wheel : null;
                      return driveWheel ? (
                        <div className="flex items-center gap-2 bg-brand-beige/50 p-3 rounded-lg border border-gray-200">
                          <Car className="w-4 h-4 text-brand-green flex-shrink-0" />
                          <div>
                            <p className="text-xs text-brand-text/60 antialiased">Drivhjul</p>
                            <p className="text-sm font-semibold text-brand-text antialiased">{driveWheel}</p>
                          </div>
                        </div>
                      ) : null;
                    })()}

                    {/* Märke & Modell */}
                    {(() => {
                      const make = typeof ad.attributes.make === 'string' ? ad.attributes.make : null;
                      const model = typeof ad.attributes.model === 'string' ? ad.attributes.model : null;
                      return make && model ? (
                        <div className="flex items-center gap-2 bg-brand-beige/50 p-3 rounded-lg border border-gray-200 col-span-2 md:col-span-1">
                          <Car className="w-4 h-4 text-brand-green flex-shrink-0" />
                          <div>
                            <p className="text-xs text-brand-text/60 antialiased">Märke & Modell</p>
                            <p className="text-sm font-semibold text-brand-text antialiased">{make} {model}</p>
                          </div>
                        </div>
                      ) : null;
                    })()}
                  </div>
                </div>
              )}

              {/* --- SÄLJARKORT --- */}
              <div className="mt-auto">
                <div className="mb-4 pt-6 border-t border-gray-100">
                  <p className="text-xs font-bold text-brand-text/60 uppercase tracking-widest mb-3">Säljare</p>
                  
                  <Link
                    href={`/profil/${ad.user_id}`}
                    className="flex items-center gap-4 bg-brand-beige p-3 rounded-xl border border-gray-200 hover:border-brand-green/30 transition"
                  >
                    <div className="w-12 h-12 rounded-full bg-white border border-gray-200 overflow-hidden flex-shrink-0">
                      {sellerProfile?.avatar_url ? (
                        <img src={sellerProfile.avatar_url} alt="Säljare" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-300 text-xl">👤</div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-brand-text truncate flex items-center gap-1.5 flex-wrap">
                        <span className="truncate">{sellerProfile?.full_name || 'Anonym säljare'}</span>
                        {sellerProfile?.account_type === 'company' && (
                          <span className="inline-flex text-brand-green flex-shrink-0" title={sellerProfile?.is_company_verified ? 'Verifierat företag' : 'Företag'}>
                            <BadgeCheck className="w-5 h-5" aria-hidden />
                          </span>
                        )}
                      </h4>
                      {sellerDisplayLocation ? (
                        <p className="mt-0.5 text-xs text-brand-text/80 truncate">
                          {sellerProfile?.account_type === 'company' ? `Företag i ${sellerDisplayLocation}` : sellerDisplayLocation}
                        </p>
                      ) : sellerProfile ? (
                        <p className="text-xs text-brand-text/60 mt-0.5">
                          {sellerProfile.account_type === 'company' ? 'Företag på Kolla här!' : 'Medlem på Kolla här!'}
                        </p>
                      ) : null}
                    </div>
                  </Link>
                </div>

                {/* Kontaktknapp (döljs när annonsen är såld/borttagen) */}
                {!isSold ? (
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

      {showCopiedToast && (
        <div
          className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-brand-green text-white text-sm px-4 py-2 rounded-full shadow-lg"
          role="status"
          aria-live="polite"
        >
          Länk kopierad!
        </div>
      )}
    </div>
  )
}