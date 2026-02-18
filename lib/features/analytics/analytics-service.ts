import { createClient } from '@/lib/supabase/server'

export type AnalyticsEventType = 'view' | 'lead_start' | 'phone_click'

/** Logga event till analytics_events. Fire-and-forget – väntar inte på resultat. */
export function logAnalyticsEvent(
  listingId: string,
  eventType: AnalyticsEventType,
  referrerSource?: string | null
): void {
  void (async () => {
    try {
      const supabase = await createClient()
      await supabase.from('analytics_events').insert({
        listing_id: listingId,
        event_type: eventType,
        referrer_source: referrerSource ?? null,
      })
    } catch (err) {
      console.error('[analytics] logAnalyticsEvent failed:', err)
    }
  })()
}
