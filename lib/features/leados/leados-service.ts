import { createClient } from '@/lib/supabase/server'
import type { LeadStatus } from '@/lib/features/dealer/dealer-analytics-service'
import type { LeadOSLead, LeadOSBucket, SellerLeadOSData } from './leados-types'
import { computeLeadStats, getLeadBucket, SLA_MS } from './leados-metrics'

const DEMO_MODE = process.env.DEMO_MODE === 'true'

type DbLeadRow = {
  id: string
  conversation_id: string | null
  listing_id: string | null
  buyer_name: string
  buyer_phone: string
  source?: string | null
  status: LeadStatus | null
  created_at: string
  first_response_at: string | null
  assigned_to: string | null
  organization_id: string
  listing?: {
    title?: string | null
    make?: string | null
    model?: string | null
    year?: number | null
    status?: string | null
  } | null
}

function emptySellerLeadOSData(now: Date): SellerLeadOSData {
  return {
    nowIso: now.toISOString(),
    stats: {
      missedCount: 0,
      newCount: 0,
      activeCount: 0,
      averageResponseTimeMs: null,
      averageResponseTimeMsLast10: null,
      respondedCount: 0,
      respondedWithinSlaCount: 0,
      percentWithinSla: null,
      slaStatus: 'no-data',
    },
    leadsByBucket: {
      missed: [],
      new: [],
      active: [],
    },
  }
}

function buildListingSubtitle(row: DbLeadRow): string | null {
  const make = row.listing?.make?.trim() || ''
  const model = row.listing?.model?.trim() || ''
  const year = row.listing?.year

  const parts: string[] = []
  if (make) parts.push(make)
  if (model) parts.push(model)
  if (year) parts.push(String(year))

  return parts.length > 0 ? parts.join(' ') : null
}

function mapDbLeadToLeadOS(row: DbLeadRow, bucket: LeadOSBucket): LeadOSLead {
  const createdAtIso = new Date(row.created_at).toISOString()
  const createdMs = new Date(createdAtIso).getTime()
  const slaDeadline = new Date(createdMs + SLA_MS).toISOString()

  const listingTitle =
    row.listing?.title?.trim() ||
    buildListingSubtitle(row) ||
    'Lead utan aktiv annons'

  return {
    id: row.id,
    conversationId: row.conversation_id,
    listingId: row.listing_id,
    listingTitle,
    listingSubtitle: buildListingSubtitle(row),
    buyerName: row.buyer_name,
    buyerPhone: row.buyer_phone,
    source: row.source ?? null,
    status:
      row.status === 'contacted' ||
      row.status === 'qualified' ||
      row.status === 'sold' ||
      row.status === 'archived' ||
      row.status === 'new'
        ? row.status
        : 'new',
    createdAt: createdAtIso,
    firstResponseAt: row.first_response_at,
    assignedToProfileId: row.assigned_to,
    organizationId: row.organization_id,
    bucket,
    slaDeadline,
  }
}

