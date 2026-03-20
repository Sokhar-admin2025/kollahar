import { redirect } from 'next/navigation'
import { unstable_noStore, revalidatePath } from 'next/cache'
import { createClient } from '../../../lib/supabase/server'
import { getLeads, updateLeadStatus } from '../../../lib/features/bilar-leads-service'
import type { LeadStatus, SourceSite } from '../../../lib/features/bilar-leads-service'
import BilarLeadsClient from './BilarLeadsClient'

export const dynamic = 'force-dynamic'
export const revalidate = 0

// ─── Server Action ────────────────────────────────────────────────────────────

async function updateStatusAction(
  leadId: string,
  status: LeadStatus,
  organizationId: string
): Promise<{ success: boolean; error?: string }> {
  'use server'
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Ej autentiserad.' }

  const result = await updateLeadStatus(supabase, leadId, status, organizationId)
  if (result.success) revalidatePath('/dashboard/leads')
  return result
}

// ─── Page ─────────────────────────────────────────────────────────────────────

interface LeadsPageProps {
  searchParams: Promise<{
    status?: string
    source?: string
    make?: string
    from?: string
    to?: string
  }>
}

export default async function LeadsPage({ searchParams }: LeadsPageProps) {
  unstable_noStore()

  const params = await searchParams
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id')
    .eq('id', user.id)
    .single()

  const organizationId = (profile as { organization_id?: string | null } | null)?.organization_id
  if (!organizationId) redirect('/registrera')

  const validStatuses: LeadStatus[] = ['new', 'contacted', 'qualified', 'sold', 'archived']
  const validSources: SourceSite[] = ['main', 'bilar', 'batar', 'lokaler']

  const leads = await getLeads(supabase, organizationId, {
    status:
      params.status && validStatuses.includes(params.status as LeadStatus)
        ? (params.status as LeadStatus)
        : 'all',
    source_site:
      params.source && validSources.includes(params.source as SourceSite)
        ? (params.source as SourceSite)
        : 'all',
    make: params.make?.trim() || undefined,
    date_from: params.from || undefined,
    date_to: params.to || undefined,
  })

  return (
    <BilarLeadsClient
      leads={leads}
      organizationId={organizationId}
      nowIso={new Date().toISOString()}
      initialFilters={{
        status: params.status || 'all',
        source: params.source || 'all',
        make: params.make || '',
        from: params.from || '',
        to: params.to || '',
      }}
      updateStatusAction={updateStatusAction}
    />
  )
}
