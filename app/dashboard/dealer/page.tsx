import { redirect } from 'next/navigation'
import { unstable_noStore } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getDealerDashboardData } from '@/lib/features/dealer/dealer-analytics-service'
import DealerDashboardClient from '@/app/components/DealerDashboardClient'

// Bypass Next.js cache – dashboard data must be fresh
export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function DealerDashboardPage() {
  unstable_noStore()
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('account_type, full_name, is_admin, parent_organization_id, organization_id')
    .eq('id', user.id)
    .single()

  const accountType = (profile as { account_type?: string } | null)?.account_type
  if (accountType !== 'company') {
    redirect('/dashboard')
  }

  const companyName = (profile as { full_name?: string } | null)?.full_name ?? 'Företag'
  const parentOrgId = (profile as { parent_organization_id?: string | null } | null)?.parent_organization_id ?? null
  const profileOrganizationId = (profile as { organization_id?: string | null } | null)?.organization_id ?? null
  const orgOwnerId = parentOrgId ?? user.id
  const organizationId = profileOrganizationId ?? orgOwnerId
  // Org owner ser alltid alla listningar; sub-users filtreras på contact_email
  const isAdmin = orgOwnerId === user.id ? true : ((profile as { is_admin?: boolean } | null)?.is_admin ?? true)
  const userEmail = user.email?.trim() || null

  const data = await getDealerDashboardData(user.id, {
    orgOwnerId,
    organizationId,
    isAdmin,
    userEmail,
  })

  console.log('[dealer-dashboard] orgOwnerId:', orgOwnerId, 'organizationId:', organizationId, 'Views from DB:', data.totalViews, 'avgHealth:', data.averageHealthPercent)

  return (
    <DealerDashboardClient
      companyName={companyName}
      data={data}
      userId={user.id}
      orgOwnerId={orgOwnerId}
    />
  )
}
