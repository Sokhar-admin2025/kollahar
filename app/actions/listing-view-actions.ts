'use server'

import { createClient } from '@/lib/supabase/server'

/**
 * Log a listing view. Called from client when annons/[id] page is viewed.
 * Client should debounce with sessionStorage so refresh doesn't count as multiple views.
 */
export async function logListingViewAction(
  listingId: string,
  viewerId?: string | null
): Promise<{ ok: boolean }> {
  if (!listingId?.trim()) return { ok: false }

  try {
    const supabase = await createClient()
    await supabase.from('listing_views').insert({
      listing_id: listingId.trim(),
      viewer_id: viewerId?.trim() || null,
    })
    return { ok: true }
  } catch (err) {
    console.error('[listing-view] logListingViewAction failed:', err)
    return { ok: false }
  }
}
