'use server'

import { createClient } from '@/lib/supabase/server'

/**
 * Log a listing view. Called from client when annons/[id] page is viewed.
 * Accepts both logged-in users (viewerId) and anonymous users (viewerId = null).
 * Client uses sessionStorage to prevent double-counting same listing in same tab/session.
 * @param sellerId - listings.user_id, used for dashboard query (seller_id = orgOwnerId)
 */
export async function logListingViewAction(
  listingId: string,
  sellerId: string,
  viewerId?: string | null
): Promise<{ ok: boolean }> {
  if (!listingId?.trim()) return { ok: false }
  if (!sellerId?.trim()) return { ok: false }

  try {
    const supabase = await createClient()
    await supabase.from('listing_views').insert({
      listing_id: listingId.trim(),
      seller_id: sellerId.trim(),
      viewer_id: viewerId?.trim() || null,
    })
    return { ok: true }
  } catch (err) {
    console.error('[listing-view] logListingViewAction failed:', err)
    return { ok: false }
  }
}
