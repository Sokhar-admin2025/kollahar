'use client'

import { useState, useTransition, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { BadgeCheck, ChevronDown, Loader2 } from 'lucide-react'
import BilarPublicHeader from '../../components/BilarPublicHeader'
import BilarListingCard from '../../components/BilarListingCard'
import BilarDualRangeSlider from '../../components/BilarDualRangeSlider'
import type { DealerProfile, PublicListing } from '../../../lib/features/bilar-public-service'

// ─── Types ────────────────────────────────────────────────────────────────────

interface BilarDealerProfileClientProps {
  dealer: DealerProfile
  initialListings: PublicListing[]
  initialTotal: number
  availableMakes: string[]
  isLoggedIn: boolean
  initialFilters: {
    make: string
    minPrice: number
    maxPrice: number
  }
  loadMoreAction: (page: number, filters: Record<string, string>) => Promise<PublicListing[]>
  toggleFavoriteAction: (listingId: string) => Promise<{ success: boolean }>
}

// ─── Constants ────────────────────────────────────────────────────────────────

const MAX_PRICE = 2_000_000
const PRICE_STEP = 10_000

// ─── Helpers ─────────────────────────────────────────────────────────────────

function yearsSince(iso: string): number {
  return Math.max(1, new Date().getFullYear() - new Date(iso).getFullYear())
}

// ─── Inner component ──────────────────────────────────────────────────────────

function DealerProfileInner({
  dealer,
  initialListings,
  initialTotal,
  availableMakes,
  isLoggedIn,
  initialFilters,
  loadMoreAction,
  toggleFavoriteAction,
}: BilarDealerProfileClientProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  // ── Filter state ───────────────────────────────────────────────────────────
  const [make, setMake] = useState(initialFilters.make)
  const [minPrice, setMinPrice] = useState(initialFilters.minPrice)
  const [maxPrice, setMaxPrice] = useState(initialFilters.maxPrice)

  // ── Listings state ─────────────────────────────────────────────────────────
  const [listings, setListings] = useState(initialListings)
  const [total, setTotal] = useState(initialTotal)
  const [page, setPage] = useState(1)
  const [, startTransition] = useTransition()
  const [isLoadingMore, startLoadMore] = useTransition()

  // ── Favorites + toast ──────────────────────────────────────────────────────
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set())
  const [loginToast, setLoginToast] = useState(false)

  const handleToggleFavorite = async (listingId: string) => {
    const result = await toggleFavoriteAction(listingId)
    if (result.success) {
      setFavoriteIds((prev) => {
        const next = new Set(prev)
        if (next.has(listingId)) next.delete(listingId)
        else next.add(listingId)
        return next
      })
    }
    return result
  }

  const handleLoginRequired = () => {
    setLoginToast(true)
    setTimeout(() => setLoginToast(false), 3000)
  }

  // ── Sök / filter ──────────────────────────────────────────────────────────
  const buildParams = () => {
    const params = new URLSearchParams(searchParams.toString())
    if (make) params.set('make', make)
    else params.delete('make')
    if (minPrice > 0) params.set('minPrice', String(minPrice))
    else params.delete('minPrice')
    if (maxPrice < MAX_PRICE) params.set('maxPrice', String(maxPrice))
    else params.delete('maxPrice')
    params.delete('page')
    return params
  }

  const handleSearch = () => {
    router.push(`?${buildParams().toString()}`)
    setPage(1)
    startTransition(() => {})
  }

  const handleClear = () => {
    setMake('')
    setMinPrice(0)
    setMaxPrice(MAX_PRICE)
    router.push('?')
    setPage(1)
  }

  const hasActiveFilters = make || minPrice > 0 || maxPrice < MAX_PRICE

  // ── Ladda mer ─────────────────────────────────────────────────────────────
  const handleLoadMore = () => {
    const nextPage = page + 1
    const filters: Record<string, string> = {}
    if (make) filters.make = make
    if (minPrice > 0) filters.minPrice = String(minPrice)
    if (maxPrice < MAX_PRICE) filters.maxPrice = String(maxPrice)

    startLoadMore(async () => {
      const more = await loadMoreAction(nextPage, filters)
      setListings((prev) => [...prev, ...more])
      setTotal((t) => t)
      setPage(nextPage)
    })
  }

  const hasMore = listings.length < total

  return (
    <div className="min-h-screen" style={{ background: '#F7F8FA' }}>
      <BilarPublicHeader isLoggedIn={isLoggedIn} />

      {/* Login-toast */}
      {loginToast && (
        <div
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-xl shadow-lg text-sm font-medium text-white"
          style={{ background: '#0F172A' }}
        >
          Logga in för att spara favoriter
        </div>
      )}

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section
        className="border-b"
        style={{ background: '#FFFFFF', borderColor: '#E2E8F0' }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
            {/* Logo / initialer */}
            <div
              className="w-20 h-20 rounded-2xl shrink-0 overflow-hidden flex items-center justify-center"
              style={{ background: '#EFF6FF', border: '1.5px solid #BFDBFE' }}
            >
              {dealer.logo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={dealer.logo_url}
                  alt={dealer.name ?? ''}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-2xl font-bold" style={{ color: '#2563EB' }}>
                  {dealer.name?.charAt(0).toUpperCase() ?? '?'}
                </span>
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h1 className="text-xl font-bold truncate" style={{ color: '#0F172A' }}>
                  {dealer.name ?? 'Okänd handlare'}
                </h1>
                {dealer.is_company_verified && (
                  <BadgeCheck className="w-5 h-5 shrink-0" style={{ color: '#2563EB' }} />
                )}
              </div>
              <p className="text-sm mb-3" style={{ color: '#64748B' }}>
                {[dealer.city, dealer.address].filter(Boolean).join(' · ')}
                {dealer.city || dealer.address ? ' · ' : ''}
                Medlem sedan {yearsSince(dealer.created_at)} år
              </p>

              {/* Stats */}
              <div className="flex flex-wrap gap-6">
                <div>
                  <p className="text-xl font-bold" style={{ color: '#0F172A' }}>
                    {dealer.active_count}
                  </p>
                  <p className="text-xs" style={{ color: '#94A3B8' }}>Aktiva annonser</p>
                </div>
                <div>
                  <p className="text-xl font-bold" style={{ color: '#0F172A' }}>
                    {dealer.sold_count}
                  </p>
                  <p className="text-xs" style={{ color: '#94A3B8' }}>Sålda bilar</p>
                </div>
                <div>
                  <p className="text-xl font-bold" style={{ color: '#0F172A' }}>4.8</p>
                  <p className="text-xs" style={{ color: '#94A3B8' }}>Betyg</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Filterfält ───────────────────────────────────────────────────── */}
      <section
        className="border-b px-4 py-4"
        style={{ background: '#FFFFFF', borderColor: '#E2E8F0' }}
      >
        <div className="max-w-7xl mx-auto flex flex-wrap items-end gap-4">
          {/* Märke */}
          {availableMakes.length > 0 && (
            <div className="min-w-[140px]">
              <label className="block text-xs font-medium mb-1" style={{ color: '#64748B' }}>
                Märke
              </label>
              <div className="relative">
                <select
                  value={make}
                  onChange={(e) => setMake(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-sm outline-none transition focus:border-[#2563EB] bg-white appearance-none"
                  style={{ borderColor: '#E2E8F0', color: make ? '#0F172A' : '#94A3B8' }}
                >
                  <option value="">Alla märken</option>
                  {availableMakes.map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
                <ChevronDown
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
                  style={{ color: '#94A3B8' }}
                />
              </div>
            </div>
          )}

          {/* Prisintervall */}
          <div className="min-w-[240px]">
            <BilarDualRangeSlider
              label="Pris (SEK)"
              min={0}
              max={MAX_PRICE}
              minValue={minPrice}
              maxValue={maxPrice}
              onMinChange={setMinPrice}
              onMaxChange={setMaxPrice}
              step={PRICE_STEP}
              unit=" kr"
            />
          </div>

          {/* Knappar */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSearch}
              className="px-5 py-2 rounded-lg text-sm font-semibold text-white transition hover:opacity-90"
              style={{ background: '#2563EB' }}
            >
              Filtrera
            </button>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleClear}
                className="text-sm transition"
                style={{ color: '#64748B' }}
              >
                Rensa
              </button>
            )}
          </div>
        </div>
      </section>

      {/* ── Annons-grid ──────────────────────────────────────────────────── */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <p className="text-sm mb-5" style={{ color: '#64748B' }}>
          {total === 0
            ? 'Inga aktiva annonser just nu'
            : `${total.toLocaleString('sv-SE')} ${total === 1 ? 'annons' : 'annonser'}`}
        </p>

        {/* Tom state */}
        {listings.length === 0 && (
          <div
            className="flex flex-col items-center justify-center py-20 rounded-xl text-center"
            style={{ background: '#FFFFFF', border: '0.5px solid #E2E8F0' }}
          >
            <p className="text-base font-medium mb-1" style={{ color: '#0F172A' }}>
              Inga aktiva annonser just nu
            </p>
            <p className="text-sm" style={{ color: '#94A3B8' }}>
              {hasActiveFilters
                ? 'Prova att ändra dina filter.'
                : 'Kom tillbaka snart.'}
            </p>
          </div>
        )}

        {/* Grid */}
        {listings.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {listings.map((listing) => (
              <BilarListingCard
                key={listing.id}
                listing={listing}
                isFavorite={favoriteIds.has(listing.id)}
                isLoggedIn={isLoggedIn}
                onToggleFavorite={handleToggleFavorite}
                onLoginRequired={handleLoginRequired}
              />
            ))}
          </div>
        )}

        {/* Ladda mer */}
        {hasMore && (
          <div className="flex justify-center mt-10">
            <button
              type="button"
              onClick={handleLoadMore}
              disabled={isLoadingMore}
              className="flex items-center gap-2 px-8 py-3 rounded-xl border text-sm font-medium transition hover:border-[#2563EB] hover:text-[#2563EB] disabled:opacity-50"
              style={{ borderColor: '#E2E8F0', color: '#64748B' }}
            >
              {isLoadingMore ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Laddar...
                </>
              ) : (
                `Ladda fler (${total - listings.length} kvar)`
              )}
            </button>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer
        className="mt-8 py-8 text-center text-xs border-t"
        style={{ borderColor: '#F1F5F9', color: '#94A3B8' }}
      >
        <p>
          KollaBilar &bull; bilar.kollahar.se &bull;{' '}
          <a href="https://www.kollahar.se" style={{ color: '#94A3B8' }}>
            Kolla här!
          </a>
        </p>
      </footer>
    </div>
  )
}

// ─── Export med Suspense ──────────────────────────────────────────────────────

export default function BilarDealerProfileClient(props: BilarDealerProfileClientProps) {
  return (
    <Suspense fallback={null}>
      <DealerProfileInner {...props} />
    </Suspense>
  )
}
