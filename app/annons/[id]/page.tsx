import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { getListingById } from '@/lib/features/listings/listing-service'
import type { Listing } from '@/app/types'
import ListingDetailsClient from './ListingDetailsClient'

const PLATFORM_NAME = 'Kolla här!'

function toSnippet(text: string, max = 160): string {
  const clean = text.replace(/\s+/g, ' ').trim()
  if (clean.length <= max) return clean
  return `${clean.slice(0, max - 1)}…`
}

function formatListingPrice(listing: Pick<Listing, 'price' | 'bortskankes'>): string {
  if (listing.bortskankes) return 'Bortskänkes'
  return new Intl.NumberFormat('sv-SE', {
    style: 'currency',
    currency: 'SEK',
    maximumFractionDigits: 0,
  }).format(listing.price)
}

function getSeoTitle(listing: Listing): string {
  const attrs = (listing.attributes ?? {}) as Record<string, unknown>
  const make = (typeof listing.make === 'string' ? listing.make : typeof attrs.make === 'string' ? attrs.make : '').trim()
  const model = (typeof listing.model === 'string' ? listing.model : typeof attrs.model === 'string' ? attrs.model : '').trim()
  const head = [make, model].filter(Boolean).join(' ')
  const namePart = head || listing.title
  return `${namePart} - ${formatListingPrice(listing)} | ${PLATFORM_NAME}`
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params

  if (!supabaseAdmin) {
    return {
      title: `Annons | ${PLATFORM_NAME}`,
      robots: { index: false, follow: false },
    }
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: row } = await supabaseAdmin
    .from('listings')
    .select('id, title, description, price, bortskankes, status, user_id, attributes, make, model')
    .eq('id', id)
    .maybeSingle()

  if (!row) {
    return {
      title: `Annons saknas | ${PLATFORM_NAME}`,
      robots: { index: false, follow: false },
    }
  }

  const listing = row as Listing & { user_id: string }
  const isOwner = Boolean(user?.id && listing.user_id === user.id)
  const isDraft = listing.status === 'draft'

  if (isDraft && !isOwner) {
    return {
      title: `Privat annons | ${PLATFORM_NAME}`,
      robots: { index: false, follow: false },
    }
  }

  return {
    title: getSeoTitle(listing),
    description: toSnippet(listing.description || ''),
    robots: isDraft
      ? { index: false, follow: false }
      : { index: true, follow: true },
  }
}

export default async function ListingDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const result = await getListingById(id)

  if (!result.success || !result.data) {
    notFound()
  }

  const listing = result.data
  const productType = listing.category === 'cars' ? 'Vehicle' : 'Product'
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': productType,
    name: listing.title,
    description: toSnippet(listing.description || '', 300),
    image: listing.images?.filter(Boolean) ?? [],
    offers: {
      '@type': 'Offer',
      priceCurrency: 'SEK',
      price: listing.bortskankes ? 0 : listing.price,
      availability:
        listing.status === 'sold'
          ? 'https://schema.org/SoldOut'
          : 'https://schema.org/InStock',
    },
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <ListingDetailsClient initialListing={listing} listingId={id} />
    </>
  )
}

