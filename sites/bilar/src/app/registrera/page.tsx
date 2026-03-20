'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff } from 'lucide-react'
import { createClient } from '../../lib/supabase/client'

// Strippar protocol, www och sökväg — returnerar bare domän (t.ex. "goteborgbil.se")
function extractDomain(input: string): string {
  let domain = input.trim().toLowerCase()
  domain = domain.replace(/^https?:\/\//i, '')
  domain = domain.replace(/^www\./i, '')
  const slashIndex = domain.indexOf('/')
  if (slashIndex !== -1) domain = domain.slice(0, slashIndex)
  return domain
}

function emailMatchesDomain(email: string, domain: string): boolean {
  const atIndex = email.indexOf('@')
  if (atIndex === -1) return false
  return email.slice(atIndex + 1).toLowerCase() === domain
}

const STEPS = ['Kontouppgifter', 'Företagsinfo', 'Bekräftelse']

export default function RegistreraPage() {
  const router = useRouter()

  const [website, setWebsite] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const extractedDomain = extractDomain(website)
  const showDomainHint = extractedDomain.length > 0

  const emailMismatch =
    email.includes('@') &&
    extractedDomain.length > 0 &&
    !emailMatchesDomain(email, extractedDomain)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!extractedDomain) {
      setError('Ange en giltig webbadress.')
      return
    }
    if (emailMismatch) {
      setError(`E-postens domän måste matcha webbadressens domän (${extractedDomain}).`)
      return
    }
    if (password.length < 8) {
      setError('Lösenordet måste vara minst 8 tecken.')
      return
    }

    setLoading(true)
    const supabase = createClient()

    const { error: signUpError } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: { website: extractedDomain, account_type: 'company' },
      },
    })

    setLoading(false)

    if (signUpError) {
      setError(signUpError.message)
      return
    }

    // Spara e-post och lösenord i sessionStorage — läses av verifiera-sidan
    try {
      sessionStorage.setItem('bilar_signup_email', email.trim())
      sessionStorage.setItem('signup_password_pending_verify', password)
    } catch {
      // sessionStorage kan vara blockerat i vissa privata lägen — fortsätt ändå
    }

    router.push(`/registrera/verifiera?email=${encodeURIComponent(email.trim())}`)
  }

  return (
    <main className="min-h-screen bg-bg-page flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">

        {/* Progress-indikator */}
        <div className="flex items-center mb-8">
          {STEPS.map((label, index) => {
            const step = index + 1
            const active = step === 1
            return (
              <div key={step} className="flex items-center flex-1 last:flex-none">
                <div className="flex flex-col items-center gap-1">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold shrink-0 transition-colors ${
                      active
                        ? 'bg-brand-blue text-white'
                        : 'bg-border-standard text-text-hint'
                    }`}
                  >
                    {step}
                  </div>
                  <span className={`text-xs whitespace-nowrap ${active ? 'text-brand-blue font-medium' : 'text-text-hint'}`}>
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

        {/* Formulärkort */}
        <div
          className="bg-bg-card rounded-xl border border-border-standard"
          style={{ padding: '18px' }}
        >
          <h1 className="text-xl font-bold text-text-primary mb-1">Skapa konto</h1>
          <p className="text-sm text-text-secondary mb-6">Steg 1 av 3 — Kontouppgifter</p>

          <form onSubmit={handleSubmit} className="space-y-4">

            {/* Webbadress */}
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">
                Webbadress
              </label>
              <input
                type="text"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                placeholder="www.goteborgbil.se"
                autoComplete="url"
                className="w-full px-3 py-2.5 border border-border-standard rounded-lg text-sm text-text-primary placeholder:text-text-hint focus:outline-none focus:ring-2 focus:ring-brand-blue focus:border-brand-blue transition"
              />
              {showDomainHint && (
                <p className="mt-1.5 text-xs text-success font-medium">
                  Domän: {extractedDomain}
                </p>
              )}
            </div>

            {/* E-post */}
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">
                E-post
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={extractedDomain ? `info@${extractedDomain}` : 'info@dittforetag.se'}
                autoComplete="email"
                className={`w-full px-3 py-2.5 border rounded-lg text-sm text-text-primary placeholder:text-text-hint focus:outline-none focus:ring-2 transition ${
                  emailMismatch
                    ? 'border-danger focus:ring-danger/30 focus:border-danger'
                    : 'border-border-standard focus:ring-brand-blue focus:border-brand-blue'
                }`}
              />
              {emailMismatch && (
                <p className="mt-1.5 text-xs text-danger" role="alert">
                  E-postadressen måste ha samma domän som webbadress ({extractedDomain}).
                </p>
              )}
            </div>

            {/* Lösenord */}
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">
                Lösenord
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minst 8 tecken"
                  autoComplete="new-password"
                  className="w-full px-3 py-2.5 pr-10 border border-border-standard rounded-lg text-sm text-text-primary placeholder:text-text-hint focus:outline-none focus:ring-2 focus:ring-brand-blue focus:border-brand-blue transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-hint hover:text-text-secondary transition"
                  aria-label={showPassword ? 'Dölj lösenord' : 'Visa lösenord'}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
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
              disabled={loading}
              className="w-full py-2.5 bg-brand-blue hover:bg-brand-blue-hover text-white text-sm font-semibold rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Skapar konto...' : 'Fortsätt'}
            </button>
          </form>
        </div>
      </div>
    </main>
  )
}
