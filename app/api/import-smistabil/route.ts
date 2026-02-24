import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { parseSmistabilCsv } from '@/lib/import/smistabil-csv-parser'
import { processImageQueue } from '@/lib/import/image-fetcher'
import { insertListingSchema } from '@/lib/validators/listing-schema'
import { revalidatePath } from 'next/cache'

// Bildhämtning kan ta tid; tillåt längre exekvering för importjobb.
export const maxDuration = 300

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms))
const ALLOWED_MIME_TYPES = new Set(['text/csv', 'text/plain'])

function getFileExtension(name: string): string {
  const lastDot = name.lastIndexOf('.')
  if (lastDot < 0) return ''
  return name.slice(lastDot + 1).toLowerCase()
}

function startsWithPkZipSignature(bytes: Uint8Array): boolean {
  // ZIP magic bytes: 0x50 0x4B ("PK")
  return bytes.length >= 2 && bytes[0] === 0x50 && bytes[1] === 0x4b
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: 'Du måste vara inloggad för att importera.' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('account_type')
      .eq('id', user.id)
      .single()

    if ((profile as { account_type?: string } | null)?.account_type !== 'company') {
      return NextResponse.json(
        { error: 'CSV/XML bulk-import är endast tillgänglig för företagskonton.' },
        { status: 403 }
      )
    }

    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'SUPABASE_SERVICE_ROLE_KEY saknas – import kräver service role.' },
        { status: 503 }
      )
    }

    const formData = await request.formData()
    const file = formData.get('file') as File | null
    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: 'Skicka en CSV-fil med fältet "file".' }, { status: 400 })
    }

    const extension = getFileExtension(file.name || '')
    const headerBuffer = await file.slice(0, 4).arrayBuffer()
    const headerBytes = new Uint8Array(headerBuffer)

    if (startsWithPkZipSignature(headerBytes)) {
      return NextResponse.json(
        {
          error:
            'Detta verkar vara en Excel- eller Numbers-fil. Vänligen exportera den som CSV innan du laddar upp.',
        },
        { status: 400 }
      )
    }

    const mimeType = (file.type || '').toLowerCase()
    const hasAllowedMime = ALLOWED_MIME_TYPES.has(mimeType)
    const hasAllowedExtension = extension === 'csv' || extension === 'txt'

    // Endast textfiler av CSV-typ ska gå vidare till parsern.
    if (!hasAllowedMime && !hasAllowedExtension) {
      return NextResponse.json(
        { error: 'Ogiltigt filformat. Ladda upp en CSV-fil (.csv) eller textfil (.txt).' },
        { status: 400 }
      )
    }

    const csvContent = await file.text()
    const rows = parseSmistabilCsv(csvContent)

    if (rows.length === 0) {
      return NextResponse.json({ error: 'Inga giltiga rader hittades i CSV-filen.' }, { status: 400 })
    }

    const results = { created: 0, failed: 0, errors: [] as string[] }
    const imageUrlCache = new Map<string, string>()

    for (let i = 0; i < rows.length; i++) {
      const { listing } = rows[i]
      // Enkel kö-logik: processa bild-URL:er sekventiellt per rad för att undvika timeout-spikes.
      const externalImageUrls = Array.isArray(listing.images) ? listing.images : []
      let internalImageUrls: string[] = []
      if (externalImageUrls.length > 0) {
        const { internalUrls, failures } = await processImageQueue({
          userId: user.id,
          sourceUrls: externalImageUrls,
          requestCache: imageUrlCache,
        })
        internalImageUrls = internalUrls
        for (const failure of failures) {
          results.errors.push(
            `[Bildfel] ${listing.title}: ${failure.sourceUrl} (${failure.error})`
          )
        }
      }

      const listingWithInternalImages = {
        ...listing,
        images: internalImageUrls,
      }
      const parsed = insertListingSchema.safeParse(listingWithInternalImages)
      if (!parsed.success) {
        results.failed++
        results.errors.push(`${listing.title}: ${parsed.error.errors.map((e) => e.message).join(', ')}`)
        continue
      }

      const d = parsed.data
      const isBortskankes = Boolean(d.bortskankes)
      const payload: Record<string, unknown> = {
        title: d.title.trim(),
        description: d.description.trim(),
        price: isBortskankes ? 0 : d.price,
        location: d.location.trim(),
        category: d.category,
        make: d.make,
        model: d.model,
        year: d.year,
        mileage: d.mileage,
        engine_hours: d.engine_hours,
        fuel_type: d.fuel_type,
        transmission: d.transmission,
        engine_power: d.engine_power,
        length_cm: d.length_cm,
        images: d.images ?? [],
        attributes: d.attributes ?? {},
        user_id: user.id,
        status: 'active',
        contact_via_chat: d.contact_via_chat,
        show_phone: d.show_phone,
        show_email: d.show_email,
      }
      payload.bortskankes = isBortskankes
      if (d.external_id?.trim()) payload.external_id = d.external_id.trim()
      if (d.external_url?.trim()) payload.external_url = d.external_url.trim()
      if (d.contact_email?.trim()) payload.contact_email = d.contact_email.trim()
      if (d.contact_name?.trim()) payload.contact_name = d.contact_name.trim()

      const { error } = await supabaseAdmin
        .from('listings')
        .upsert(payload, {
          onConflict: 'user_id,external_id',
          ignoreDuplicates: false,
        })
        .select('id')
        .single()

      if (error) {
        results.failed++
        results.errors.push(`${listing.title}: ${error.message}`)
      } else {
        results.created++
      }

      if (i < rows.length - 1) await delay(200)
    }

    revalidatePath('/')
    revalidatePath('/dashboard')
    revalidatePath('/dashboard/dealer')

    return NextResponse.json({
      success: true,
      message: `Importerat: ${results.created} annonser (nytt + uppdaterat), ${results.failed} misslyckades.`,
      ...results,
    })
  } catch (err) {
    console.error('[import-smistabil]', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Ett oväntat fel uppstod vid import.' },
      { status: 500 }
    )
  }
}
