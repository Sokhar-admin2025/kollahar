import { notFound, redirect } from 'next/navigation'
import { unstable_noStore } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getLeadDetail } from '@/lib/features/leados/leados-lead-detail-service'
import { getLeadMessagesForLead } from '@/lib/features/leados/leados-lead-messages-service'
import { getLatestMessagesForConversation } from '@/lib/features/messages/message-service'
import LeadDetailClient from './LeadDetailClient'

interface LeadDetailPageProps {
  params: Promise<{ leadId: string }>
}

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function LeadDetailPage({ params }: LeadDetailPageProps) {
  unstable_noStore()
  const { leadId } = await params

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('account_type, organization_id')
    .eq('id', user.id)
    .single()

  const accountType = (profile as { account_type?: string } | null)?.account_type
  const organizationId =
    (profile as { organization_id?: string | null } | null)?.organization_id ?? null

  if (accountType !== 'company' || !organizationId) {
    redirect('/dashboard')
  }

  const lead = await getLeadDetail({ leadId })

  if (!lead) {
    notFound()
  }

  const [leadMessages, customerMessages] = await Promise.all([
    getLeadMessagesForLead(leadId, user.id),
    lead.conversationId
      ? getLatestMessagesForConversation(lead.conversationId)
      : Promise.resolve([]),
  ])

  return (
    <LeadDetailClient
      lead={lead}
      leadMessages={leadMessages}
      customerMessages={customerMessages}
      currentUserId={user.id}
    />
  )
}

