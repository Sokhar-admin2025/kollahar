'use client'

import { useState, useTransition, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Search, SlidersHorizontal, X, ChevronDown, Loader2 } from 'lucide-react'
import BilarListingCard from './BilarListingCard'
import BilarPublicHeader from './BilarPublicHeader'
import type { PublicListing, FeaturedMake } from '../../lib/features/bilar-public-service'

// ─── Constants ────────────────────────────────────────────────────────────────

const FUEL_TYPES = ['Bensin', 'Diesel', 'El', 'Hybrid', 'Laddhybrid', 'Gas']
const GEARBOX_TYPES = ['Manuell', 'Automat']
const MAX_PRICE = 2_000_000
const PRICE_STEP = 10_000
const MIN_PRICE_OPTIONS = [50000, 100000, 150000, 200000, 250000, 300000, 400000, 500000, 750000, 1000000]
const MAX_PRICE_OPTIONS = [50000, 100000, 150000, 200000, 250000, 300000, 400000, 500000, 750000, 1000000, 1500000, 2000000]

function formatPriceOption(v: number): string {
  return v.toLocaleString('sv-SE') + ' kr'
}
const CURRENT_YEAR = new Date().getFullYear()

const YEAR_OPTIONS = Array.from({ length: CURRENT_YEAR - 1959 }, (_, i) => CURRENT_YEAR - i)

// ─── Types ────────────────────────────────────────────────────────────────────

interface BilarHomeClientProps {
  initialListings: PublicListing[]
  initialTotal: number
  featuredMakes: FeaturedMake[]
  favoriteIds: string[]
  isLoggedIn: boolean
  initialFilters: {
    q: string
    make: string
    model: string
    minPrice: number
    maxPrice: number
    fuelType: string
    gearbox: string
    yearFrom: string
    yearTo: string
  }
  loadMoreAction: (page: number, filters: Record<string, string>) => Promise<PublicListing[]>
  toggleFavoriteAction: (listingId: string) => Promise<{ success: boolean }>
}

// ─── Inner component (needs useSearchParams) ──────────────────────────────────

