import { NextResponse } from 'next/server'
import { createClient } from '../../../lib/supabase/server'
import { supabaseAdmin } from '../../../lib/supabase/admin'
import { parseSmistabilCsv } from '../../../lib/import/smistabil-csv-parser'
import { processImageQueue } from '../../../lib/import/image-fetcher'
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
      .select('account_type, organization_id')
      .eq('id', user.id)
      .single()

    const typedProfile = profile as { account_type?: string; organization_id?: string | null } | null

    if (typedProfile?.account_type !== 'company') {
      return NextResponse.json(
        { error: 'CSV bulk-import är endast tillgänglig för företagskonton.' },
        { status: 403 }
      )
    }

    const organizationId = typedProfile?.organization_id
    if (!organizationId) {
      return NextResponse.json(
        { error: 'Ditt konto saknar kopplad organisation. Kontakta support.' },
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

    const results = { created: 0, skipped: 0, failed: 0, errors: [] as string[], skippedTitles: [] as string[] }
    const imageUrlCache = new Map<string, string>()

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]

      const externalImageUrls = Array.isArray(row.images) ? row.images : []
      let internalImageUrls: string[] = []

      if (externalImageUrls.length > 0) {
        const { internalUrls, failures } = await processImageQueue({
          userId: user.id,
          sourceUrls: externalImageUrls,
          requestCache: imageUrlCache,
        })
        internalImageUrls = internalUrls
        for (const failure of failures) {
          results.errors.push(`[Bildfel] ${row.title}: ${failure.sourceUrl} (${failure.error})`)
        }
      }

      // Kontrollera om annonsen redan finns (matchning på user_id + external_id)
      const existingRow = row.external_id
        ? await supabaseAdmin
            .from('listings')
            .select('id')
            .eq('user_id', user.id)
            .eq('external_id', row.external_id)
            .maybeSingle()
            .then((r) => r.data)
        : null

      if (existingRow) {
        // Befintlig annons — hoppa över, alla ändringar görs i plattformen
        results.skipped++
        results.skippedTitles.push(row.title)
      } else {
        // Ny annons — INSERT med alla fält
        const insertPayload: Record<string, unknown> = {
          title: row.title,
          description: row.description,
          price: row.price,
          make: row.make ?? null,
          model: row.model ?? null,
          year: row.year ?? null,
          mileage: row.mileage ?? null,
          fuel_type: row.fuel_type ?? null,
          transmission: row.transmission ?? null,
          engine_power: row.engine_power ?? null,
          images: internalImageUrls,
          attributes: row.attributes,
          user_id: user.id,
          organization_id: organizationId,
          seller_type: 'company',
          source_site: 'bilar',
          category: 'cars',
          status: 'active',
          location: '',
          contact_via_chat: true,
          show_phone: false,
          show_email: false,
        }
        if (row.external_id) insertPayload.external_id = row.external_id
        if (row.external_url) insertPayload.external_url = row.external_url

        const { error } = await supabaseAdmin
          .from('listings')
          .insert(insertPayload)
          .select('id')
          .single()

        if (error) {
          results.failed++
          results.errors.push(`${row.title}: ${error.message}`)
          console.error('[bilar-import-smistabil] insert error', row.title, error)
        } else {
          results.created++
        }
      }

      if (i < rows.length - 1) await delay(200)
    }

    revalidatePath('/dashboard/annonser')

    return NextResponse.json({
      success: true,
      message: `${results.created} nya annonser skapades, ${results.skipped} befintliga (uppdateras ej), ${results.failed} misslyckades.`,
      ...results,
    })
  } catch (err) {
    console.error('[bilar-import-smistabil]', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Ett oväntat fel uppstod vid import.' },
      { status: 500 }
    )
  }
}
