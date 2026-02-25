import type { LeadStatus } from '@/lib/features/dealer/dealer-analytics-service'

export type LeadOSBucket = 'missed' | 'new' | 'active'

export interface LeadOSLead {
  id: string
  listingId: string | null
  listingTitle: string
  listingSubtitle?: string | null
  buyerName: string
  buyerPhone: string
  status: LeadStatus
  createdAt: string
  firstResponseAt: string | null
  assignedToProfileId: string | null
  organizationId: string
  bucket: LeadOSBucket
  /** ISO-tidpunkt då 15-minuters-SLA löper ut (created_at + 15 min). */
  slaDeadline: string
}

export interface LeadOSStats {
  missedCount: number
  newCount: number
  activeCount: number
  /** Medeltid till första svar (ms) för leads där first_response_at är satt. */
  averageResponseTimeMs: number
  /** Antal leads där säljaren har svarat. */
  respondedCount: number
  /** Antal leads där första svaret kom inom SLA-fönstret. */
  respondedWithinSlaCount: number
  /** Andel (%) av besvarade leads som fått första svar inom SLA. */
  percentWithinSla: number
}

export interface SellerLeadOSData {
  /** Serverns nu-tid i ISO-format – används för countdowns på klienten. */
  nowIso: string
  stats: LeadOSStats
  leadsByBucket: {
    missed: LeadOSLead[]
    new: LeadOSLead[]
    active: LeadOSLead[]
  }
}