function BilarHomeInner({
  initialListings,
  initialTotal,
  featuredMakes,
  favoriteIds: initialFavoriteIds,
  isLoggedIn,
  initialFilters,
  loadMoreAction,
  toggleFavoriteAction,
}: BilarHomeClientProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  // ── Filter state ───────────────────────────────────────────────────────────
  const [q, setQ] = useState(initialFilters.q)
  const [make, setMake] = useState(initialFilters.make)
  const [model, setModel] = useState(initialFilters.model)
  const [minPrice, setMinPrice] = useState(initialFilters.minPrice)
  const [maxPrice, setMaxPrice] = useState(initialFilters.maxPrice)
  const [fuelType, setFuelType] = useState(initialFilters.fuelType)
  const [gearbox, setGearbox] = useState(initialFilters.gearbox)
  const [yearFrom, setYearFrom] = useState(initialFilters.yearFrom)
  const [yearTo, setYearTo] = useState(initialFilters.yearTo)
  const [showFilters, setShowFilters] = useState(false)

  // ── Listings state ─────────────────────────────────────────────────────────
  const [listings, setListings] = useState(initialListings)
  const [total, setTotal] = useState(initialTotal)
  const [page, setPage] = useState(1)
  const [isPending, startTransition] = useTransition()
  const [isLoadingMore, startLoadMore] = useTransition()

  // ── Favorites state ────────────────────────────────────────────────────────
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(
    new Set(initialFavoriteIds)
  )
  const [loginToast, setLoginToast] = useState(false)

  // ── Search & filter ────────────────────────────────────────────────────────
  const buildParams = () => {
    const params = new URLSearchParams()
    if (q.trim()) params.set('q', q.trim())
    if (make) params.set('make', make)
    if (model) params.set('model', model)
    if (minPrice > 0) params.set('minPrice', String(minPrice))
    if (maxPrice < MAX_PRICE) params.set('maxPrice', String(maxPrice))
    if (fuelType) params.set('fuelType', fuelType)
    if (gearbox) params.set('gearbox', gearbox)
    if (yearFrom) params.set('yearFrom', yearFrom)
    if (yearTo) params.set('yearTo', yearTo)
    return params
  }

  const handleSearch = () => {
    const params = buildParams()
    router.push(`/?${params.toString()}`)
    setPage(1)
  }

  const handleHeroSearch = (e: React.FormEvent) => {
    e.preventDefault()
    handleSearch()
  }

  const clearFilters = () => {
    setQ('')
    setMake('')
    setModel('')
    setMinPrice(0)
    setMaxPrice(MAX_PRICE)
    setFuelType('')
    setGearbox('')
    setYearFrom('')
    setYearTo('')
    router.push('/')
    setPage(1)
  }

  const hasActiveFilters =
    q || make || model || minPrice > 0 || maxPrice < MAX_PRICE ||
    fuelType || gearbox || yearFrom || yearTo

  // ── Load more ──────────────────────────────────────────────────────────────
  const handleLoadMore = () => {
    const nextPage = page + 1
    const filters: Record<string, string> = {}
    if (q.trim()) filters.q = q.trim()
    if (make) filters.make = make
    if (model) filters.model = model
    if (minPrice > 0) filters.minPrice = String(minPrice)
    if (maxPrice < MAX_PRICE) filters.maxPrice = String(maxPrice)
    if (fuelType) filters.fuelType = fuelType
    if (gearbox) filters.gearbox = gearbox
    if (yearFrom) filters.yearFrom = yearFrom
    if (yearTo) filters.yearTo = yearTo

    startLoadMore(async () => {
      const more = await loadMoreAction(nextPage, filters)
      setListings((prev) => [...prev, ...more])
      setPage(nextPage)
    })
  }

  // ── Favorites ──────────────────────────────────────────────────────────────
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

  const hasMore = listings.length < total

  const selectClass =
    'w-full px-3 py-2 border rounded-lg text-sm outline-none transition focus:border-[#2563EB] focus:ring-1 focus:ring-[#BFDBFE] bg-white appearance-none'

  return (
    <div className="min-h-screen" style={{ background: '#F7F8FA' }}>
      {/* Header */}
      <BilarPublicHeader />

      {/* Login-toast */}
      {loginToast && (
        <div
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-xl shadow-lg text-sm font-medium text-white"
          style={{ background: '#0F172A' }}
        >
          Logga in för att spara favoriter
        </div>
      )}

      {/* Hero */}
      <section className="py-12 px-4" style={{ background: '#FFFFFF', borderBottom: '0.5px solid #E2E8F0' }}>
        <div className="max-w-3xl mx-auto text-center">
          <h1 className="text-3xl sm:text-4xl font-bold mb-2" style={{ color: '#0F172A' }}>
            Hitta din nästa bil
          </h1>
          <form onSubmit={handleHeroSearch} className="flex gap-2 max-w-xl mx-auto">
            <div className="relative flex-1">
              <Search
                className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5"
                style={{ color: '#94A3B8' }}
              />
              <input
                type="text"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Sök märke, modell..."
                className="w-full pl-12 pr-4 py-3 rounded-xl border text-sm outline-none transition focus:border-[#2563EB] focus:ring-2 focus:ring-[#BFDBFE]"
                style={{ borderColor: '#E2E8F0', color: '#0F172A' }}
              />
            </div>
            <button
              type="submit"
              className="px-6 py-3 rounded-xl text-sm font-semibold text-white transition hover:opacity-90"
              style={{ background: '#2563EB' }}
            >
              Sök
            </button>
          </form>
        </div>
      </section>

      {/* Filterfält */}
      <section
        className="border-b px-4 py-4"
        style={{ background: '#FFFFFF', borderColor: '#E2E8F0' }}
      >
        <div className="max-w-7xl mx-auto">
          {/* Rad 1: snabbfilter */}
          <div className="flex flex-wrap items-end gap-3">
            {/* Märke */}
            <div className="min-w-[140px]">
              <label className="block text-xs font-medium mb-1" style={{ color: '#64748B' }}>
                Märke
              </label>
              <div className="relative">
                <select
                  value={make}
                  onChange={(e) => {
                    setMake(e.target.value)
                    if (!e.target.value) setModel('')
                  }}
                  className={selectClass}
                  style={{ borderColor: '#E2E8F0', color: make ? '#0F172A' : '#94A3B8' }}
                >
                  <option value="">Alla märken</option>
                  {featuredMakes.map(({ make: m }) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: '#94A3B8' }} />
              </div>
            </div>

            {/* Modell */}
            <div className="min-w-[140px]">
              <label className="block text-xs font-medium mb-1" style={{ color: '#64748B' }}>
                Modell
              </label>
              <input
                type="text"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                disabled={!make}
                placeholder={make ? 'T.ex. XC60' : 'Välj märke först'}
                className="w-full px-3 py-2 border rounded-lg text-sm outline-none transition focus:border-[#2563EB] focus:ring-1 focus:ring-[#BFDBFE] disabled:bg-[#F8FAFC] disabled:text-[#94A3B8]"
                style={{ borderColor: '#E2E8F0', color: '#0F172A' }}
              />
            </div>

            {/* Drivmedel */}
            <div className="min-w-[130px]">
              <label className="block text-xs font-medium mb-1" style={{ color: '#64748B' }}>
                Drivmedel
              </label>
              <div className="relative">
                <select
                  value={fuelType}
                  onChange={(e) => setFuelType(e.target.value)}
                  className={selectClass}
                  style={{ borderColor: '#E2E8F0', color: fuelType ? '#0F172A' : '#94A3B8' }}
                >
                  <option value="">Alla</option>
                  {FUEL_TYPES.map((f) => (
                    <option key={f} value={f}>{f}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: '#94A3B8' }} />
              </div>
            </div>

            {/* Växellåda */}
            <div className="min-w-[120px]">
              <label className="block text-xs font-medium mb-1" style={{ color: '#64748B' }}>
                Växellåda
              </label>
              <div className="relative">
                <select
                  value={gearbox}
                  onChange={(e) => setGearbox(e.target.value)}
                  className={selectClass}
                  style={{ borderColor: '#E2E8F0', color: gearbox ? '#0F172A' : '#94A3B8' }}
                >
                  <option value="">Alla</option>
                  {GEARBOX_TYPES.map((g) => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: '#94A3B8' }} />
              </div>
            </div>

            {/* Fler filter-toggle */}
            <button
              type="button"
              onClick={() => setShowFilters((v) => !v)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border transition"
              style={{
                borderColor: showFilters ? '#2563EB' : '#E2E8F0',
                color: showFilters ? '#2563EB' : '#64748B',
                background: showFilters ? '#EFF6FF' : '#FFFFFF',
              }}
            >
              <SlidersHorizontal className="w-4 h-4" />
              Mer filter
            </button>

            {/* Sök-knapp */}
            <button
              type="button"
              onClick={handleSearch}
              className="px-5 py-2 rounded-lg text-sm font-semibold text-white transition hover:opacity-90"
              style={{ background: '#2563EB' }}
            >
              Sök bilar
            </button>

            {/* Rensa filter */}
            {hasActiveFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="flex items-center gap-1 text-sm transition"
                style={{ color: '#64748B' }}
              >
                <X className="w-3.5 h-3.5" />
                Rensa
              </button>
            )}
          </div>

          {/* Rad 2: utfällbara filter */}
          {showFilters && (
            <div className="mt-4 pt-4 grid grid-cols-1 sm:grid-cols-3 gap-6" style={{ borderTop: '0.5px solid #F1F5F9' }}>
              {/* Prisintervall */}
              <div>
                <label className="block text-xs font-medium mb-2" style={{ color: '#64748B' }}>
                  Pris (SEK)
                </label>
                <div className="grid grid-cols-2 gap-2">

                  {/* Min */}
                  <div className="flex flex-col gap-1.5">
                    <div className="relative">
                      <select
                        value={MIN_PRICE_OPTIONS.includes(minPrice) ? String(minPrice) : ''}
                        onChange={(e) => setMinPrice(Number(e.target.value) || 0)}
                        className={selectClass}
                        style={{ borderColor: '#E2E8F0', color: minPrice > 0 ? '#0F172A' : '#94A3B8' }}
                      >
                        <option value="">Minpris</option>
                        {MIN_PRICE_OPTIONS.map((v) => (
                          <option key={v} value={String(v)}>{formatPriceOption(v)}</option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: '#94A3B8' }} />
                    </div>
                    <input
                      type="number"
                      value={minPrice > 0 ? minPrice : ''}
                      onChange={(e) => setMinPrice(Number(e.target.value) || 0)}
                      placeholder="eller ange belopp"
                      min={0}
                      step={PRICE_STEP}
                      className="w-full px-3 py-2 border rounded-lg text-sm outline-none transition focus:border-[#2563EB] focus:ring-1 focus:ring-[#BFDBFE]"
                      style={{ borderColor: '#E2E8F0', color: '#0F172A' }}
                    />
                  </div>

                  {/* Max */}
                  <div className="flex flex-col gap-1.5">
                    <div className="relative">
                      <select
                        value={maxPrice < MAX_PRICE && MAX_PRICE_OPTIONS.includes(maxPrice) ? String(maxPrice) : ''}
                        onChange={(e) => setMaxPrice(Number(e.target.value) || MAX_PRICE)}
                        className={selectClass}
                        style={{ borderColor: '#E2E8F0', color: maxPrice < MAX_PRICE ? '#0F172A' : '#94A3B8' }}
                      >
                        <option value="">Maxpris</option>
                        {MAX_PRICE_OPTIONS.map((v) => (
                          <option key={v} value={String(v)}>
                            {v === MAX_PRICE ? '2 000 000+ kr' : formatPriceOption(v)}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: '#94A3B8' }} />
                    </div>
                    <input
                      type="number"
                      value={maxPrice < MAX_PRICE ? maxPrice : ''}
                      onChange={(e) => setMaxPrice(Number(e.target.value) || MAX_PRICE)}
                      placeholder="eller ange belopp"
                      min={0}
                      step={PRICE_STEP}
                      className="w-full px-3 py-2 border rounded-lg text-sm outline-none transition focus:border-[#2563EB] focus:ring-1 focus:ring-[#BFDBFE]"
                      style={{ borderColor: '#E2E8F0', color: '#0F172A' }}
                    />
                  </div>

                </div>
              </div>

              {/* Årsmodell från */}
              <div>
                <label className="block text-xs font-medium mb-2" style={{ color: '#64748B' }}>
                  Årsmodell
                </label>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <select
                      value={yearFrom}
                      onChange={(e) => setYearFrom(e.target.value)}
                      className={selectClass}
                      style={{ borderColor: '#E2E8F0', color: yearFrom ? '#0F172A' : '#94A3B8' }}
                    >
                      <option value="">Från</option>
                      {YEAR_OPTIONS.map((y) => (
                        <option key={y} value={String(y)}>{y}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: '#94A3B8' }} />
                  </div>
                  <span className="text-xs" style={{ color: '#94A3B8' }}>–</span>
                  <div className="relative flex-1">
                    <select
                      value={yearTo}
                      onChange={(e) => setYearTo(e.target.value)}
                      className={selectClass}
                      style={{ borderColor: '#E2E8F0', color: yearTo ? '#0F172A' : '#94A3B8' }}
                    >
                      <option value="">Till</option>
                      {YEAR_OPTIONS.map((y) => (
                        <option key={y} value={String(y)}>{y}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: '#94A3B8' }} />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Resultat */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {/* Träffräknare */}
        <div className="flex items-center justify-between mb-5">
          <p className="text-sm" style={{ color: '#64748B' }}>
            {total === 0
              ? 'Inga annonser hittades'
              : `${total.toLocaleString('sv-SE')} ${total === 1 ? 'annons' : 'annonser'}`}
          </p>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="text-sm transition hover:opacity-70"
              style={{ color: '#2563EB' }}
            >
              Rensa alla filter
            </button>
          )}
        </div>

        {/* Tom state */}
        {listings.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center mb-4"
              style={{ background: '#F1F5F9' }}
            >
              <Search className="w-7 h-7" style={{ color: '#CBD5E1' }} />
            </div>
            <p className="text-base font-medium mb-1" style={{ color: '#0F172A' }}>
              Inga annonser just nu
            </p>
            <p className="text-sm" style={{ color: '#94A3B8' }}>
              {hasActiveFilters
                ? 'Prova att ändra eller rensa dina filter.'
                : 'Kom tillbaka snart — nya bilar läggs till löpande.'}
            </p>
          </div>
        )}

        {/* Annons-grid — 5 kolumner desktop, 2 mobil */}
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
        className="mt-16 py-8 text-center text-xs border-t"
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

// ─── Exported wrapper (Suspense for useSearchParams) ──────────────────────────

export default function BilarHomeClient(props: BilarHomeClientProps) {
  return (
    <Suspense fallback={null}>
      <BilarHomeInner {...props} />
    </Suspense>
  )
}
