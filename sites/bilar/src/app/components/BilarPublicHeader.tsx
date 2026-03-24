'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { createClient } from '../../lib/supabase/client'

// 'full'       = inloggad handlare med aktiv bilar-registrering och ifylld profil → Dashboard
// 'incomplete' = inloggad men profil/registrering ofullständig → Slutför registrering
// 'none'       = ej inloggad eller privatperson → Logga in + Registrera handlare
type DealerStatus = 'loading' | 'full' | 'incomplete' | 'none'

export default function BilarPublicHeader() {
  const [status, setStatus] = useState<DealerStatus>('loading')

  useEffect(() => {
    const supabase = createClient()

    const loadStatus = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setStatus('none'); return }

      const { data: profile } = await supabase
        .from('profiles')
        .select('account_type, organization_id, profile_completed')
        .eq('id', user.id)
        .single()

      if (!profile || profile.account_type !== 'company') {
        setStatus('none'); return
      }

      if (!profile.organization_id || !profile.profile_completed) {
        setStatus('incomplete'); return
      }

      const { data: reg } = await supabase
        .from('organization_sites')
        .select('status')
        .eq('organization_id', profile.organization_id)
        .eq('site', 'bilar')
        .maybeSingle()

      setStatus(reg?.status === 'active' ? 'full' : 'incomplete')
    }

    loadStatus()
  }, [])

  return (
    <header
      className="sticky top-0 z-40 border-b"
      style={{ background: '#FFFFFF', borderColor: '#E2E8F0' }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center gap-4 h-14">
        {/* Logo */}
        <Link href="/" className="shrink-0 flex items-center gap-1.5">
          <span className="text-base font-bold" style={{ color: '#2563EB' }}>
            Kolla<span style={{ color: '#0F172A' }}>Bilar</span>
          </span>
        </Link>

        {/* Tagline (dold på mobil) */}
        <span className="hidden sm:block text-sm" style={{ color: '#94A3B8' }}>
          Annonser från verifierade bilhandlare
        </span>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Auth-knappar — renderas när status är känd */}
        <div className="flex items-center gap-2 shrink-0">
          {status === 'full' && (
            <Link
              href="/dashboard"
              className="px-3 py-1.5 rounded-lg text-sm font-medium transition"
              style={{ background: '#EFF6FF', color: '#2563EB' }}
            >
              Dashboard
            </Link>
          )}

          {status === 'incomplete' && (
            <Link
              href="/registrera/profil"
              className="px-3 py-1.5 rounded-lg text-sm font-medium transition hover:opacity-90"
              style={{ background: '#FEF3C7', color: '#92400E' }}
            >
              Slutför registrering
            </Link>
          )}

          {status === 'none' && (
            <>
              <Link
                href="/login"
                className="hidden sm:block text-sm font-medium transition hover:opacity-80"
                style={{ color: '#64748B' }}
              >
                Logga in
              </Link>
              <Link
                href="/registrera"
                className="px-3 py-1.5 rounded-lg text-sm font-semibold text-white transition hover:opacity-90"
                style={{ background: '#2563EB' }}
              >
                Registrera handlare
              </Link>
            </>
          )}
          {/* status === 'loading': ingen knapp visas (undviker flicker) */}
        </div>
      </div>
    </header>
  )
}
