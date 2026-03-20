'use client'

import { usePathname, useRouter } from 'next/navigation'
import { Bell, LogOut } from 'lucide-react'
import { createClient } from '../../../lib/supabase/client'

const ROUTE_TITLES: Record<string, string> = {
  '/dashboard':                'Översikt',
  '/dashboard/leads':          'Leads',
  '/dashboard/annonser':       'Annonser',
  '/dashboard/statistik':      'Statistik',
  '/dashboard/installningar':  'Inställningar',
}

interface TopbarProps {
  orgName: string
  logoUrl: string | null
}

export function Topbar({ orgName, logoUrl }: TopbarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const title = ROUTE_TITLES[pathname] ?? 'Dashboard'

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <header
      className="flex items-center justify-between px-5 shrink-0 border-b"
      style={{
        height: '52px',
        background: '#FFFFFF',
        borderColor: '#E2E8F0',
      }}
    >
      {/* Sidtitel */}
      <h1 className="text-sm font-semibold" style={{ color: '#0F172A' }}>
        {title}
      </h1>

      {/* Höger: notis + företag */}
      <div className="flex items-center gap-3">

        {/* Notis-ikon med röd badge */}
        <button
          type="button"
          aria-label="Notiser"
          className="relative flex items-center justify-center w-8 h-8 rounded-lg transition hover:bg-bg-subtle"
        >
          <Bell size={16} strokeWidth={1.75} style={{ color: '#64748B' }} />
          <span
            className="absolute top-1 right-1 w-2 h-2 rounded-full"
            style={{ background: '#EF4444' }}
            aria-hidden
          />
        </button>

        {/* Företagsnamn + avatar */}
        <div className="flex items-center gap-2">
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center overflow-hidden shrink-0"
            style={{ background: '#EFF6FF', border: '1px solid #BFDBFE' }}
          >
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoUrl} alt={orgName} className="w-full h-full object-cover" />
            ) : (
              <span className="text-xs font-bold" style={{ color: '#2563EB' }}>
                {orgName.charAt(0).toUpperCase()}
              </span>
            )}
          </div>
          <span className="text-xs font-medium hidden sm:block" style={{ color: '#0F172A' }}>
            {orgName}
          </span>
        </div>

        {/* Utloggningsknapp */}
        <button
          type="button"
          onClick={handleSignOut}
          aria-label="Logga ut"
          title="Logga ut"
          className="flex items-center justify-center w-8 h-8 rounded-lg transition hover:bg-bg-subtle"
        >
          <LogOut size={16} strokeWidth={1.75} style={{ color: '#64748B' }} />
        </button>
      </div>
    </header>
  )
}
