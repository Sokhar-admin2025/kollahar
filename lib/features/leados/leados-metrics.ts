import type { LeadStatus } from '@/lib/features/dealer/dealer-analytics-service'
import type { LeadOSBucket, LeadOSLead, LeadOSStats } from './leados-types'

export const SLA_MINUTES = 15
export const SLA_MS = SLA_MINUTES * 60 * 1000

export interface LeadTimingInput {
  status: LeadStatus | null | undefined
  createdAt: string
  firstResponseAt: string | null
}

export function getLeadBucket(input: LeadTimingInput, now: Date): LeadOSBucket {
  const createdMs = new Date(input.createdAt).getTime()
  const nowMs = now.getTime()
  const ageMs = Math.max(0, nowMs - createdMs)
  const hasResponse = !!input.firstResponseAt

  if (input.status === 'new' && !hasResponse) {
    if (ageMs > SLA_MS) return 'missed'
    return 'new'
  }

  return 'active'
}

export function computeLeadStats(leads: LeadOSLead[], now: Date): LeadOSStats {
  const missedCount = leads.filter((l) => l.bucket === 'missed').length
  const newCount = leads.filter((l) => l.bucket === 'new').length
  const activeCount = leads.filter((l) => l.bucket === 'active').length

  let totalResponseMs = 0
  let respondedCount = 0
  let respondedWithinSlaCount = 0

  for (const lead of leads) {
    if (!lead.firstResponseAt) continue

    const createdMs = new Date(lead.createdAt).getTime()
    const firstRespMs = new Date(lead.firstResponseAt).getTime()
    if (!Number.isFinite(createdMs) || !Number.isFinite(firstRespMs)) continue

    const diff = Math.max(0, firstRespMs - createdMs)
    totalResponseMs += diff
    respondedCount += 1
    if (diff <= SLA_MS) {
      respondedWithinSlaCount += 1
    }
  }

  if (respondedCount === 0) {
    return {
      missedCount,
      newCount,
      activeCount,
      averageResponseTimeMs: null,
      respondedCount,
      respondedWithinSlaCount,
      percentWithinSla: null,
      slaStatus: 'no-data',
    }
  }

  const averageResponseTimeMs = totalResponseMs / respondedCount
  const percentWithinSla = (respondedWithinSlaCount / respondedCount) * 100

  let slaStatus: LeadOSStats['slaStatus']
  if (percentWithinSla >= 80) {
    slaStatus = 'good'
  } else if (percentWithinSla >= 50) {
    slaStatus = 'warn'
  } else {
    slaStatus = 'bad'
  }

  return {
    missedCount,
    newCount,
    activeCount,
    averageResponseTimeMs,
    respondedCount,
    respondedWithinSlaCount,
    percentWithinSla,
    slaStatus,
  }
}

/**
 * QA-checklista (LeadOS Seller Mode SLA / response stats)
 *
 * 1) 0 leads
 *    - SLA-kort visar neutral färg
 *    - Text: "Ingen data ännu" och "0 av 0 svar inom 15 min"
 *    - averageResponseTimeMs = null, percentWithinSla = null, slaStatus = 'no-data'
 *
 * 2) 1 lead, ny, <15 min, ej svar
 *    - newCount = 1, missedCount = 0
 *    - respondedCount = 0, percentWithinSla = null, slaStatus = 'no-data'
 *
 * 3) Markera lead som kontaktad inom 15 min
 *    - first_response_at sätts (via statusupdate eller första meddelande)
 *    - respondedCount = 1
 *    - percentWithinSla ≈ 100, slaStatus = 'good'
 *    - averageResponseTimeMs motsvarar 1–15 min
 *    - lead flyttar från 'new' till 'active'
 *
 * 4) Lead äldre än 15 min utan svar
 *    - bucket = 'missed' → missedCount = 1
 *
 * 5) Första meddelandet i chatten
 *    - Om lead.first_response_at var NULL, sätts till now()
 *    - respondedCount/percentWithinSla uppdateras vid nästa fetch till Seller Mode
 */

