import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getUserListings, getFavoriteListings } from '@/lib/features/listings/listing-service'
import { getUnreadConversationIds } from '@/lib/features/messages/message-service'
import DashboardClient from '@/app/components/DashboardClient'

export default async function DashboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const [listingsResult, favoritesResult, unreadSet] = await Promise.all([
    getUserListings(user.id),
    getFavoriteListings(user.id),
    getUnreadConversationIds(user.id),
  ])

  const listings = listingsResult.success && listingsResult.data ? listingsResult.data : []
  const favoriteListings =
    favoritesResult.success && favoritesResult.data ? favoritesResult.data : []
  const hasUnreadMessages = unreadSet.size > 0

  return (
    <DashboardClient
      listings={listings}
      favoriteListings={favoriteListings}
      user={{ id: user.id, email: user.email ?? undefined }}
      hasUnreadMessages={hasUnreadMessages}
    />
  )
}
