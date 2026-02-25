import type { LeadStatus } from '@/lib/features/dealer/dealer-analytics-service'

export type LeadOSBucket = 'missed' | 'new' | 'active'

export interface LeadOSLead {
  id: string
  /** Kopplad konversation (kan vara null för gäst-leads utan chat). */
  conversationId: string | null
  listingId: string | null
  listingTitle: string
  listingSubtitle?: string | null
  buyerName: string
  buyerPhone: string
  /** Teknisk källa (guest_form, chat_lead, lead_card, ...). */
  source?: string | null
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
  /** Medeltid till första svar (ms) för leads där first_response_at är satt. Null när det saknas data. */
  averageResponseTimeMs: number | null
  /** Antal leads där säljaren har svarat. */
  respondedCount: number
  /** Antal leads där första svaret kom inom SLA-fönstret. */
  respondedWithinSlaCount: number
  /** Andel (%) av besvarade leads som fått första svar inom SLA. Null när respondedCount = 0. */
  percentWithinSla: number | null
  /** Sammanfattande SLA-status för UI. */
  slaStatus: 'no-data' | 'good' | 'warn' | 'bad'
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

