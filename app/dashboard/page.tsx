import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getUserListings, getFavoriteListings } from '@/lib/features/listings/listing-service'
import { getUnreadConversationIds } from '@/lib/features/messages/message-service'
import { getSellerLeadOSData } from '@/lib/features/leados/leados-service'
import { getDealerDashboardData } from '@/lib/features/dealer/dealer-analytics-service'
import DashboardClient from '@/app/components/DashboardClient'
import MissionControlClient from '@/app/dashboard/MissionControlClient'

export default async function DashboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const [listingsResult, favoritesResult, unreadSet, profileRes] = await Promise.all([
    getUserListings(user.id),
    getFavoriteListings(user.id),
    getUnreadConversationIds(user.id),
    supabase.from('profiles').select('account_type, organization_id, full_name').eq('id', user.id).single(),
  ])

  const listings = listingsResult.success && listingsResult.data ? listingsResult.data : []
  const favoriteListings =
    favoritesResult.success && favoritesResult.data ? favoritesResult.data : []
  const hasUnreadMessages = unreadSet.size > 0
  const accountType =
    (profileRes.data as { account_type?: string } | null)?.account_type ?? 'private'
  const organizationId =
    (profileRes.data as { organization_id?: string | null } | null)?.organization_id ?? null
  const fullName =
    (profileRes.data as { full_name?: string | null } | null)?.full_name?.trim() || null

  // Privat användare eller företag utan organisation -> befintlig dashboard-upplevelse.
  if (accountType !== 'company' || !organizationId) {
    return (
      <DashboardClient
        listings={listings}
        favoriteListings={favoriteListings}
        user={{ id: user.id, email: user.email ?? undefined }}
        hasUnreadMessages={hasUnreadMessages}
        accountType={accountType}
      />
    )
  }

  // Företagskonto med organisation -> Mission Control.
  const [sellerLeadData, dealerData] = await Promise.all([
    getSellerLeadOSData(user.id),
    getDealerDashboardData(user.id, {
      orgOwnerId: organizationId,
      organizationId,
      isAdmin: true,
      userEmail: user.email ?? null,
    }),
  ])

  const sellerName = fullName || user.email || 'Säljare'

  return (
    <MissionControlClient
      sellerName={sellerName}
      sellerLeadData={sellerLeadData}
      dealerData={dealerData}
      organizationId={organizationId}
    />
  )
}