function buildDemoData(now: Date, userId: string, organizationId: string): SellerLeadOSData {
  const baseCreated = new Date(now.getTime() - 40 * 60 * 1000) // 40 min sedan

  const rows: DbLeadRow[] = [
    // Missed (äldre än 15 min, inget svar)
    {
      id: 'demo-missed-1',
      conversation_id: 'demo-conv-1',
      listing_id: 'demo-listing-1',
      buyer_name: 'Anna Andersson',
      buyer_phone: '070-123 45 67',
      source: 'guest_form',
      status: 'new',
      created_at: new Date(baseCreated.getTime()).toISOString(),
      first_response_at: null,
      assigned_to: userId,
      organization_id: organizationId,
      listing: { title: 'Volvo XC60 T8 AWD', make: 'Volvo', model: 'XC60', year: 2021 },
    },
    {
      id: 'demo-missed-2',
      conversation_id: 'demo-conv-2',
      listing_id: 'demo-listing-2',
      buyer_name: 'Bilförmedlingen AB',
      buyer_phone: '08-555 55 55',
      source: 'guest_form',
      status: 'new',
      created_at: new Date(baseCreated.getTime() - 20 * 60 * 1000).toISOString(),
      first_response_at: null,
      assigned_to: userId,
      organization_id: organizationId,
      listing: { title: 'BMW 320d Touring xDrive', make: 'BMW', model: '320d', year: 2019 },
    },
    // New (inom 15 min, inget svar)
    {
      id: 'demo-new-1',
      conversation_id: 'demo-conv-3',
      listing_id: 'demo-listing-3',
      buyer_name: 'Kalle Karlsson',
      buyer_phone: '073-333 44 55',
      source: 'chat_lead',
      status: 'new',
      created_at: new Date(now.getTime() - 5 * 60 * 1000).toISOString(),
      first_response_at: null,
      assigned_to: userId,
      organization_id: organizationId,
      listing: { title: 'Tesla Model 3 Long Range', make: 'Tesla', model: 'Model 3', year: 2022 },
    },
    {
      id: 'demo-new-2',
      conversation_id: 'demo-conv-4',
      listing_id: 'demo-listing-4',
      buyer_name: 'Maria Mobil',
      buyer_phone: '076-777 88 99',
      source: 'chat_lead',
      status: 'new',
      created_at: new Date(now.getTime() - 10 * 60 * 1000).toISOString(),
      first_response_at: null,
      assigned_to: userId,
      organization_id: organizationId,
      listing: { title: 'Volkswagen ID.4 Pro', make: 'Volkswagen', model: 'ID.4', year: 2023 },
    },
    // Active (besvarade leads)
    {
      id: 'demo-active-1',
      conversation_id: 'demo-conv-5',
      listing_id: 'demo-listing-5',
      buyer_name: 'Sara Snabb',
      buyer_phone: '070-999 00 11',
      source: 'chat_lead',
      status: 'contacted',
      created_at: new Date(now.getTime() - 25 * 60 * 1000).toISOString(),
      first_response_at: new Date(now.getTime() - 20 * 60 * 1000).toISOString(),
      assigned_to: userId,
      organization_id: organizationId,
      listing: { title: 'Audi Q5 40 TDI quattro', make: 'Audi', model: 'Q5', year: 2020 },
    },
    {
      id: 'demo-active-2',
      conversation_id: 'demo-conv-6',
      listing_id: 'demo-listing-6',
      buyer_name: 'Demo Demo',
      buyer_phone: '070-000 00 00',
      source: 'guest_form',
      status: 'qualified',
      created_at: new Date(now.getTime() - 60 * 60 * 1000).toISOString(),
      first_response_at: new Date(now.getTime() - 50 * 60 * 1000).toISOString(),
      assigned_to: userId,
      organization_id: organizationId,
      listing: { title: 'Skoda Octavia Combi', make: 'Skoda', model: 'Octavia', year: 2018 },
    },
  ]

  const leads: LeadOSLead[] = rows.map((row) => {
    const bucket = getLeadBucket(
      {
        status: row.status ?? 'new',
        createdAt: row.created_at,
        firstResponseAt: row.first_response_at,
      },
      now
    )
    return mapDbLeadToLeadOS(row, bucket)
  })

  const statsBase = computeLeadStats(leads, now)
  // Demo: snitt svarstid för de två "aktiva" leadsen (20 min och 50 min efter created).
  const avgLast10 =
    statsBase.respondedCount >= 1
      ? (20 * 60 * 1000 + 50 * 60 * 1000) / 2
      : null
  const stats = { ...statsBase, averageResponseTimeMsLast10: avgLast10 }

  const missed = leads.filter((l) => l.bucket === 'missed')
  const freshNew = leads.filter((l) => l.bucket === 'new')
  const active = leads.filter((l) => l.bucket === 'active')

  return {
    nowIso: now.toISOString(),
    stats,
    leadsByBucket: {
      missed,
      new: freshNew,
      active,
    },
  }
}

