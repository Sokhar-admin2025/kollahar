'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Heart } from 'lucide-react'
import type { PublicListing } from '../../lib/features/bilar-public-service'

interface BilarListingCardProps {
  listing: PublicListing
  isFavorite: boolean
  isLoggedIn: boolean
  onToggleFavorite: (listingId: string) => Promise<{ success: boolean }>
  onLoginRequired: () => void
}

function formatPrice(price: number): string {
  return price.toLocaleString('sv-SE') + ' kr'
}

function formatMileage(mileage: number): string {
  // mileage lagras i mil i databasen
  return mileage.toLocaleString('sv-SE') + ' mil'
}

export default function BilarListingCard({
  listing,
  isFavorite: initialFavorite,
  isLoggedIn,
  onToggleFavorite,
  onLoginRequired,
}: BilarListingCardProps) {
  const [favorite, setFavorite] = useState(initialFavorite)
  const [toggling, setToggling] = useState(false)

  const handleFavoriteClick = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    if (!isLoggedIn) {
      onLoginRequired()
      return
    }

    setToggling(true)
    setFavorite((prev) => !prev) // optimistic

    const result = await onToggleFavorite(listing.id)
    if (!result.success) {
      setFavorite((prev) => !prev) // rollback
    }
    setToggling(false)
  }

  const attrs = listing.attributes
  const specs = [
    listing.year ? String(listing.year) : null,
    attrs.fuel_type ?? null,
    attrs.mileage ? formatMileage(attrs.mileage) : null,
    attrs.gearbox ?? null,
  ].filter(Boolean) as string[]

  return (
    <Link
      href={`/bil/${listing.id}`}
      className="group block rounded-xl overflow-hidden transition-shadow hover:shadow-md"
      style={{ background: '#FFFFFF', border: '0.5px solid #E2E8F0' }}
    >
      {/* Bild */}
      <div className="relative overflow-hidden" style={{ height: '160px', background: '#F8FAFC' }}>
        {listing.thumbnail ? (
          <Image
            src={listing.thumbnail}
            alt={listing.title}
            fill
            sizes="(max-width: 640px) 50vw, 20vw"
            className="object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <svg
              className="w-12 h-12"
              style={{ color: '#E2E8F0' }}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1}
                d="M3 9l2-4h14l2 4M3 9h18M3 9v8a1 1 0 001 1h1m14-9v8a1 1 0 01-1 1h-1M7 17h10M5 9V7m14 2V7"
              />
            </svg>
          </div>
        )}

        {/* "Kommande"-badge */}
        {attrs.is_upcoming && (
          <span
            className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-[11px] font-semibold"
            style={{ background: '#2563EB', color: '#FFFFFF' }}
          >
            Kommande
          </span>
        )}

        {/* Favorit-hjärta */}
        <button
          type="button"
          onClick={handleFavoriteClick}
          disabled={toggling}
          aria-label={favorite ? 'Ta bort favorit' : 'Spara som favorit'}
          className="absolute top-2 right-2 flex items-center justify-center w-7 h-7 rounded-full transition-transform hover:scale-110 disabled:opacity-60"
          style={{ background: 'rgba(255,255,255,0.9)' }}
        >
          <Heart
            className="w-4 h-4"
            style={{ color: favorite ? '#EF4444' : '#94A3B8' }}
            fill={favorite ? '#EF4444' : 'none'}
          />
        </button>
      </div>

      {/* Kortinnehåll */}
      <div className="p-3">
        {/* Märke */}
        {listing.make && (
          <p className="text-[11px] font-medium uppercase tracking-wide mb-0.5" style={{ color: '#94A3B8' }}>
            {listing.make}
          </p>
        )}

        {/* Modell / Titel */}
        <p className="text-sm font-semibold leading-tight mb-2 truncate" style={{ color: '#0F172A' }}>
          {listing.model || listing.title}
        </p>

        {/* Spec-chips */}
        {specs.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2">
            {specs.map((spec) => (
              <span
                key={spec}
                className="px-1.5 py-0.5 rounded text-[11px]"
                style={{ background: '#F1F5F9', color: '#64748B' }}
              >
                {spec}
              </span>
            ))}
          </div>
        )}

        {/* Pris */}
        <p className="text-base font-bold" style={{ color: '#2563EB' }}>
          {listing.price ? formatPrice(listing.price) : 'Pris ej angivet'}
        </p>
        {listing.price && (
          <p className="text-[11px]" style={{ color: '#94A3B8' }}>
            inkl. moms
          </p>
        )}

        {/* Handlare + kommun */}
        {listing.organization?.name && (
          <div className="mt-2 pt-2" style={{ borderTop: '0.5px solid #F1F5F9' }}>
            <p className="text-[10px] font-medium uppercase tracking-wide mb-0.5" style={{ color: '#94A3B8' }}>
              Handlare
            </p>
            {listing.organization.slug ? (
              <Link
                href={`/handlare/${listing.organization.slug}`}
                onClick={(e) => e.stopPropagation()}
                className="text-[11px] truncate block transition hover:underline"
                style={{ color: '#64748B' }}
              >
                {listing.organization.name}
                {listing.organization.city ? ` · ${listing.organization.city}` : ''}
              </Link>
            ) : (
              <p className="text-[11px] truncate" style={{ color: '#64748B' }}>
                {listing.organization.name}
                {listing.organization.city ? ` · ${listing.organization.city}` : ''}
              </p>
            )}
          </div>
        )}
      </div>
    </Link>
  )
}
