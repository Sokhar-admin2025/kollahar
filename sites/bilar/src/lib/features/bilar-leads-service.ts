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

// ─── Detaljtyper ─────────────────────────────────────────────────────────────

export type LeadMessageRole = 'seller' | 'owner' | 'system'

export interface LeadMessage {
  id: string
  lead_id: string
  organization_id: string
  author_profile_id: string
  role: LeadMessageRole
  content: string
  created_at: string
}

export interface BilarLeadDetail {
  id: string
  status: LeadStatus
  source_site: SourceSite
  created_at: string
  first_response_at: string | null
  assigned_to: string | null
  is_guest: boolean
  internal_note: string | null
  buyer_name: string
  buyer_email: string | null
  listing_id: string | null
  listing_title: string
  listing_make: string | null
  listing_model: string | null
  listing_year: number | null
  listing_price: number | null
  listing_image: string | null
  messages: LeadMessage[]
  sla_missed: boolean
  sla_warning: boolean
  sla_deadline: string
}

// ─── getLead ──────────────────────────────────────────────────────────────────

export async function getLead(
  supabase: SupabaseClient,
  leadId: string,
  organizationId: string
): Promise<BilarLeadDetail | null> {
  if (!supabaseAdmin) return null

  const { data, error } = await supabaseAdmin
    .from('leads')
    .select(`
      id,
      status,
      source_site,
      created_at,
      first_response_at,
      assigned_to,
      is_guest,
      internal_note,
      buyer_name,
      buyer_email,
      listing_id,
      listings (
        title,
        make,
        model,
        year,
        price,
        images
      ),
      lead_messages (
        id,
        lead_id,
        organization_id,
        author_profile_id,
        role,
        content,
        created_at
      )
    `)
    .eq('id', leadId)
    .eq('organization_id', organizationId)
    .order('created_at', { referencedTable: 'lead_messages', ascending: true })
    .maybeSingle()

  if (error) {
    console.error('[bilar-leads-service] getLead error', error)
    return null
  }
  if (!data) return null

  const now = new Date()
  const listing = Array.isArray(data.listings) ? data.listings[0] : data.listings
  const images = (listing as { images?: unknown } | null)?.images
  const firstImage = Array.isArray(images) && images.length > 0 ? String(images[0]) : null

  const { sla_missed, sla_warning, sla_deadline } = computeSlaFlags(
    data.created_at as string,
    data.first_response_at as string | null,
    data.status as LeadStatus,
    now
  )

  const rawMessages = Array.isArray(data.lead_messages) ? data.lead_messages : []
  const messages: LeadMessage[] = rawMessages.map((m) => ({
    id: String(m.id),
    lead_id: String(m.lead_id),
    organization_id: String(m.organization_id ?? ''),
    author_profile_id: String(m.author_profile_id ?? ''),
    role: (m.role ?? 'seller') as LeadMessageRole,
    content: String(m.content ?? ''),
    created_at: String(m.created_at),
  }))

  return {
    id: data.id as string,
    status: data.status as LeadStatus,
    source_site: (data.source_site ?? 'main') as SourceSite,
    created_at: data.created_at as string,
    first_response_at: data.first_response_at as string | null,
    assigned_to: data.assigned_to as string | null,
    is_guest: Boolean(data.is_guest),
    internal_note: (data.internal_note as string | null) ?? null,
    buyer_name: String(data.buyer_name ?? 'Anonym gäst'),
    buyer_email: (data.buyer_email as string | null) ?? null,
    listing_id: data.listing_id as string | null,
    listing_title: (listing as { title?: string } | null)?.title ?? 'Okänd annons',
    listing_make: (listing as { make?: string } | null)?.make ?? null,
    listing_model: (listing as { model?: string } | null)?.model ?? null,
    listing_year: (listing as { year?: number } | null)?.year ?? null,
    listing_price: (listing as { price?: number } | null)?.price ?? null,
    listing_image: firstImage,
    messages,
    sla_missed,
    sla_warning,
    sla_deadline,
  }
}

// ─── sendLeadMessage ──────────────────────────────────────────────────────────

export async function sendLeadMessage(
  supabase: SupabaseClient,
  leadId: string,
  organizationId: string,
  content: string,
  authorProfileId: string
): Promise<{ success: true; message: LeadMessage } | { success: false; error: string }> {
  if (!supabaseAdmin) return { success: false, error: 'Databasanslutning saknas.' }

  const trimmed = content.trim()
  if (!trimmed) return { success: false, error: 'Meddelandet kan inte vara tomt.' }
  if (trimmed.length > 4000) return { success: false, error: 'Meddelandet är för långt.' }

  // Verifiera att lead tillhör org
  const { data: leadRow, error: leadError } = await supabaseAdmin
    .from('leads')
    .select('id, organization_id, first_response_at, assigned_to')
    .eq('id', leadId)
    .eq('organization_id', organizationId)
    .maybeSingle()

  if (leadError || !leadRow) {
    return { success: false, error: 'Leadet hittades inte.' }
  }

  const nowIso = new Date().toISOString()

  const { data: inserted, error: insertError } = await supabaseAdmin
    .from('lead_messages')
    .insert({
      lead_id: leadId,
      organization_id: organizationId,
      author_profile_id: authorProfileId,
      role: 'seller',
      content: trimmed,
    })
    .select('id, lead_id, organization_id, author_profile_id, role, content, created_at')
    .single()

  if (insertError || !inserted) {
    console.error('[bilar-leads-service] sendLeadMessage insert error', insertError)
    return { success: false, error: 'Kunde inte spara meddelandet.' }
  }

  // Sätt first_response_at om det saknas
  if (!(leadRow as { first_response_at?: string | null }).first_response_at) {
    await supabaseAdmin
      .from('leads')
      .update({ first_response_at: nowIso })
      .eq('id', leadId)
      .eq('organization_id', organizationId)
  }

  // Auto-assign vid första svar
  if (!(leadRow as { assigned_to?: string | null }).assigned_to) {
    await supabaseAdmin
      .from('leads')
      .update({ assigned_to: authorProfileId })
      .eq('id', leadId)
      .eq('organization_id', organizationId)
  }

  return {
    success: true,
    message: {
      id: String(inserted.id),
      lead_id: String(inserted.lead_id),
      organization_id: String(inserted.organization_id ?? ''),
      author_profile_id: String(inserted.author_profile_id ?? ''),
      role: (inserted.role ?? 'seller') as LeadMessageRole,
      content: String(inserted.content),
      created_at: String(inserted.created_at),
    },
  }
}

