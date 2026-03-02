import { supabaseAdmin } from '@/lib/supabase/admin'
import { triggerLeadNotification } from '@/app/actions/lead-notification-action'
import { SLA_MS } from './leados-metrics'

/** 10 minuter – leads som är minst så gamla men fortfarande inom SLA fönstret får en nudge. */
const SLA_WARNING_WINDOW_START_MS = 10 * 60 * 1000

/**
 * Hitta leads som är i "SLA-varningsfönstret": status=new, assigned_to satt,
 * first_response_at NULL, skapade för 10–15 min sedan.
 * Anropar triggerLeadNotification(type: 'sla_warning') för varje.
 * Endast för server/cron – använd service role. Alla frågor begränsade per organization_id.
 */
export async function checkLeadSlaStatusForAllOrgs(): Promise<{
  processed: number
  notified: number
  errors: string[]
}> {
  const errors: string[] = []
  let notified = 0

  if (!supabaseAdmin) {
    console.warn('[leados-sla-check] supabaseAdmin saknas')
    return { processed: 0, notified: 0, errors: ['Supabase admin client saknas.'] }
  }

  const now = new Date()
  const nowMs = now.getTime()
  const deadlineMinMs = nowMs - SLA_MS // created_at måste vara efter detta (inom 15 min)
  const windowStartMs = nowMs - SLA_WARNING_WINDOW_START_MS // created_at måste vara före detta (minst 10 min gamla)

  const { data: rows, error } = await supabaseAdmin
    .from('leads')
    .select('id, organization_id, assigned_to, created_at')
    .eq('status', 'new')
    .not('assigned_to', 'is', null)
    .is('first_response_at', null)
    .lt('created_at', new Date(windowStartMs).toISOString())
    .gt('created_at', new Date(deadlineMinMs).toISOString())

  if (error) {
    console.error('[leados-sla-check] Query error:', error.message)
    return { processed: 0, notified: 0, errors: [error.message] }
  }

  const leads = (rows ?? []) as Array<{
    id: string
    organization_id: string
    assigned_to: string
    created_at: string
  }>

  for (const lead of leads) {
    try {
      await triggerLeadNotification({
        type: 'sla_warning',
        leadId: lead.id,
        organizationId: lead.organization_id,
        assignedToProfileId: lead.assigned_to,
      })
      notified += 1
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      errors.push(`Lead ${lead.id}: ${msg}`)
    }
  }

  return {
    processed: leads.length,
    notified,
    errors,
  }
}
