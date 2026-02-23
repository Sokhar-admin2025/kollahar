import { headers } from 'next/headers'
import { logAnalyticsEvent } from '@/lib/features/analytics/analytics-service'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

function parseReferrerSource(referer: string | null): string | null {
  if (!referer) return 'direct'
  const lower = referer.toLowerCase()
  if (lower.includes('google') || lower.includes('bing') || lower.includes('duckduckgo')) return 'google'
  if (lower.includes('facebook') || lower.includes('instagram') || lower.includes('twitter') || lower.includes('linkedin') || lower.includes('tiktok')) return 'social'
  return 'referral'
}

export default async function ListingLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const headersList = await headers()
  const referer = headersList.get('referer')
  const referrerSource = parseReferrerSource(referer)

  let listingStatus = 'unknown'
  let isOwner = false
  if (supabaseAdmin) {
    const { data: listingRow } = await supabaseAdmin
      .from('listings')
      .select('status, user_id')
      .eq('id', id)
      .maybeSingle()
    if (listingRow) {
      listingStatus = (listingRow as { status?: string }).status ?? 'unknown'
      isOwner = Boolean(user?.id && (listingRow as { user_id?: string }).user_id === user.id)
    } else {
      listingStatus = 'not_found'
    }
  }

  // Temporary localhost verification log requested by product/security review.
  console.log(`[Security Check] Accessing listing: ${id}, Status: ${listingStatus}, Is Owner: ${isOwner}`)

  logAnalyticsEvent(id, 'view', referrerSource)

  return <>{children}</>
}
