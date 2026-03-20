'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Eye, EyeOff } from 'lucide-react'
import { createClient } from '../../lib/supabase/client'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const supabase = createClient()
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    })

    setLoading(false)

    if (signInError) {
      setError('Fel e-postadress eller lösenord. Försök igen.')
      return
    }

    // Full navigation — proxy kör med aktuell session och hanterar
    // redirect baserat på kontots status (dashboard, registrera/profil, etc.)
    window.location.href = '/dashboard'
  }

  return (
    <main className="min-h-screen bg-bg-page flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">

        {/* Logotyp */}
        <div className="text-center mb-8">
          <span className="text-2xl font-bold text-brand-blue tracking-tight">
            Kolla<span className="text-text-primary">Bilar</span>
          </span>
        </div>

        <div className="bg-bg-card rounded-xl border border-border-standard" style={{ padding: '18px' }}>
          <h1 className="text-xl font-bold text-text-primary mb-1">Logga in</h1>
          <p className="text-sm text-text-secondary mb-6">Välkommen tillbaka</p>

          <form onSubmit={handleSubmit} className="space-y-4">

            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">
                E-post
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="info@dittforetag.se"
                autoComplete="email"
                required
                className="w-full px-3 py-2.5 border border-border-standard rounded-lg text-sm text-text-primary placeholder:text-text-hint focus:outline-none focus:ring-2 focus:ring-brand-blue focus:border-brand-blue transition"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">
                Lösenord
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Ditt lösenord"
                  autoComplete="current-password"
                  required
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

            {error && (
              <div
                className="p-3 rounded-lg bg-red-50 border border-danger/20 text-sm text-danger"
                role="alert"
              >
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-brand-blue hover:bg-brand-blue-hover text-white text-sm font-semibold rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Loggar in...' : 'Logga in'}
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-text-secondary mt-6">
          Inget konto?{' '}
          <Link href="/registrera" className="text-brand-blue hover:underline font-medium">
            Registrera dig
          </Link>
        </p>
      </div>
    </main>
  )
}