// ─── updateInternalNote ───────────────────────────────────────────────────────

export async function updateInternalNote(
  supabase: SupabaseClient,
  leadId: string,
  organizationId: string,
  note: string
): Promise<{ success: true } | { success: false; error: string }> {
  const { error } = await supabase
    .from('leads')
    .update({
      internal_note: note,
      internal_note_updated_at: new Date().toISOString(),
    })
    .eq('id', leadId)
    .eq('organization_id', organizationId)

  if (error) {
    console.error('[bilar-leads-service] updateInternalNote error', error)
    return { success: false, error: 'Kunde inte spara anteckning.' }
  }
  return { success: true }
}

// ─── updateLeadStatus ─────────────────────────────────────────────────────────

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

// ─── getOrganizationMembers ───────────────────────────────────────────────────

export interface OrgMember {
  id: string
  full_name: string | null
  email: string | null
  avatar_url: string | null
}

export async function getOrganizationMembers(
  _supabase: SupabaseClient,
  organizationId: string
): Promise<OrgMember[]> {
  if (!supabaseAdmin) return []

  const { data, error } = await supabaseAdmin
    .from('profiles')
    .select('id, full_name, avatar_url')
    .eq('organization_id', organizationId)
    .order('full_name', { ascending: true })

  if (error) {
    console.error('[bilar-leads-service] getOrganizationMembers error', error)
    return []
  }

  const rows = data ?? []

  // Hämta e-post från auth.users för att kunna visa som fallback när full_name saknas
  const emailMap: Record<string, string> = {}
  await Promise.all(
    rows.map(async (row) => {
      const { data: u } = await supabaseAdmin!.auth.admin.getUserById(String(row.id))
      if (u?.user?.email) emailMap[String(row.id)] = u.user.email
    })
  )

  return rows.map((row) => ({
    id: String(row.id),
    full_name: (row.full_name as string | null) ?? null,
    email: emailMap[String(row.id)] ?? null,
    avatar_url: (row.avatar_url as string | null) ?? null,
  }))
}

// ─── reassignLead ─────────────────────────────────────────────────────────────

export async function reassignLead(
  supabase: SupabaseClient,
  leadId: string,
  organizationId: string,
  newAssigneeProfileId: string,
  reassignedByProfileId: string
): Promise<{ success: true } | { success: false; error: string }> {
  if (!supabaseAdmin) return { success: false, error: 'Databasanslutning saknas.' }

  // Hämta lead + ny assignee parallellt
  const [{ data: leadRow, error: leadError }, { data: assigneeRow, error: assigneeError }] =
    await Promise.all([
      supabaseAdmin
        .from('leads')
        .select('id, organization_id, assigned_to')
        .eq('id', leadId)
        .eq('organization_id', organizationId)
        .maybeSingle(),
      supabaseAdmin
        .from('profiles')
        .select('id, full_name, organization_id')
        .eq('id', newAssigneeProfileId)
        .maybeSingle(),
    ])

  if (leadError || !leadRow) {
    return { success: false, error: 'Leadet hittades inte eller tillhör inte din organisation.' }
  }

  if (assigneeError || !assigneeRow) {
    return { success: false, error: 'Den valda profilens konto hittades inte.' }
  }

  const assigneeOrgId = (assigneeRow as { organization_id?: string | null }).organization_id
  if (!assigneeOrgId || assigneeOrgId !== organizationId) {
    return { success: false, error: 'Du kan bara omfördela till profiler i din egen organisation.' }
  }

  // Hämta namn på den som omfördelar
  const { data: byProfile } = await supabaseAdmin
    .from('profiles')
    .select('full_name')
    .eq('id', reassignedByProfileId)
    .maybeSingle()

  const assigneeName =
    (assigneeRow as { full_name?: string | null }).full_name?.trim() || newAssigneeProfileId
  const byName =
    (byProfile as { full_name?: string | null } | null)?.full_name?.trim() ||
    reassignedByProfileId

  // Uppdatera assigned_to
  const { error: updateError } = await supabaseAdmin
    .from('leads')
    .update({ assigned_to: newAssigneeProfileId })
    .eq('id', leadId)
    .eq('organization_id', organizationId)

  if (updateError) {
    console.error('[bilar-leads-service] reassignLead update error', updateError)
    return { success: false, error: 'Kunde inte omfördela leadet.' }
  }

  // Systemmeddelande i lead_messages
  const { error: msgError } = await supabaseAdmin
    .from('lead_messages')
    .insert({
      lead_id: leadId,
      organization_id: organizationId,
      author_profile_id: reassignedByProfileId,
      role: 'system',
      content: `Lead omfördelat till ${assigneeName} av ${byName}.`,
    })

  if (msgError) {
    console.error('[bilar-leads-service] reassignLead system message error', msgError)
    // Icke-kritiskt — fortsätt ändå
  }

  return { success: true }
}
