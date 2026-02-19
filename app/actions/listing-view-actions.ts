'use server'

import { supabaseAdmin } from '@/lib/supabase/admin'

/**
 * Log a listing view. Called from client when annons/[id] page is viewed.
 * Uses supabaseAdmin (service role) – bypassar RLS, insert fungerar utan explicit policy.
 * @param sellerId - listings.user_id, used for dashboard query (seller_id = orgOwnerId)
 */
export async function logListingViewAction(
  listingId: string,
  sellerId: string,
  viewerId?: string | null
): Promise<{ ok: boolean; error?: string }> {
  if (!listingId?.trim()) return { ok: false, error: 'missing_listing_id' }
  if (!sellerId || typeof sellerId !== 'string' || !sellerId.trim()) {
    console.error('[listing-view] REJECTED: seller_id saknas eller är tomt. listingId:', listingId, 'sellerId:', sellerId)
    return { ok: false, error: 'missing_seller_id' }
  }

  if (!supabaseAdmin) {
    console.error('[listing-view] supabaseAdmin saknas – SUPABASE_SERVICE_ROLE_KEY krävs')
    return { ok: false, error: 'server_config' }
  }

  try {
    console.log('RECORDING VIEW FOR SELLER:', sellerId.trim(), 'listing:', listingId.trim())
    const { error } = await supabaseAdmin.from('listing_views').insert({
      listing_id: listingId.trim(),
      seller_id: sellerId.trim(),
      viewer_id: viewerId?.trim() || null,
    })

    if (error) {
      console.error('[listing-view] insert failed:', error.message, 'code:', error.code, 'details:', error.details)
      return { ok: false, error: error.message }
    }

    return { ok: true }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[listing-view] logListingViewAction failed:', msg)
    return { ok: false, error: msg }
  }
}
