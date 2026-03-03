import { createClient } from '@/lib/supabase/server'

const DEMO_MODE = process.env.DEMO_MODE === 'true'

export interface LeadDetail {
  id: string
  listingId: string | null
  listingTitle: string
  listingPrice: number | null
  listingMake: string | null
  listingModel: string | null
  listingYear: number | null
  listingSubtitle: string | null
  buyerName: string
  buyerPhone: string
  buyerEmail: string | null
  status: string
  source: string | null
  createdAt: string
  conversationId: string | null
  internalNote: string | null
  internalNoteUpdatedAt: string | null
}

export async function getLeadDetail(params: {
  leadId: string
}): Promise<LeadDetail | null> {
  const supabase = await createClient()

  if (DEMO_MODE && params.leadId.startsWith('demo-')) {
    const now = new Date()
    return {
      id: params.leadId,
      listingId: 'demo-listing-no-chat',
      listingTitle: 'Demo: Lead utan chatt',
      listingPrice: 329000,
      listingMake: 'Volvo',
      listingModel: 'XC40',
      listingYear: 2021,
      listingSubtitle: 'Volvo XC40 2021',
      buyerName: 'Demo Gästkund',
      buyerPhone: '070-000 00 00',
      buyerEmail: 'demo@example.com',
      status: 'new',
      source: 'guest_form',
      createdAt: now.toISOString(),
      conversationId: null,
      internalNote: 'Exempelanteckning: Kunden vill gärna bli uppringd efter kl 17.',
      internalNoteUpdatedAt: now.toISOString(),
    }
  }

  const { data, error } = await supabase
    .from('leads')
    .select(
      `
      id,
      conversation_id,
      listing_id,
      buyer_name,
      buyer_phone,
      buyer_email,
      status,
      source,
      created_at,
      internal_note,
      internal_note_updated_at,
      listing:listings (id, title, price, make, model, year)
    `
    )
    .eq('id', params.leadId)
    .maybeSingle()

  if (error) {
    console.error('[leados] getLeadDetail failed', error.message)
    return null
  }
  if (!data) return null

  const row = data as {
    id: string
    conversation_id?: string | null
    listing_id?: string | null
    buyer_name: string
    buyer_phone: string
    buyer_email?: string | null
    status?: string | null
    source?: string | null
    created_at: string
    internal_note?: string | null
    internal_note_updated_at?: string | null
    listing?:
      | {
          id?: string
          title?: string | null
          price?: number | null
          make?: string | null
          model?: string | null
          year?: number | null
        }
      | null
  }

  const make = row.listing?.make?.trim() || ''
  const model = row.listing?.model?.trim() || ''
  const year = row.listing?.year
  const subtitleParts: string[] = []
  if (make) subtitleParts.push(make)
  if (model) subtitleParts.push(model)
  if (year) subtitleParts.push(String(year))
  const listingSubtitle = subtitleParts.length > 0 ? subtitleParts.join(' ') : null

  return {
    id: row.id,
    listingId: row.listing?.id ?? row.listing_id ?? null,
    listingTitle: row.listing?.title?.trim() || 'Lead utan aktiv annons',
    listingPrice: row.listing?.price ?? null,
    listingMake: row.listing?.make ?? null,
    listingModel: row.listing?.model ?? null,
    listingYear: row.listing?.year ?? null,
    listingSubtitle,
    buyerName: row.buyer_name,
    buyerPhone: row.buyer_phone,
    buyerEmail: row.buyer_email ?? null,
    status: row.status ?? 'new',
    source: row.source ?? null,
    createdAt: row.created_at,
    conversationId: row.conversation_id ?? null,
    internalNote: row.internal_note ?? null,
    internalNoteUpdatedAt: row.internal_note_updated_at ?? null,
  }
}

export async function updateLeadInternalNote(params: {
  leadId: string
  note: string
}): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  const nowIso = new Date().toISOString()

  const { error } = await supabase
    .from('leads')
    .update({
      internal_note: params.note,
      internal_note_updated_at: nowIso,
    })
    .eq('id', params.leadId)

  if (error) {
    console.error('[leados] updateLeadInternalNote failed', error.message)
    return { success: false, error: 'Kunde inte spara anteckning.' }
  }

  return { success: true }
}

