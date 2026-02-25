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

  const averageResponseTimeMs = respondedCount > 0 ? totalResponseMs / respondedCount : 0
  const percentWithinSla =
    respondedCount > 0 ? (respondedWithinSlaCount / respondedCount) * 100 : 0

  return {
    missedCount,
    newCount,
    activeCount,
    averageResponseTimeMs,
    respondedCount,
    respondedWithinSlaCount,
    percentWithinSla,
  }
}

