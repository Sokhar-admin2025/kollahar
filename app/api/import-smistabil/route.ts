import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { parseSmistabilCsv } from '@/lib/import/smistabil-csv-parser'
import { insertListingSchema } from '@/lib/validators/listing-schema'
import { revalidatePath } from 'next/cache'

export const maxDuration = 60

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms))

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

    const csvContent = await file.text()
    const rows = parseSmistabilCsv(csvContent)

    if (rows.length === 0) {
      return NextResponse.json({ error: 'Inga giltiga rader hittades i CSV-filen.' }, { status: 400 })
    }

    const results = { created: 0, failed: 0, errors: [] as string[] }

    for (let i = 0; i < rows.length; i++) {
      const { listing } = rows[i]
      const parsed = insertListingSchema.safeParse(listing)
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
        images: d.images ?? [],
        attributes: d.attributes ?? {},
        user_id: user.id,
        status: 'active',
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
