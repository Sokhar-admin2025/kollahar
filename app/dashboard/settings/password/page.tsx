'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { DASHBOARD_TEXTS } from '@/app/lib/content'
import { AUTH_CONFIG } from '@/lib/constants'
import Button from '@/app/components/atoms/Button'
import { buildReauthLoginUrl, hasRecentSignIn } from '@/lib/security/session-step-up'

const supabase = createClient()
const t = DASHBOARD_TEXTS.settings.password

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
}

export default function PasswordSettingsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [email, setEmail] = useState<string | null>(null)

  // Glömt lösenord
  const [forgotEmail, setForgotEmail] = useState('')
  const [forgotLoading, setForgotLoading] = useState(false)
  const [forgotMessage, setForgotMessage] = useState<{ text: string; type: 'error' | 'success' } | null>(null)

  // Byt lösenord
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [changeLoading, setChangeLoading] = useState(false)
  const [changeMessage, setChangeMessage] = useState<{ text: string; type: 'error' | 'success' } | null>(null)

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }
      setEmail(user.email ?? null)
      setForgotEmail(user.email ?? '')
      setLoading(false)
    }
    load()
  }, [router])

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!forgotEmail.trim()) {
      setForgotMessage({ text: 'Fyll i din e-postadress.', type: 'error' })
      return
    }
    if (!isValidEmail(forgotEmail)) {
      setForgotMessage({ text: DASHBOARD_TEXTS.auth.login.errors.invalidEmail ?? 'Ogiltig e-postadress.', type: 'error' })
      return
    }
    setForgotLoading(true)
    setForgotMessage(null)
    const cleanEmail = forgotEmail.trim()
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
        redirectTo: `${window.location.origin}/reset-password`,
      })
      if (error) {
        const text = error.message?.toLowerCase().includes('rate limit')
          ? 'För många försök. Vänta en stund och försök igen.'
          : 'Kunde inte skicka återställningslänk. Försök igen senare.'
        setForgotMessage({ text, type: 'error' })
      } else {
        setForgotMessage({
          text: 'Vi har skickat en länk för att byta lösenord till din e-post. Kolla din inkorg.',
          type: 'success',
        })
      }
    } catch (err) {
      console.error('resetPasswordForEmail:', err)
      setForgotMessage({ text: 'Ett oväntat fel uppstod. Försök igen.', type: 'error' })
    } finally {
      setForgotLoading(false)
    }
  }

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) return
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user || !hasRecentSignIn(user.last_sign_in_at)) {
      setChangeMessage({
        text: 'Av säkerhetsskäl behöver du logga in igen innan du kan byta lösenord.',
        type: 'error',
      })
      router.push(buildReauthLoginUrl('/dashboard/settings/password'))
      return
    }
    if (!currentPassword || !newPassword || !confirmPassword) {
      setChangeMessage({ text: t.errors.required, type: 'error' })
      return
    }
    if (newPassword.length < AUTH_CONFIG.MIN_PASSWORD_LENGTH) {
      setChangeMessage({ text: t.errors.minLength(AUTH_CONFIG.MIN_PASSWORD_LENGTH), type: 'error' })
      return
    }
    if (newPassword !== confirmPassword) {
      setChangeMessage({ text: t.errors.mismatch, type: 'error' })
      return
    }
    if (newPassword === currentPassword) {
      setChangeMessage({ text: t.errors.sameAsOld, type: 'error' })
      return
    }
    setChangeLoading(true)
    setChangeMessage(null)
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password: currentPassword,
      })
      if (signInError) {
        setChangeMessage({ text: t.errors.currentInvalid, type: 'error' })
        setChangeLoading(false)
        return
      }
      const { error: updateError } = await supabase.auth.updateUser({ password: newPassword })
      if (updateError) {
        const msg = String(updateError.message || '').toLowerCase()
        setChangeMessage({
          text: msg.includes('new password should be different') ? t.errors.sameAsOld : t.errors.generic,
          type: 'error',
        })
        setChangeLoading(false)
        return
      }
      setChangeMessage({ text: t.success, type: 'success' })
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err) {
      console.error('handleChangePassword:', err)
      setChangeMessage({ text: t.errors.generic, type: 'error' })
    } finally {
      setChangeLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-brand-beige flex items-center justify-center">
        <p className="text-brand-text antialiased">Laddar...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-brand-beige flex flex-col">
      <div className="max-w-md mx-auto py-10 px-4 flex-grow">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-display text-brand-green">Lösenord</h1>
          <Link
            href="/dashboard/settings"
            className="text-sm text-brand-text hover:text-brand-green antialiased"
          >
            ← Tillbaka till inställningar
          </Link>
        </div>

        <div className="space-y-8">
          {/* Glömt lösenord */}
          <section className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-brand-text mb-2 antialiased">
              Glömt lösenord?
            </h2>
            <p className="text-sm text-brand-text/70 mb-4 antialiased">
              Skicka en återställningslänk till din e-post. Du kan sedan välja ett nytt lösenord när du klickar på länken.
            </p>
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-brand-text mb-1 antialiased">
                  E-post
                </label>
                <input
                  type="email"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-brand-green focus:border-brand-green outline-none text-brand-text antialiased"
                  placeholder="din@epost.se"
                  autoComplete="email"
                />
              </div>
              {forgotMessage && (
                <div
                  className={`p-3 rounded text-sm ${
                    forgotMessage.type === 'error' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                  }`}
                  role="alert"
                >
                  {forgotMessage.text}
                </div>
              )}
              <Button type="submit" disabled={forgotLoading} className="w-full">
                {forgotLoading ? 'Skickar...' : 'Skicka återställningslänk'}
              </Button>
            </form>
          </section>

          {/* Byt lösenord */}
          <section className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-brand-text mb-2 antialiased">
              Byt lösenord
            </h2>
            <p className="text-sm text-brand-text/70 mb-4 antialiased">
              {t.description}
            </p>
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-brand-text mb-1 antialiased">
                  {t.currentLabel}
                </label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-brand-green focus:border-brand-green outline-none text-brand-text antialiased"
                  autoComplete="current-password"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-brand-text mb-1 antialiased">
                  {t.newLabel}
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-brand-green focus:border-brand-green outline-none text-brand-text antialiased"
                  autoComplete="new-password"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-brand-text mb-1 antialiased">
                  {t.confirmLabel}
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-brand-green focus:border-brand-green outline-none text-brand-text antialiased"
                  autoComplete="new-password"
                />
              </div>
              {changeMessage && (
                <div
                  className={`p-3 rounded text-sm ${
                    changeMessage.type === 'error' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                  }`}
                  role="alert"
                >
                  {changeMessage.text}
                </div>
              )}
              <Button type="submit" disabled={changeLoading} className="w-full">
                {changeLoading ? t.loading : t.submit}
              </Button>
            </form>
          </section>
        </div>
      </div>
    </div>
  )
}
