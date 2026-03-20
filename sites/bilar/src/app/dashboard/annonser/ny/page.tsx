import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '../../../../lib/supabase/server'
import { createListing } from '../../../../lib/features/bilar-listings-service'
import type { BilarListingFormData } from '../../../../lib/features/bilar-listings-service'
import BilarListingForm from '../BilarListingForm'

export const dynamic = 'force-dynamic'
export const revalidate = 0

async function createListingAction(
  data: BilarListingFormData
): Promise<{ success: boolean; error?: string; id?: string }> {
  'use server'
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Ej autentiserad.' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id')
    .eq('id', user.id)
    .single()

  const organizationId = (profile as { organization_id?: string | null } | null)
    ?.organization_id
  if (!organizationId) return { success: false, error: 'Ingen organisation hittades.' }

  const result = await createListing(supabase, organizationId, user.id, data)
  if (result.success) revalidatePath('/dashboard/annonser')
  return result
}

export default async function NyAnnonsPage() {
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

  const organizationId = (profile as { organization_id?: string | null } | null)
    ?.organization_id
  if (!organizationId) redirect('/registrera')

  return (
    <div
      className="min-h-screen"
      style={{ background: '#F7F8FA', paddingLeft: '52px' }}
    >
      <div className="max-w-2xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-6">
          <a
            href="/dashboard/annonser"
            className="text-xs font-medium transition"
            style={{ color: '#64748B' }}
          >
            ← Tillbaka till annonser
          </a>
          <h1 className="text-xl font-bold mt-2" style={{ color: '#0F172A' }}>
            Skapa ny annons
          </h1>
          <p className="text-sm mt-0.5" style={{ color: '#94A3B8' }}>
            Fyll i informationen nedan och publicera när du är klar.
          </p>
        </div>

        <BilarListingForm
          organizationId={organizationId}
          userId={user.id}
          submitAction={createListingAction}
        />
      </div>
    </div>
  )
}
