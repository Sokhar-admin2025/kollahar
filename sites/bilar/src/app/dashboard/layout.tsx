import { createClient } from '../../lib/supabase/server'
import { getOrganization } from '../../lib/features/bilar-organization-service'
import { Sidebar } from './_components/Sidebar'
import { Topbar } from './_components/Topbar'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const org = await getOrganization(supabase)

  const orgName = org?.name ?? 'Mitt företag'
  const logoUrl = org?.logo_url ?? null

  return (
    <div className="flex min-h-screen" style={{ background: '#F7F8FA' }}>
      <Sidebar />
      <div className="flex flex-col flex-1 min-w-0">
        <Topbar orgName={orgName} logoUrl={logoUrl} />
        <main className="flex-1 p-5 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