export async function getSellerLeadOSData(userId: string): Promise<SellerLeadOSData> {
  const now = new Date()

  const supabase = await createClient()
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, organization_id')
    .eq('id', userId)
    .single()

  if (profileError) {
    console.error('[leados] Failed to load profile for seller mode', profileError.message)
    return emptySellerLeadOSData(now)
  }

  const organizationId =
    (profile as { organization_id?: string | null } | null)?.organization_id ?? null

  if (!organizationId) {
    // Ingen organization = ingen seller mode (privata användare).
    return emptySellerLeadOSData(now)
  }

  if (DEMO_MODE) {
    return buildDemoData(now, userId, organizationId)
  }

  const { data, error } = await supabase
    .from('leads')
    .select(
      'id, conversation_id, listing_id, buyer_name, buyer_phone, source, status, created_at, first_response_at, assigned_to, organization_id, listing:listings(title, make, model, year, status)'
    )
    .eq('organization_id', organizationId)
    .eq('assigned_to', userId)
    .order('created_at', { ascending: false })

  let rows: DbLeadRow[] = []

  if (error) {
    const message = error.message || ''

    // Graceful fallback när nya kolumner ännu inte finns i databasen
    // (t.ex. innan migration 20260306100000_leados_seller_mode_fields.sql har körts).
    if (
      message.includes('first_response_at') ||
      message.includes('assigned_to')
    ) {
      console.warn(
        '[leados] leads table saknar first_response_at/assigned_to – använder legacy-fråga utan dessa kolumner.'
      )
      const { data: legacyData, error: legacyError } = await supabase
        .from('leads')
        .select(
          'id, listing_id, buyer_name, buyer_phone, status, created_at, organization_id, listing:listings(title, make, model, year)'
        )
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false })

      if (legacyError) {
        console.error(
          '[leados] Failed to load leads for seller mode (legacy path)',
          legacyError.message
        )
        return emptySellerLeadOSData(now)
      }

      type LegacyLeadRow = {
        id: string
        listing_id: string | null
        buyer_name: string
        buyer_phone: string
        status: LeadStatus | null
        created_at: string
        organization_id: string
        listing?: DbLeadRow['listing']
      }

      const legacyRows = (legacyData ?? []) as LegacyLeadRow[]

      rows = legacyRows.map((row) => {
        const listing =
          // Supabase kan returnera relationer som array eller objekt beroende på query-shape
          Array.isArray(row.listing) ? row.listing[0] ?? null : row.listing ?? null

        const mapped: DbLeadRow = {
          id: row.id,
          conversation_id: null,
          listing_id: row.listing_id,
          buyer_name: row.buyer_name,
          buyer_phone: row.buyer_phone,
          source: null,
          status: row.status,
          created_at: row.created_at,
          first_response_at: null,
          assigned_to: null,
          organization_id: row.organization_id,
          listing,
        }

        return mapped
      })
    } else {
      console.error('[leados] Failed to load leads for seller mode', message)
      return emptySellerLeadOSData(now)
    }
  } else {
    rows =
      ((data ?? []) as DbLeadRow[]).filter((row) => {
        const normalizedStatus: LeadStatus =
          row.status === 'contacted' ||
          row.status === 'qualified' ||
          row.status === 'sold' ||
          row.status === 'archived' ||
          row.status === 'new'
            ? (row.status as LeadStatus)
            : 'new'
        const listingStatus = row.listing?.status ?? null
        const isSoldOrArchived =
          normalizedStatus === 'sold' || normalizedStatus === 'archived'
        const isSoldListing = listingStatus === 'sold'
        return !isSoldOrArchived && !isSoldListing
      }) as DbLeadRow[]
  }

  if (rows.length === 0) {
    return emptySellerLeadOSData(now)
  }

  const leads: LeadOSLead[] = rows.map((row) => {
    const bucket = getLeadBucket(
      {
        status: row.status ?? 'new',
        createdAt: row.created_at,
        firstResponseAt: row.first_response_at,
      },
      now
    )
    return mapDbLeadToLeadOS(row, bucket)
  })

  const statsBase = computeLeadStats(leads, now)

  // Beräkna snitt-svarstid för de 10 senaste besvarade leadsen (baserat på first_response_at).
  const respondedRows = rows.filter((r) => r.first_response_at)
  respondedRows.sort((a, b) => {
    const aTs = new Date(a.first_response_at as string).getTime()
    const bTs = new Date(b.first_response_at as string).getTime()
    return bTs - aTs
  })
  const last10 = respondedRows.slice(0, 10)
  let averageResponseTimeMsLast10: number | null = null
  if (last10.length > 0) {
    let totalMs = 0
    let counted = 0
    for (const r of last10) {
      const created = new Date(r.created_at).getTime()
      const first = new Date(r.first_response_at as string).getTime()
      if (!Number.isFinite(created) || !Number.isFinite(first) || first <= created) continue
      totalMs += first - created
      counted += 1
    }
    if (counted > 0) {
      averageResponseTimeMsLast10 = totalMs / counted
    }
  }

  const stats = {
    ...statsBase,
    averageResponseTimeMsLast10,
  }

  const missed = leads.filter((l) => l.bucket === 'missed')
  const freshNew = leads.filter((l) => l.bucket === 'new')
  const active = leads.filter((l) => l.bucket === 'active')

  return {
    nowIso: now.toISOString(),
    stats,
    leadsByBucket: {
      missed,
      new: freshNew,
      active,
    },
  }
}

