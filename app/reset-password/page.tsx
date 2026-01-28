'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { DASHBOARD_TEXTS } from '@/app/lib/content'
import Header from '@/app/components/organisms/Header'
import Button from '@/app/components/atoms/Button'
import { AUTH_CONFIG } from '@/lib/constants'

const supabase = createClient()

export default function ResetPasswordPage() {
  const router = useRouter()
  const t = DASHBOARD_TEXTS.settings.password

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ text: string; type: 'error' | 'success' } | null>(null)

  // Markera i profilen att användaren måste byta lösenord (force_password_change = true)
  useEffect(() => {
    const markForcePasswordChange = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        await supabase
          .from('profiles')
          .update({ force_password_change: true })
          .eq('id', user.id)
      } catch (err) {
        console.error('Kunde inte markera force_password_change:', err)
      }
    }

    markForcePasswordChange()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validering
    if (!password || !confirmPassword) {
      setMessage({ text: t.errors.required, type: 'error' })
      return
    }

    if (password.length < AUTH_CONFIG.MIN_PASSWORD_LENGTH) {
      setMessage({
        text: t.errors.minLength(AUTH_CONFIG.MIN_PASSWORD_LENGTH),
        type: 'error',
      })
      return
    }

    if (password !== confirmPassword) {
      setMessage({
        text: t.errors.mismatch,
        type: 'error',
      })
      return
    }

    setLoading(true)
    setMessage(null)

    try {
      const { error } = await supabase.auth.updateUser({
        password,
      })

      if (error) {
        const msg = String(error.message || '').toLowerCase()
        if (msg.includes('new password should be different')) {
          setMessage({
            text: t.errors.sameAsOld,
            type: 'error',
          })
        } else {
          setMessage({
            text: t.errors.generic,
            type: 'error',
          })
        }
        setLoading(false)
        return
      }

      // Nollställ force_password_change-flaggan i profilen
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          await supabase
            .from('profiles')
            .update({ force_password_change: false })
            .eq('id', user.id)
        }
      } catch (err) {
        console.error('Kunde inte nollställa force_password_change:', err)
      }

      setMessage({
        text: 'Ditt lösenord är nu uppdaterat. Du kan logga in med ditt nya lösenord.',
        type: 'success',
      })

      setTimeout(() => {
        router.push('/login')
      }, 1500)
    } catch (err) {
      console.error('Fel vid uppdatering av lösenord (reset):', err)
      setMessage({ text: 'Ett fel uppstod. Försök igen.', type: 'error' })
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-brand-beige">
      <Header />
      <div className="flex flex-col items-center justify-center flex-grow px-4">
        <div className="w-full max-w-md bg-white rounded-xl shadow-md p-8 border border-gray-200">
          <h1 className="text-2xl font-display text-brand-green text-center mb-2">
            {DASHBOARD_TEXTS.settings.password.title}
          </h1>
          <p className="text-sm text-brand-text/70 text-center mb-6">
            Ange ett nytt säkert lösenord för ditt konto.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {DASHBOARD_TEXTS.settings.password.newLabel}
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-brand-green focus:border-brand-green outline-none"
                autoComplete="new-password"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {DASHBOARD_TEXTS.settings.password.confirmLabel}
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-brand-green focus:border-brand-green outline-none"
                autoComplete="new-password"
              />
            </div>

            {message && (
              <div
                className={`p-3 rounded text-sm text-center ${
                  message.type === 'error' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                }`}
                role="alert"
                aria-live="polite"
              >
                {message.text}
              </div>
            )}

            <div className="pt-2">
              <Button type="submit" disabled={loading} className="w-full">
                {loading ? 'Uppdaterar...' : 'Spara nytt lösenord'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

