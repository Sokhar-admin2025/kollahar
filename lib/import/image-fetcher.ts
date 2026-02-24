import { createHash } from 'crypto'
import { AD_CONFIG } from '@/lib/constants'
import { supabaseAdmin } from '@/lib/supabase/admin'

const IMAGE_FETCH_TIMEOUT_MS = 12000
const SUPPORTED_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'webp', 'gif'])

export interface ImageFetchFailure {
  sourceUrl: string
  error: string
}

export interface ImageFetchResult {
  publicUrl: string
  sourceUrl: string
  reused: boolean
}

function sha256(input: string): string {
  return createHash('sha256').update(input).digest('hex')
}

function getExtensionFromUrl(sourceUrl: string): string | null {
  try {
    const pathname = new URL(sourceUrl).pathname
    const rawExt = pathname.split('.').pop()?.toLowerCase() || ''
    if (!rawExt) return null
    if (SUPPORTED_EXTENSIONS.has(rawExt)) return rawExt
    return null
  } catch {
    return null
  }
}

function getExtensionFromContentType(contentType: string | null): string {
  const type = (contentType || '').toLowerCase()
  if (type.includes('png')) return 'png'
  if (type.includes('webp')) return 'webp'
  if (type.includes('gif')) return 'gif'
  return 'jpg'
}

function buildStoragePath(params: { userId: string; sourceUrl: string; extension: string }): string {
  const hash = sha256(params.sourceUrl)
  return `${params.userId}/imports/${hash}.${params.extension}`
}

async function objectExists(path: string): Promise<boolean> {
  if (!supabaseAdmin) return false
  const slash = path.lastIndexOf('/')
  const folder = slash > 0 ? path.slice(0, slash) : ''
  const fileName = slash > 0 ? path.slice(slash + 1) : path
  const { data, error } = await supabaseAdmin.storage
    .from(AD_CONFIG.BUCKET_NAME)
    .list(folder, { limit: 100, search: fileName })

  if (error) return false
  return (data || []).some((item) => item.name === fileName)
}

function getPublicUrl(path: string): string {
  if (!supabaseAdmin) return ''
  const { data } = supabaseAdmin.storage.from(AD_CONFIG.BUCKET_NAME).getPublicUrl(path)
  return data.publicUrl
}

async function fetchImageAsBuffer(sourceUrl: string): Promise<{ buffer: Buffer; contentType: string | null }> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), IMAGE_FETCH_TIMEOUT_MS)
  try {
    const response = await fetch(sourceUrl, {
      method: 'GET',
      redirect: 'follow',
      signal: controller.signal,
      headers: { 'user-agent': 'kollahar-import-bot/1.0' },
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }

    const contentType = response.headers.get('content-type')
    if (contentType && !contentType.toLowerCase().startsWith('image/')) {
      throw new Error(`Ogiltig content-type: ${contentType}`)
    }

    const arrayBuffer = await response.arrayBuffer()
    return { buffer: Buffer.from(arrayBuffer), contentType }
  } finally {
    clearTimeout(timeout)
  }
}

export async function fetchAndUploadImageFromUrl(params: {
  userId: string
  sourceUrl: string
  requestCache?: Map<string, string>
}): Promise<ImageFetchResult> {
  const sourceUrl = params.sourceUrl.trim()
  if (!sourceUrl) {
    throw new Error('Tom bild-URL')
  }
  if (!supabaseAdmin) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY saknas')
  }
  if (!sourceUrl.startsWith('http://') && !sourceUrl.startsWith('https://')) {
    throw new Error('Endast publika http/https-URL:er stöds')
  }

  const cached = params.requestCache?.get(sourceUrl)
  if (cached) {
    return { sourceUrl, publicUrl: cached, reused: true }
  }

  const extension = getExtensionFromUrl(sourceUrl) || 'jpg'
  const deterministicPath = buildStoragePath({
    userId: params.userId,
    sourceUrl,
    extension,
  })

  if (await objectExists(deterministicPath)) {
    const publicUrl = getPublicUrl(deterministicPath)
    if (publicUrl) {
      params.requestCache?.set(sourceUrl, publicUrl)
      return { sourceUrl, publicUrl, reused: true }
    }
  }

  const { buffer, contentType } = await fetchImageAsBuffer(sourceUrl)
  const finalExtension = getExtensionFromUrl(sourceUrl) || getExtensionFromContentType(contentType)
  const finalPath =
    finalExtension === extension
      ? deterministicPath
      : buildStoragePath({
          userId: params.userId,
          sourceUrl,
          extension: finalExtension,
        })

  if (finalPath !== deterministicPath && (await objectExists(finalPath))) {
    const publicUrl = getPublicUrl(finalPath)
    if (publicUrl) {
      params.requestCache?.set(sourceUrl, publicUrl)
      return { sourceUrl, publicUrl, reused: true }
    }
  }

  const { error } = await supabaseAdmin.storage.from(AD_CONFIG.BUCKET_NAME).upload(finalPath, buffer, {
    contentType: contentType || `image/${finalExtension}`,
    cacheControl: '31536000',
    upsert: false,
  })

  if (error && !/exists|duplicate/i.test(error.message)) {
    throw new Error(error.message)
  }

  const publicUrl = getPublicUrl(finalPath)
  if (!publicUrl) {
    throw new Error('Kunde inte skapa publik URL för uppladdad bild')
  }

  params.requestCache?.set(sourceUrl, publicUrl)
  return {
    sourceUrl,
    publicUrl,
    reused: Boolean(error),
  }
}

export async function processImageQueue(params: {
  userId: string
  sourceUrls: string[]
  requestCache?: Map<string, string>
}): Promise<{ internalUrls: string[]; failures: ImageFetchFailure[] }> {
  const seen = new Set<string>()
  const internalUrls: string[] = []
  const failures: ImageFetchFailure[] = []

  for (const raw of params.sourceUrls) {
    const sourceUrl = raw.trim()
    if (!sourceUrl || seen.has(sourceUrl)) continue
    seen.add(sourceUrl)

    try {
      const result = await fetchAndUploadImageFromUrl({
        userId: params.userId,
        sourceUrl,
        requestCache: params.requestCache,
      })
      internalUrls.push(result.publicUrl)
    } catch (error) {
      failures.push({
        sourceUrl,
        error: error instanceof Error ? error.message : 'Okänt fel vid bildhämtning',
      })
    }
  }

  return { internalUrls, failures }
}
