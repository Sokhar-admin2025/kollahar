import { redirect } from 'next/navigation'
import { unstable_noStore, revalidatePath } from 'next/cache'
import { createClient } from '../../../lib/supabase/server'
import {
  getListings,
  updateListingStatus,
  deleteListing,
} from '../../../lib/features/bilar-listings-service'
import type { ListingStatus } from '../../../lib/features/bilar-listings-service'
import BilarInventoryClient from './BilarInventoryClient'

export const dynamic = 'force-dynamic'
export const revalidate = 0

// ─── Server Actions ───────────────────────────────────────────────────────────

async function updateStatusAction(
  listingId: string,
  organizationId: string,
  status: 'active' | 'paused' | 'sold'
): Promise<{ success: boolean; error?: string }> {
  'use server'
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Ej autentiserad.' }

  const result = await updateListingStatus(supabase, listingId, organizationId, status)
  if (result.success) revalidatePath('/dashboard/annonser')
  return result
}

async function deleteListingAction(
  listingId: string,
  organizationId: string
): Promise<{ success: boolean; error?: string }> {
  'use server'
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Ej autentiserad.' }

  const result = await deleteListing(supabase, listingId, organizationId)
  if (result.success) revalidatePath('/dashboard/annonser')
  return result
}

// ─── Page ─────────────────────────────────────────────────────────────────────

interface AnnonserPageProps {
  searchParams: Promise<{
    status?: string
    make?: string
  }>
}

export default async function AnnonserPage({ searchParams }: AnnonserPageProps) {
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

  const validStatuses: ListingStatus[] = ['active', 'paused', 'sold', 'draft']
  const statusFilter =
    params.status && validStatuses.includes(params.status as ListingStatus)
      ? (params.status as ListingStatus)
      : 'all'

  const listings = await getListings(supabase, organizationId, {
    status: statusFilter as ListingStatus | 'all',
    make: params.make?.trim() || undefined,
  })

  return (
    <BilarInventoryClient
      listings={listings}
      organizationId={organizationId}
      initialFilters={{
        status: params.status || 'all',
        make: params.make || '',
      }}
      updateStatusAction={updateStatusAction}
      deleteListingAction={deleteListingAction}
    />
  )
}
