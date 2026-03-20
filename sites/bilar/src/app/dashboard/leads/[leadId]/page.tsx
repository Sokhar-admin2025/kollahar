import { notFound, redirect } from 'next/navigation'
import { unstable_noStore, revalidatePath } from 'next/cache'
import { createClient } from '../../../../lib/supabase/server'
import {
  getLead,
  sendLeadMessage,
  updateLeadStatus,
  updateInternalNote,
  getOrganizationMembers,
  reassignLead,
} from '../../../../lib/features/bilar-leads-service'
import type { LeadStatus } from '../../../../lib/features/bilar-leads-service'
import BilarLeadDetailClient from './BilarLeadDetailClient'

export const dynamic = 'force-dynamic'
export const revalidate = 0

// ─── Server Actions ───────────────────────────────────────────────────────────

async function sendMessageAction(
  leadId: string,
  organizationId: string,
  content: string,
  authorProfileId: string
): Promise<{ success: boolean; error?: string; messageId?: string; createdAt?: string }> {
  'use server'
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Ej autentiserad.' }

  const result = await sendLeadMessage(supabase, leadId, organizationId, content, authorProfileId)
  if (!result.success) return { success: false, error: result.error }
  revalidatePath(`/dashboard/leads/${leadId}`)
  return { success: true, messageId: result.message.id, createdAt: result.message.created_at }
}

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
  if (result.success) revalidatePath(`/dashboard/leads/${leadId}`)
  return result
}

async function saveNoteAction(
  leadId: string,
  organizationId: string,
  note: string
): Promise<{ success: boolean; error?: string }> {
  'use server'
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Ej autentiserad.' }

  return updateInternalNote(supabase, leadId, organizationId, note)
}

async function reassignAction(
  leadId: string,
  organizationId: string,
  newAssigneeProfileId: string
): Promise<{ success: boolean; error?: string }> {
  'use server'
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Ej autentiserad.' }

  const result = await reassignLead(
    supabase,
    leadId,
    organizationId,
    newAssigneeProfileId,
    user.id
  )
  if (result.success) revalidatePath(`/dashboard/leads/${leadId}`)
  return result
}

// ─── Page ─────────────────────────────────────────────────────────────────────

interface LeadDetailPageProps {
  params: Promise<{ leadId: string }>
}

export default async function LeadDetailPage({ params }: LeadDetailPageProps) {
  unstable_noStore()
  const { leadId } = await params

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id, account_type')
    .eq('id', user.id)
    .single()

  const organizationId = (profile as { organization_id?: string | null } | null)?.organization_id
  if (!organizationId) redirect('/registrera')

  const [lead, orgMembers] = await Promise.all([
    getLead(supabase, leadId, organizationId),
    getOrganizationMembers(supabase, organizationId),
  ])
  if (!lead) notFound()

  // Commander-vyn visas för alla company-användare inom org
  const isOwner = (profile as { account_type?: string } | null)?.account_type === 'company'

  return (
    <BilarLeadDetailClient
      lead={lead}
      currentUserId={user.id}
      organizationId={organizationId}
      nowIso={new Date().toISOString()}
      orgMembers={orgMembers}
      isOwner={isOwner}
      sendMessageAction={sendMessageAction}
      updateStatusAction={updateStatusAction}
      saveNoteAction={saveNoteAction}
      reassignAction={reassignAction}
    />
  )
}
