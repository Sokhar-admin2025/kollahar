import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getUserListings } from '@/lib/features/listings/listing-service'
import DashboardClient from '@/app/components/DashboardClient'

export default async function DashboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const result = await getUserListings(user.id)
  const listings = result.success && result.data ? result.data : []

  return (
    <DashboardClient
      listings={listings}
      user={{ id: user.id, email: user.email ?? undefined }}
    />
  )
}
