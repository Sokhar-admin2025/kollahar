import { redirect } from 'next/navigation'
import { unstable_noStore } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getSellerLeadOSData } from '@/lib/features/leados/leados-service'
import SellerDashboardClient from './SellerDashboardClient'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function SellerDashboardPage() {
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
    .select('account_type, organization_id, full_name')
    .eq('id', user.id)
    .single()

  const accountType = (profile as { account_type?: string } | null)?.account_type
  const organizationId =
    (profile as { organization_id?: string | null } | null)?.organization_id ?? null

  // Endast användare kopplade till en organisation (företag) har tillgång till Seller Mode.
  if (accountType !== 'company' || !organizationId) {
    redirect('/dashboard')
  }

  const sellerName = (profile as { full_name?: string | null } | null)?.full_name ?? 'Säljare'

  const data = await getSellerLeadOSData(user.id)

  return (
    <SellerDashboardClient
      sellerName={sellerName}
      data={data}
    />
  )
}

