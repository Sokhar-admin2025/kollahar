import { headers } from 'next/headers'
import { logAnalyticsEvent } from '@/lib/features/analytics/analytics-service'

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
  const headersList = await headers()
  const referer = headersList.get('referer')
  const referrerSource = parseReferrerSource(referer)

  logAnalyticsEvent(id, 'view', referrerSource)

  return <>{children}</>
}
