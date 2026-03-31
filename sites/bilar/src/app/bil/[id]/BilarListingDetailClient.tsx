'use client'

import { useState, useEffect, useCallback } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import {
  Heart,
  Share2,
  Check,
  ChevronDown,
  ChevronUp,
  BadgeCheck,
  Phone,
  MessageSquare,
  Car,
} from 'lucide-react'
import BilarPublicHeader from '../../components/BilarPublicHeader'
import BilarListingCard from '../../components/BilarListingCard'
import BilarLeadModal from './BilarLeadModal'
import type { PublicListingDetail, PublicListing } from '../../../lib/features/bilar-public-service'

// ─── Types ────────────────────────────────────────────────────────────────────

interface BilarListingDetailClientProps {
  listing: PublicListingDetail
  relatedListings: PublicListing[]
  isFavorite: boolean
  isLoggedIn: boolean
  onToggleFavorite: (id: string) => Promise<{ success: boolean }>
  onCreateLead: (
    email: string,
    name: string,
    message: string,
    consent: boolean
  ) => Promise<{ success: boolean; error?: string }>
  onLogView: () => Promise<void>
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatPrice(price: number) {
  return price.toLocaleString('sv-SE') + ' kr'
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('sv-SE', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

function yearsSince(iso: string): number {
  return Math.max(1, new Date().getFullYear() - new Date(iso).getFullYear())
}

function annuityMonthly(principal: number, months: number): number {
  if (months <= 0) return 0
  return Math.round(principal / months)
}

function shortId(id: string): string {
  return id.replace(/-/g, '').slice(0, 5).toUpperCase()
}

// ─── Spec row ─────────────────────────────────────────────────────────────────

function SpecRow({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null
  return (
    <div className="flex items-center justify-between py-2.5" style={{ borderBottom: '0.5px solid #F1F5F9' }}>
      <span className="text-sm" style={{ color: '#64748B' }}>{label}</span>
      <span className="text-sm font-medium" style={{ color: '#0F172A' }}>{value}</span>
    </div>
  )
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function BilarListingDetailClient({
  listing,
  relatedListings,
  isFavorite: initialFavorite,
  isLoggedIn,
  onToggleFavorite,
  onCreateLead,
  onLogView,
}: BilarListingDetailClientProps) {
  const attrs = listing.attributes
  const org = listing.organization
  const images = listing.images.length > 0 ? listing.images : []

  // ── View-loggning med sessionStorage-dedup ────────────────────────────────
  const stableLogView = useCallback(onLogView, []) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const key = `listing_view_${listing.id}`
    const lastView = sessionStorage.getItem(key)
    const now = Date.now()
    if (!lastView || now - Number(lastView) > 30 * 60 * 1000) {
      sessionStorage.setItem(key, String(now))
      stableLogView()
    }
  }, [listing.id, stableLogView])

  // ── Bildgalleri state ─────────────────────────────────────────────────────
  const [activeImg, setActiveImg] = useState(0)

  // ── Favorites ─────────────────────────────────────────────────────────────
  const [favorite, setFavorite] = useState(initialFavorite)
  const [toggling, setToggling] = useState(false)

  const handleFavorite = async () => {
    if (!isLoggedIn) { handleLoginRequired(); return }
    setToggling(true)
    setFavorite((p) => !p)
    const result = await onToggleFavorite(listing.id)
    if (!result.success) setFavorite((p) => !p)
    setToggling(false)
  }

  // ── Share ─────────────────────────────────────────────────────────────────
  const handleShare = () => {
    if (navigator.share) {
      navigator.share({ title: listing.title, url: window.location.href })
    } else {
      navigator.clipboard.writeText(window.location.href)
    }
  }

  // ── Beskrivning toggle ────────────────────────────────────────────────────
  const [descExpanded, setDescExpanded] = useState(false)

  // ── Utrustning toggle ─────────────────────────────────────────────────────
  const equipment = attrs.equipment ?? []
  const [equipExpanded, setEquipExpanded] = useState(false)
  const visibleEquip = equipExpanded ? equipment : equipment.slice(0, 8)

  // ── Lead-modal ────────────────────────────────────────────────────────────
  const [showLeadModal, setShowLeadModal] = useState(false)

  // ── Finansieringsmodul state ──────────────────────────────────────────────
  const defaultDown = listing.price ? Math.round(listing.price * 0.1) : 0
  const [downPayment, setDownPayment] = useState(defaultDown)
  const [loanMonths, setLoanMonths] = useState(60)
  const principal = Math.max(0, (listing.price ?? 0) - downPayment)
  const monthly = annuityMonthly(principal, loanMonths)

  // ── Login toast ───────────────────────────────────────────────────────────
  const [loginToast, setLoginToast] = useState(false)
  const handleLoginRequired = () => {
    setLoginToast(true)
    setTimeout(() => setLoginToast(false), 3000)
  }

  const cardStyle = {
    background: '#FFFFFF',
    border: '0.5px solid #E2E8F0',
    borderRadius: '12px',
  }

  return (
    <div className="min-h-screen" style={{ background: '#F7F8FA' }}>
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

      {/* Lead-modal */}
      {showLeadModal && (
        <BilarLeadModal
          listingTitle={listing.title}
          onClose={() => setShowLeadModal(false)}
          onSubmit={onCreateLead}
        />
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {/* Brödsmula */}
        <nav className="flex items-center gap-2 text-xs mb-5" style={{ color: '#94A3B8' }}>
          <Link href="/" style={{ color: '#64748B' }} className="hover:underline">Startsida</Link>
          <span>/</span>
          {listing.make && (
            <>
              <Link href={`/?make=${listing.make}`} style={{ color: '#64748B' }} className="hover:underline">
                {listing.make}
              </Link>
              <span>/</span>
            </>
          )}
          <span style={{ color: '#0F172A' }}>{listing.title}</span>
        </nav>

        {/* Tvåkolumns-layout */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">

          {/* ── Vänster kolumn ──────────────────────────────────────────────── */}
          <div className="space-y-5">

            {/* 1. Bildgalleri */}
            <div style={cardStyle} className="overflow-hidden">
              {/* Huvudbild */}
              <div className="relative" style={{ height: '300px', background: '#F1F5F9' }}>
                {images.length > 0 ? (
                  <Image
                    src={images[activeImg]}
                    alt={listing.title}
                    fill
                    priority
                    sizes="(max-width: 1024px) 100vw, 65vw"
                    className="object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Car className="w-16 h-16" style={{ color: '#E2E8F0' }} />
                  </div>
                )}

                {/* Kommande-badge */}
                {attrs.is_upcoming && (
                  <span
                    className="absolute top-3 left-3 px-2.5 py-1 rounded-full text-xs font-semibold"
                    style={{ background: '#2563EB', color: '#FFFFFF' }}
                  >
                    Kommande
                  </span>
                )}

                {/* Favorit + dela */}
                <div className="absolute top-3 right-3 flex gap-2">
                  <button
                    type="button"
                    onClick={handleFavorite}
                    disabled={toggling}
                    aria-label={favorite ? 'Ta bort favorit' : 'Spara favorit'}
                    className="flex items-center justify-center w-9 h-9 rounded-full shadow transition hover:scale-110 disabled:opacity-60"
                    style={{ background: 'rgba(255,255,255,0.92)' }}
                  >
                    <Heart
                      className="w-4 h-4"
                      style={{ color: favorite ? '#EF4444' : '#64748B' }}
                      fill={favorite ? '#EF4444' : 'none'}
                    />
                  </button>
                  <button
                    type="button"
                    onClick={handleShare}
                    aria-label="Dela annons"
                    className="flex items-center justify-center w-9 h-9 rounded-full shadow transition hover:scale-110"
                    style={{ background: 'rgba(255,255,255,0.92)' }}
                  >
                    <Share2 className="w-4 h-4" style={{ color: '#64748B' }} />
                  </button>
                </div>
              </div>

              {/* Thumbnails */}
              {images.length > 1 && (
                <div className="flex gap-2 p-3 overflow-x-auto">
                  {images.slice(0, 5).map((url, i) => {
                    const isLast = i === 4 && images.length > 5
                    const isActive = activeImg === i
                    return (
                      <button
                        key={url}
                        type="button"
                        onClick={() => setActiveImg(i)}
                        className="relative shrink-0 rounded-lg overflow-hidden transition"
                        style={{
                          width: '80px',
                          height: '56px',
                          border: `2px solid ${isActive ? '#2563EB' : '#E2E8F0'}`,
                        }}
                        aria-label={`Bild ${i + 1}`}
                      >
                        <Image
                          src={url}
                          alt=""
                          fill
                          sizes="80px"
                          className="object-cover"
                        />
                        {isLast && (
                          <div
                            className="absolute inset-0 flex items-center justify-center text-sm font-semibold text-white"
                            style={{ background: 'rgba(15,23,42,0.6)' }}
                          >
                            +{images.length - 5}
                          </div>
                        )}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>

            {/* 2. Utrustningskort */}
            {equipment.length > 0 && (
              <div style={cardStyle} className="p-5">
                <h2 className="text-sm font-semibold mb-4" style={{ color: '#0F172A' }}>
                  Utrustning
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {visibleEquip.map((item) => (
                    <div key={item} className="flex items-center gap-2">
                      <Check className="w-3.5 h-3.5 shrink-0" style={{ color: '#16A34A' }} />
                      <span className="text-sm truncate" style={{ color: '#0F172A' }}>{item}</span>
                    </div>
                  ))}
                </div>
                {equipment.length > 8 && (
                  <button
                    type="button"
                    onClick={() => setEquipExpanded((v) => !v)}
                    className="mt-3 flex items-center gap-1 text-sm font-medium transition"
                    style={{ color: '#2563EB' }}
                  >
                    {equipExpanded ? (
                      <>
                        <ChevronUp className="w-4 h-4" /> Visa färre
                      </>
                    ) : (
                      <>
                        <ChevronDown className="w-4 h-4" />
                        Visa all utrustning ({equipment.length} poster)
                      </>
                    )}
                  </button>
                )}
              </div>
            )}

            {/* 3. Beskrivning */}
            {attrs.description && (
              <div style={cardStyle} className="p-5">
                <h2 className="text-sm font-semibold mb-3" style={{ color: '#0F172A' }}>
                  Beskrivning
                </h2>
                <p
                  className="text-sm leading-relaxed transition-all"
                  style={{
                    color: '#64748B',
                    display: '-webkit-box',
                    WebkitBoxOrient: 'vertical' as const,
                    WebkitLineClamp: descExpanded ? 'unset' : 3,
                    overflow: 'hidden',
                  }}
                >
                  {attrs.description}
                </p>
                <button
                  type="button"
                  onClick={() => setDescExpanded((v) => !v)}
                  className="mt-2 text-sm font-medium transition"
                  style={{ color: '#2563EB' }}
                >
                  {descExpanded ? 'Visa mindre' : 'Visa mer'}
                </button>
              </div>
            )}

            {/* 4. Handlarkort */}
            {org && (
              <div style={cardStyle} className="p-5">
                <h2 className="text-sm font-semibold mb-4" style={{ color: '#0F172A' }}>
                  Om handlaren
                </h2>

                <div className="flex items-start gap-4">
                  {/* Logo / initialer */}
                  <div
                    className="w-14 h-14 rounded-xl shrink-0 overflow-hidden flex items-center justify-center"
                    style={{ background: '#EFF6FF', border: '1px solid #BFDBFE' }}
                  >
                    {org.logo_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={org.logo_url} alt={org.name ?? ''} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-lg font-bold" style={{ color: '#2563EB' }}>
                        {org.name?.charAt(0).toUpperCase() ?? '?'}
                      </span>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="text-sm font-semibold truncate" style={{ color: '#0F172A' }}>
                        {org.name ?? 'Okänd handlare'}
                      </p>
                      {org.is_company_verified && (
                        <BadgeCheck className="w-4 h-4 shrink-0" style={{ color: '#2563EB' }} />
                      )}
                    </div>
                    {org.city && (
                      <p className="text-xs" style={{ color: '#94A3B8' }}>
                        {org.city}
                      </p>
                    )}
                  </div>
                </div>

                {/* Stats */}
                <div
                  className="grid grid-cols-3 gap-3 mt-4 pt-4"
                  style={{ borderTop: '0.5px solid #F1F5F9' }}
                >
                  <div className="text-center">
                    <p className="text-lg font-bold" style={{ color: '#0F172A' }}>4.8</p>
                    <p className="text-[11px]" style={{ color: '#94A3B8' }}>Betyg</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-bold" style={{ color: '#0F172A' }}>
                      {org.active_count}
                    </p>
                    <p className="text-[11px]" style={{ color: '#94A3B8' }}>Antal bilar</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-bold" style={{ color: '#0F172A' }}>
                      {yearsSince(org.created_at)} år
                    </p>
                    <p className="text-[11px]" style={{ color: '#94A3B8' }}>På KollaBilar</p>
                  </div>
                </div>

                {org.slug && (
                  <Link
                    href={`/handlare/${org.slug}`}
                    className="mt-4 flex items-center justify-center gap-1.5 w-full py-2.5 rounded-xl border text-sm font-medium transition hover:border-[#2563EB] hover:text-[#2563EB]"
                    style={{ borderColor: '#E2E8F0', color: '#64748B' }}
                  >
                    Visa alla annonser från handlaren
                  </Link>
                )}
              </div>
            )}

            {/* 4. Annonsinfo */}
            <div style={cardStyle} className="p-5">
              <h2 className="text-sm font-semibold mb-3" style={{ color: '#0F172A' }}>
                Annonsinfo
              </h2>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span style={{ color: '#64748B' }}>Annons-ID</span>
                  <span className="font-mono font-medium" style={{ color: '#0F172A' }}>
                    #KB-{shortId(listing.id)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span style={{ color: '#64748B' }}>Publicerad</span>
                  <span style={{ color: '#0F172A' }}>{formatDate(listing.created_at)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span style={{ color: '#64748B' }}>Visningar</span>
                  <span style={{ color: '#0F172A' }}>{listing.views_count.toLocaleString('sv-SE')}</span>
                </div>
                {org?.city && (
                  <div className="flex justify-between text-sm">
                    <span style={{ color: '#64748B' }}>Plats</span>
                    <span style={{ color: '#0F172A' }}>{org.city}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ── Höger kolumn ────────────────────────────────────────────────── */}
          <div className="space-y-5">

            {/* 1. Specifikationer */}
            <div style={cardStyle} className="p-5">
              <h2 className="text-sm font-semibold mb-1" style={{ color: '#0F172A' }}>
                {listing.make && listing.model
                  ? `${listing.make} ${listing.model}`
                  : listing.title}
              </h2>
              {listing.year && (
                <p className="text-xs mb-4" style={{ color: '#94A3B8' }}>
                  Årsmodell {listing.year}
                </p>
              )}
              <div>
                <SpecRow label="Märke" value={listing.make} />
                <SpecRow label="Modell" value={listing.model} />
                <SpecRow label="Årsmodell" value={listing.year ? String(listing.year) : null} />
                <SpecRow
                  label="Miltal"
                  value={attrs.mileage ? `${attrs.mileage.toLocaleString('sv-SE')} mil` : null}
                />
                <SpecRow label="Drivmedel" value={attrs.fuel_type ?? null} />
                <SpecRow label="Växellåda" value={attrs.gearbox ?? null} />
                <SpecRow label="Färg" value={attrs.color ?? null} />
                <SpecRow label="Karosseri" value={attrs.body_type ?? null} />
                <SpecRow label="Skick" value={attrs.condition ?? null} />
                <SpecRow label="Besiktning t.o.m." value={attrs.inspection_valid_until ?? null} />
              </div>
            </div>

            {/* 2. Pris + CTA */}
            <div style={cardStyle} className="p-5">
              {listing.price ? (
                <>
                  <p className="text-2xl font-bold mb-0.5" style={{ color: '#2563EB' }}>
                    {formatPrice(listing.price)}
                  </p>
                  <p className="text-xs mb-4" style={{ color: '#94A3B8' }}>
                    inkl. moms
                  </p>
                </>
              ) : (
                <p className="text-base font-medium mb-4" style={{ color: '#94A3B8' }}>
                  Pris på förfrågan
                </p>
              )}

              {/* CTA-knappar */}
              <div className="space-y-2.5">
                {listing.contact_via_chat && (
                  <button
                    type="button"
                    onClick={() => setShowLeadModal(true)}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold text-white transition hover:opacity-90"
                    style={{ background: '#2563EB' }}
                  >
                    <MessageSquare className="w-4 h-4" />
                    Skicka förfrågan
                  </button>
                )}

                {listing.show_phone && listing.contact_phone && (
                  <a
                    href={`tel:${listing.contact_phone}`}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border text-sm font-semibold transition hover:border-[#2563EB] hover:text-[#2563EB]"
                    style={{ borderColor: '#E2E8F0', color: '#0F172A' }}
                  >
                    <Phone className="w-4 h-4" />
                    Ring handlaren
                  </a>
                )}

                <button
                  type="button"
                  onClick={handleFavorite}
                  disabled={toggling}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border text-sm font-medium transition hover:border-[#2563EB] hover:text-[#2563EB] disabled:opacity-50"
                  style={{
                    borderColor: favorite ? '#2563EB' : '#E2E8F0',
                    color: favorite ? '#2563EB' : '#64748B',
                    background: favorite ? '#EFF6FF' : '#FFFFFF',
                  }}
                >
                  <Heart
                    className="w-4 h-4"
                    style={{ color: favorite ? '#2563EB' : '#94A3B8' }}
                    fill={favorite ? '#2563EB' : 'none'}
                  />
                  {favorite ? 'Sparad som favorit' : 'Spara som favorit'}
                </button>
              </div>
            </div>

            {/* 4. Finansieringsmodul */}
            {org?.show_financing && listing.price && (
              <div style={cardStyle} className="p-5">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-sm font-semibold" style={{ color: '#0F172A' }}>
                    Finansiering
                  </h2>
                  <span
                    className="px-2 py-0.5 rounded-full text-[11px] font-medium"
                    style={{ background: '#EFF6FF', color: '#2563EB' }}
                  >
                    Via {org.name ?? 'handlaren'}
                  </span>
                </div>

                <div className="space-y-4">
                  {/* Kontantinsats */}
                  <div>
                    <label className="block text-xs font-medium mb-1" style={{ color: '#64748B' }}>
                      Kontantinsats
                    </label>
                    <input
                      type="number"
                      value={downPayment}
                      min={0}
                      max={listing.price}
                      step={10000}
                      onChange={(e) => setDownPayment(Number(e.target.value))}
                      className="w-full px-3 py-2 border rounded-lg text-sm outline-none transition focus:border-[#2563EB]"
                      style={{ borderColor: '#E2E8F0', color: '#0F172A' }}
                    />
                    <p className="mt-0.5 text-[11px]" style={{ color: '#94A3B8' }}>
                      ({Math.round((downPayment / listing.price) * 100)}% av priset)
                    </p>
                  </div>

                  {/* Löptid */}
                  <div>
                    <label className="block text-xs font-medium mb-1" style={{ color: '#64748B' }}>
                      Löptid
                    </label>
                    <select
                      value={loanMonths}
                      onChange={(e) => setLoanMonths(Number(e.target.value))}
                      className="w-full px-3 py-2 border rounded-lg text-sm outline-none transition focus:border-[#2563EB] bg-white"
                      style={{ borderColor: '#E2E8F0', color: '#0F172A' }}
                    >
                      {[24, 36, 48, 60, 72, 84].map((m) => (
                        <option key={m} value={m}>{m} månader</option>
                      ))}
                    </select>
                  </div>

                  {/* Resultat */}
                  <div
                    className="flex items-center justify-between rounded-xl px-4 py-3"
                    style={{ background: '#EFF6FF' }}
                  >
                    <span className="text-sm" style={{ color: '#64748B' }}>
                      Beräknad månadskostnad
                    </span>
                    <span className="text-lg font-bold" style={{ color: '#2563EB' }}>
                      {monthly.toLocaleString('sv-SE')} kr
                    </span>
                  </div>
                  <p className="text-[11px]" style={{ color: '#94A3B8' }}>
                    * Beräknad med 0% ränta. Kontakta handlaren för exakt erbjudande.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Full bredd: relaterade annonser ──────────────────────────────── */}
        {relatedListings.length > 0 && (
          <section className="mt-10">
            <h2 className="text-base font-semibold mb-4" style={{ color: '#0F172A' }}>
              Fler bilar från {org?.name ?? 'handlaren'}
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {relatedListings.map((related) => (
                <BilarListingCard
                  key={related.id}
                  listing={related}
                  isFavorite={false}
                  isLoggedIn={isLoggedIn}
                  onToggleFavorite={async () => ({ success: false })}
                  onLoginRequired={handleLoginRequired}
                />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  )
}
