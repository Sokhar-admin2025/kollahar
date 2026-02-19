import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getDealerDashboardData } from '@/lib/features/dealer/dealer-analytics-service'
import DealerDashboardClient from '@/app/components/DealerDashboardClient'

// Bypass Next.js cache – dashboard data must be fresh
export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function DealerDashboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('account_type, full_name, is_admin, parent_organization_id')
    .eq('id', user.id)
    .single()

  const accountType = (profile as { account_type?: string } | null)?.account_type
  if (accountType !== 'company') {
    redirect('/dashboard')
  }

  const companyName = (profile as { full_name?: string } | null)?.full_name ?? 'Företag'
  const isAdmin = (profile as { is_admin?: boolean } | null)?.is_admin ?? true
  const parentOrgId = (profile as { parent_organization_id?: string | null } | null)?.parent_organization_id ?? null
  const orgOwnerId = parentOrgId ?? user.id
  const userEmail = user.email?.trim() || null

  const data = await getDealerDashboardData(user.id, {
    orgOwnerId,
    isAdmin,
    userEmail,
  })

  return (
    <DealerDashboardClient
      companyName={companyName}
      data={data}
      userId={user.id}
      orgOwnerId={orgOwnerId}
    />
  )
}
