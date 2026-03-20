'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { createClient } from '../../../lib/supabase/client'
import { completeRegistrationAction } from '../../actions/registration-actions'

// Accepterar XXXXXX-XXXX eller XXXXXXXXXX — normaliseras till XXXXXX-XXXX vid sparning
const ORG_NUMBER_REGEX = /^(\d{6}-\d{4}|\d{10})$/

function normalizeOrgNumber(value: string): string {
  const digits = value.replace(/-/g, '')
  if (digits.length === 10) return `${digits.slice(0, 6)}-${digits.slice(6)}`
  return value
}

const STEPS = ['Kontouppgifter', 'Företagsinfo', 'Bekräftelse']

export default function ProfilPage() {
  const router = useRouter()

  const [userId, setUserId] = useState<string | null>(null)
  const [organizationId, setOrganizationId] = useState<string | null>(null)
  const [loadingUser, setLoadingUser] = useState(true)

  const [companyName, setCompanyName] = useState('')
  const [orgNumber, setOrgNumber] = useState('')
  const [address, setAddress] = useState('')
  const [city, setCity] = useState('')

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const orgNumberInvalid =
    orgNumber.trim().length > 0 && !ORG_NUMBER_REGEX.test(orgNumber.trim())

  // 1. Auth-kontroll vid mount
  useEffect(() => {
    const init = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        router.replace('/registrera')
        return
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('organization_id')
        .eq('id', user.id)
        .single()

      // organization_id kan vara null för nyregistrerade användare om verifiera-steget
      // inte hann sätta det. Använd user.id som fallback (konsekvent med multi-tenant-mönstret).
      const orgId = profile?.organization_id ?? user.id

      setUserId(user.id)
      setOrganizationId(orgId)
      setLoadingUser(false)
    }

    init()
  }, [router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!companyName.trim()) {
      setError('Företagsnamn är obligatoriskt.')
      return
    }
    if (!ORG_NUMBER_REGEX.test(orgNumber.trim())) {
      setError('Ange org-nummer i formatet 556123-4567 eller 5561234567')
      return
    }
    if (!address.trim()) {
      setError('Adress är obligatorisk.')
      return
    }
    if (!city.trim()) {
      setError('Stad är obligatorisk.')
      return
    }
    if (!userId || !organizationId) return

    setSaving(true)

    // Uppdatera organizations + profiles via server action (kräver service role för RLS-bypass)
    const result = await completeRegistrationAction(
      userId,
      organizationId,
      companyName.trim(),
      address.trim(),
      city.trim(),
      normalizeOrgNumber(orgNumber.trim())
    )

    if (!result.success) {
      setError(result.error ?? 'Kunde inte spara uppgifterna. Försök igen.')
      setSaving(false)
      return
    }

    router.push('/dashboard')
  }

  if (loadingUser) {
    return (
      <main className="min-h-screen bg-bg-page flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-brand-blue" />
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-bg-page flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">

        {/* Progress-indikator */}
        <div className="flex items-center mb-8">
          {STEPS.map((label, index) => {
            const step = index + 1
            const active = step === 3
            const done = step < 3
            return (
              <div key={step} className="flex items-center flex-1 last:flex-none">
                <div className="flex flex-col items-center gap-1">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold shrink-0 transition-colors ${
                      active
                        ? 'bg-brand-blue text-white'
                        : done
                        ? 'bg-success text-white'
                        : 'bg-border-standard text-text-hint'
                    }`}
                  >
                    {done ? '✓' : step}
                  </div>
                  <span className={`text-xs whitespace-nowrap ${active ? 'text-brand-blue font-medium' : done ? 'text-success' : 'text-text-hint'}`}>
                    {label}
                  </span>
                </div>
                {step < STEPS.length && (
                  <div className="flex-1 h-px bg-border-standard mx-2 mb-4" />
                )}
              </div>
            )
          })}
        </div>

        {/* Kort */}
        <div className="bg-bg-card rounded-xl border border-border-standard" style={{ padding: '18px' }}>
          <h1 className="text-xl font-bold text-text-primary mb-1">Berätta om ditt företag</h1>
          <p className="text-sm text-text-secondary mb-6">
            Detta visas på din handlarprofil och kan inte hoppas över.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">

            {/* Företagsnamn */}
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">
                Företagsnamn
              </label>
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="Göteborgs Bil AB"
                autoComplete="organization"
                className="w-full px-3 py-2.5 border border-border-standard rounded-lg text-sm text-text-primary placeholder:text-text-hint focus:outline-none focus:ring-2 focus:ring-brand-blue focus:border-brand-blue transition"
              />
            </div>

            {/* Org-nummer */}
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">
                Organisationsnummer
              </label>
              <input
                type="text"
                value={orgNumber}
                onChange={(e) => setOrgNumber(e.target.value)}
                placeholder="556123-4567"
                autoComplete="off"
                className={`w-full px-3 py-2.5 border rounded-lg text-sm text-text-primary placeholder:text-text-hint focus:outline-none focus:ring-2 transition ${
                  orgNumberInvalid
                    ? 'border-danger focus:ring-danger/30 focus:border-danger'
                    : 'border-border-standard focus:ring-brand-blue focus:border-brand-blue'
                }`}
              />
              {orgNumberInvalid && (
                <p className="mt-1.5 text-xs text-danger" role="alert">
                  Ange org-nummer i formatet 556123-4567 eller 5561234567
                </p>
              )}
            </div>

            {/* Adress */}
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">
                Adress
              </label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Bilgatan 1"
                autoComplete="street-address"
                className="w-full px-3 py-2.5 border border-border-standard rounded-lg text-sm text-text-primary placeholder:text-text-hint focus:outline-none focus:ring-2 focus:ring-brand-blue focus:border-brand-blue transition"
              />
            </div>

            {/* Stad */}
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">
                Stad
              </label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Göteborg"
                autoComplete="address-level2"
                className="w-full px-3 py-2.5 border border-border-standard rounded-lg text-sm text-text-primary placeholder:text-text-hint focus:outline-none focus:ring-2 focus:ring-brand-blue focus:border-brand-blue transition"
              />
            </div>

            {/* Felmeddelande */}
            {error && (
              <div
                className="p-3 rounded-lg bg-red-50 border border-danger/20 text-sm text-danger"
                role="alert"
              >
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={saving}
              className="w-full py-2.5 bg-brand-blue hover:bg-brand-blue-hover text-white text-sm font-semibold rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              {saving ? 'Sparar...' : 'Slutför registrering'}
            </button>
          </form>
        </div>
      </div>
    </main>
  )
}
