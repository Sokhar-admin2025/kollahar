import type { SupabaseClient } from '@supabase/supabase-js'
import { supabaseAdmin } from '../supabase/admin'

export type LeadStatus = 'new' | 'contacted' | 'qualified' | 'sold' | 'archived'
export type SourceSite = 'main' | 'bilar' | 'batar' | 'lokaler'

export interface BilarLead {
  id: string
  status: LeadStatus
  source_site: SourceSite
  created_at: string
  first_response_at: string | null
  assigned_to: string | null
  is_guest: boolean
  buyer_name: string
  listing_id: string | null
  listing_title: string
  listing_make: string | null
  listing_model: string | null
  listing_year: number | null
  listing_image: string | null
  /** true = first_response_at - created_at > 15 min, eller status = 'new' och äldre än 15 min */
  sla_missed: boolean
  /** true = status = 'new' och skapades för <13 min sedan (2 min kvar till deadline) */
  sla_warning: boolean
  sla_deadline: string
}

export interface LeadsFilters {
  status?: LeadStatus | 'all'
  source_site?: SourceSite | 'all'
  make?: string
  date_from?: string
  date_to?: string
}

const SLA_MS = 15 * 60 * 1000
const WARN_THRESHOLD_MS = 13 * 60 * 1000

function computeSlaFlags(
  createdAt: string,
  firstResponseAt: string | null,
  status: LeadStatus,
  now: Date
): { sla_missed: boolean; sla_warning: boolean; sla_deadline: string } {
  const created = new Date(createdAt).getTime()
  const sla_deadline = new Date(created + SLA_MS).toISOString()

  if (firstResponseAt) {
    const responseMs = new Date(firstResponseAt).getTime() - created
    return {
      sla_missed: responseMs > SLA_MS,
      sla_warning: false,
      sla_deadline,
    }
  }

  const ageMs = now.getTime() - created
  const isNew = status === 'new'

  return {
    sla_missed: isNew && ageMs > SLA_MS,
    sla_warning: isNew && ageMs >= WARN_THRESHOLD_MS && ageMs <= SLA_MS,
    sla_deadline,
  }
}

export async function getLeads(
  supabase: SupabaseClient,
  organizationId: string,
  filters?: LeadsFilters
): Promise<BilarLead[]> {
  if (!supabaseAdmin) return []

  const now = new Date()

  let query = supabaseAdmin
    .from('leads')
    .select(`
      id,
      status,
      source_site,
      created_at,
      first_response_at,
      assigned_to,
      is_guest,
      buyer_name,
      listing_id,
      listings (
        title,
        make,
        model,
        year,
        images
      )
    `)
    .eq('organization_id', organizationId)
    .neq('status', 'archived')
    .order('created_at', { ascending: false })

  if (filters?.status && filters.status !== 'all') {
    query = query.eq('status', filters.status)
  }
  if (filters?.source_site && filters.source_site !== 'all') {
    query = query.eq('source_site', filters.source_site)
  }
  if (filters?.make) {
    query = query.ilike('listings.make', `%${filters.make}%`)
  }
  if (filters?.date_from) {
    query = query.gte('created_at', filters.date_from)
  }
  if (filters?.date_to) {
    query = query.lte('created_at', filters.date_to)
  }

  const { data, error } = await query

  if (error) {
    console.error('[bilar-leads-service] getLeads error', error)
    return []
  }

  return (data ?? []).map((row) => {
    const listing = Array.isArray(row.listings) ? row.listings[0] : row.listings
    const images = (listing as { images?: unknown } | null)?.images
    const firstImage = Array.isArray(images) && images.length > 0 ? String(images[0]) : null

    const { sla_missed, sla_warning, sla_deadline } = computeSlaFlags(
      row.created_at as string,
      row.first_response_at as string | null,
      row.status as LeadStatus,
      now
    )

    return {
      id: row.id as string,
      status: row.status as LeadStatus,
      source_site: (row.source_site ?? 'main') as SourceSite,
      created_at: row.created_at as string,
      first_response_at: row.first_response_at as string | null,
      assigned_to: row.assigned_to as string | null,
      is_guest: Boolean(row.is_guest),
      buyer_name: String(row.buyer_name ?? 'Anonym gäst'),
      listing_id: row.listing_id as string | null,
      listing_title: (listing as { title?: string } | null)?.title ?? 'Okänd annons',
      listing_make: (listing as { make?: string } | null)?.make ?? null,
      listing_model: (listing as { model?: string } | null)?.model ?? null,
      listing_year: (listing as { year?: number } | null)?.year ?? null,
      listing_image: firstImage,
      sla_missed,
      sla_warning,
      sla_deadline,
    }
  })
}

export async function updateLeadStatus(
  supabase: SupabaseClient,
  leadId: string,
  status: LeadStatus,
  organizationId: string
): Promise<{ success: true } | { success: false; error: string }> {
  const allowed: LeadStatus[] = ['new', 'contacted', 'qualified', 'sold', 'archived']
  if (!allowed.includes(status)) {
    return { success: false, error: 'Ogiltig status.' }
  }

  const setFirstResponse = status === 'contacted' || status === 'qualified' || status === 'sold'

  if (setFirstResponse) {
    const nowIso = new Date().toISOString()
    // Sätt first_response_at bara om det saknas
    const { error: e1 } = await supabase
      .from('leads')
      .update({ status, first_response_at: nowIso })
      .eq('id', leadId)
      .eq('organization_id', organizationId)
      .is('first_response_at', null)

    if (e1) return { success: false, error: 'Kunde inte uppdatera status.' }

    const { error: e2 } = await supabase
      .from('leads')
      .update({ status })
      .eq('id', leadId)
      .eq('organization_id', organizationId)
      .not('first_response_at', 'is', null)

    if (e2) return { success: false, error: 'Kunde inte uppdatera status.' }
  } else {
    const { error } = await supabase
      .from('leads')
      .update({ status })
      .eq('id', leadId)
      .eq('organization_id', organizationId)

    if (error) return { success: false, error: 'Kunde inte uppdatera status.' }
  }

  return { success: true }
}
