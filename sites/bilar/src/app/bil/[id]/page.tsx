import { notFound } from 'next/navigation'
import { createClient } from '../../../lib/supabase/server'
import {
  getPublicListing,
  getRelatedListings,
  getFavoriteIds,
  logView,
} from '../../../lib/features/bilar-public-service'
import { supabaseAdmin } from '../../../lib/supabase/admin'
import BilarListingDetailClient from './BilarListingDetailClient'

export const dynamic = 'force-dynamic'
export const revalidate = 0

// ─── Metadata ─────────────────────────────────────────────────────────────────

interface PageProps {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()
  const listing = await getPublicListing(supabase, id)
  if (!listing) return { title: 'Annons hittades inte' }
  return {
    title: listing.title,
    description: `${listing.make ?? ''} ${listing.model ?? ''} ${listing.year ?? ''} — ${
      listing.price ? listing.price.toLocaleString('sv-SE') + ' kr' : 'Pris på förfrågan'
    }`,
  }
}

// ─── Server Actions ───────────────────────────────────────────────────────────

async function toggleFavoriteAction(
  listingId: string
): Promise<{ success: boolean }> {
  'use server'
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false }

  const { data: existing } = await supabase
    .from('favorites')
    .select('id')
    .eq('user_id', user.id)
    .eq('listing_id', listingId)
    .maybeSingle()

  if (existing) {
    await supabase
      .from('favorites')
      .delete()
      .eq('user_id', user.id)
      .eq('listing_id', listingId)
  } else {
    await supabase
      .from('favorites')
      .insert({ user_id: user.id, listing_id: listingId })
  }
  return { success: true }
}

async function createPublicLeadAction(
  listingId: string,
  organizationId: string,
  sellerId: string | null,
  email: string,
  name: string,
  message: string,
  consent: boolean
): Promise<{ success: boolean; error?: string }> {
  'use server'
  if (!supabaseAdmin)
    return { success: false, error: 'Databasanslutning saknas.' }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: lead, error: leadError } = await supabaseAdmin
    .from('leads')
    .insert({
      listing_id: listingId,
      organization_id: organizationId,
      seller_id: sellerId,
      buyer_id: user?.id ?? null,
      buyer_name: name.trim() || 'Anonym gäst',
      buyer_email: consent ? email : null,
      status: 'new',
      is_guest: !user,
      source: 'form',
      source_site: 'bilar',
      internal_note: [
        name ? `Namn: ${name}` : null,
        message ? `Meddelande: ${message}` : null,
      ]
        .filter(Boolean)
        .join('\n') || null,
    })
    .select('id')
    .single()

  if (leadError || !lead) {
    console.error('[bilar] createPublicLead error', leadError)
    return { success: false, error: 'Kunde inte skicka förfrågan. Försök igen.' }
  }

  // Skicka systemmeddelande i lead_messages om det finns ett meddelande
  if (message.trim()) {
    await supabaseAdmin.from('lead_messages').insert({
      lead_id: lead.id,
      organization_id: organizationId,
      author_profile_id: user?.id ?? null,
      role: 'system',
      content: `Köparen skriver: "${message.trim()}"`,
    })
  }

  return { success: true }
}

async function logViewAction(
  listingId: string,
  sellerId: string | null,
  viewerId: string | undefined
): Promise<void> {
  'use server'
  const supabase = await createClient()
  await logView(supabase, listingId, sellerId, viewerId)
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function BilDetailPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const [listing, favoriteIds] = await Promise.all([
    getPublicListing(supabase, id),
    user ? getFavoriteIds(supabase) : Promise.resolve([]),
  ])

  if (!listing) notFound()

  const relatedListings =
    listing.organization_id
      ? await getRelatedListings(supabase, listing.organization_id, listing.id)
      : []

  // Bind Server Actions med listingId/orgId
  const boundToggleFavorite = async (
    listingId: string
  ): Promise<{ success: boolean }> => {
    'use server'
    return toggleFavoriteAction(listingId)
  }

  const boundCreateLead = async (
    email: string,
    name: string,
    message: string,
    consent: boolean
  ): Promise<{ success: boolean; error?: string }> => {
    'use server'
    return createPublicLeadAction(
      listing.id,
      listing.organization_id!,
      listing.seller_id,
      email,
      name,
      message,
      consent
    )
  }

  const boundLogView = async (): Promise<void> => {
    'use server'
    await logViewAction(listing.id, listing.seller_id, user?.id)
  }

  return (
    <BilarListingDetailClient
      listing={listing}
      relatedListings={relatedListings}
      isFavorite={favoriteIds.includes(listing.id)}
      isLoggedIn={!!user}
      onToggleFavorite={boundToggleFavorite}
      onCreateLead={boundCreateLead}
      onLogView={boundLogView}
    />
  )
}
