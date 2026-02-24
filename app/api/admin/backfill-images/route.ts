import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { AD_CONFIG } from '@/lib/constants'
import { fetchAndUploadImageFromUrl } from '@/lib/import/image-fetcher'

export const maxDuration = 300

const DEFAULT_LIMIT = 10
const MAX_LIMIT = 50
const CANDIDATE_SCAN_LIMIT = 500

type ListingRow = {
  id: string
  user_id: string
  title: string
  images: string[] | null
}

function isHttpUrl(value: string): boolean {
  return value.startsWith('http://') || value.startsWith('https://')
}

function normalizeLimit(raw: unknown): number {
  if (typeof raw !== 'number' || Number.isNaN(raw)) return DEFAULT_LIMIT
  return Math.max(1, Math.min(MAX_LIMIT, Math.floor(raw)))
}

function buildInternalPrefix(): string | null {
  const base = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim().replace(/\/$/, '')
  if (!base) return null
  return `${base}/storage/v1/object/public/${AD_CONFIG.BUCKET_NAME}/`
}

function isInternalImageUrl(url: string, internalPrefix: string | null): boolean {
  if (internalPrefix && url.startsWith(internalPrefix)) return true
  return url.includes(`/storage/v1/object/public/${AD_CONFIG.BUCKET_NAME}/`)
}

function hasExternalImages(images: string[] | null | undefined, internalPrefix: string | null): boolean {
  if (!Array.isArray(images) || images.length === 0) return false
  return images.some((url) => isHttpUrl(url) && !isInternalImageUrl(url, internalPrefix))
}

export async function POST(request: Request) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'SUPABASE_SERVICE_ROLE_KEY saknas – backfill kräver service role.' },
        { status: 503 }
      )
    }

    const supabase = await createClient()
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: 'Du måste vara inloggad.' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('account_type, is_admin')
      .eq('id', user.id)
      .single()

    const accountType = (profile as { account_type?: string } | null)?.account_type ?? 'private'
    const isAdmin = (profile as { is_admin?: boolean } | null)?.is_admin ?? true
    if (accountType !== 'company' || !isAdmin) {
      return NextResponse.json(
        { error: 'Endast admin för företagskonto kan köra bild-backfill.' },
        { status: 403 }
      )
    }

    const body = (await request.json().catch(() => ({}))) as { limit?: number }
    const limit = normalizeLimit(body.limit)
    const internalPrefix = buildInternalPrefix()

    const { data, error } = await supabaseAdmin
      .from('listings')
      .select('id, user_id, title, images')
      .not('images', 'is', null)
      .limit(CANDIDATE_SCAN_LIMIT)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const listings = (data || []) as ListingRow[]
    const candidates = listings.filter((l) => hasExternalImages(l.images, internalPrefix))
    const batch = candidates.slice(0, limit)

    const requestCache = new Map<string, string>()
    const results = {
      scanned: listings.length,
      candidates: candidates.length,
      processedListings: 0,
      updatedListings: 0,
      replacedImages: 0,
      failedImages: 0,
      listingErrors: [] as string[],
    }

    for (const listing of batch) {
      const sourceImages = Array.isArray(listing.images) ? listing.images : []
      if (sourceImages.length === 0) continue
      results.processedListings++

      const nextImages = [...sourceImages]
      let listingChanged = false

      for (let idx = 0; idx < sourceImages.length; idx++) {
        const sourceUrl = sourceImages[idx]
        if (!isHttpUrl(sourceUrl) || isInternalImageUrl(sourceUrl, internalPrefix)) continue

        try {
          const uploaded = await fetchAndUploadImageFromUrl({
            userId: listing.user_id,
            sourceUrl,
            requestCache,
          })
          if (uploaded.publicUrl !== sourceUrl) {
            nextImages[idx] = uploaded.publicUrl
            listingChanged = true
            results.replacedImages++
          }
        } catch (err) {
          results.failedImages++
          const message = err instanceof Error ? err.message : 'Okänt fel'
          results.listingErrors.push(`${listing.title}: ${sourceUrl} (${message})`)
        }
      }

      if (!listingChanged) continue

      const { error: updateError } = await supabaseAdmin
        .from('listings')
        .update({ images: nextImages })
        .eq('id', listing.id)

      if (updateError) {
        results.listingErrors.push(`${listing.title}: update misslyckades (${updateError.message})`)
      } else {
        results.updatedListings++
      }
    }

    return NextResponse.json({
      success: true,
      message: `Bearbetade ${results.processedListings} annonser, uppdaterade ${results.updatedListings}.`,
      limit,
      remainingCandidates: Math.max(0, candidates.length - batch.length),
      ...results,
    })
  } catch (err) {
    console.error('[backfill-images]', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Ett oväntat fel uppstod i backfill.' },
      { status: 500 }
    )
  }
}
