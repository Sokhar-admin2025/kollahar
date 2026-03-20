'use client'

import { useState, useEffect, useRef, useCallback, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { createClient } from '../../../lib/supabase/client'
import { createOrganizationSiteAction } from '../../actions/registration-actions'

const MAX_ATTEMPTS = 5
const CODE_EXPIRY_SECONDS = 15 * 60
const VERIFY_TIMEOUT_MS = 15000

const STEPS = ['Kontouppgifter', 'Företagsinfo', 'Bekräftelse']

export default function VerifieraPage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen bg-bg-page flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-brand-blue" />
      </main>
    }>
      <VerifieraContent />
    </Suspense>
  )
}

function VerifieraContent() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const emailFromParams = searchParams.get('email') || ''
  const [email, setEmail] = useState(emailFromParams)

  const [code, setCode] = useState<string[]>(['', '', '', '', '', ''])
  const [loading, setLoading] = useState(false)
  const [resending, setResending] = useState(false)
  const [message, setMessage] = useState<{ text: string; type: 'error' | 'success' } | null>(null)
  const [attemptsLeft, setAttemptsLeft] = useState(MAX_ATTEMPTS)
  const [timeLeft, setTimeLeft] = useState(CODE_EXPIRY_SECONDS)
  const [codeExpired, setCodeExpired] = useState(false)

  const inputRefs = useRef<(HTMLInputElement | null)[]>([])
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Hämta e-post från sessionStorage om den saknas i searchParams
  useEffect(() => {
    if (!email) {
      const stored = sessionStorage.getItem('bilar_signup_email')
      if (stored) setEmail(stored)
    }
  }, [email])

  // Countdown
  useEffect(() => {
    if (timeLeft <= 0) {
      setCodeExpired(true)
      return
    }
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          setCodeExpired(true)
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [timeLeft])

  // Auto-focus vid mount
  useEffect(() => {
    inputRefs.current[0]?.focus()
  }, [])

  // Cleanup timeout vid unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [])

  const handleVerify = useCallback(async () => {
    const fullCode = code.join('').trim()

    if (fullCode.length !== 6) {
      setMessage({ text: 'Ange alla 6 siffror.', type: 'error' })
      return
    }
    if (codeExpired) {
      setMessage({ text: 'Koden har gått ut. Skicka en ny kod.', type: 'error' })
      return
    }
    if (attemptsLeft <= 0) {
      setMessage({ text: 'För många felaktiga försök. Skicka en ny kod.', type: 'error' })
      return
    }

    setLoading(true)
    setMessage(null)

    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    timeoutRef.current = setTimeout(() => {
      setLoading(false)
      setMessage({ text: 'Det tar längre tid än vanligt. Försök igen eller ladda om sidan.', type: 'error' })
      timeoutRef.current = null
    }, VERIFY_TIMEOUT_MS)

    try {
      const supabase = createClient()

      // Primär: type signup, fallback: type email
      let { data: otpData, error } = await supabase.auth.verifyOtp({
        email,
        token: fullCode,
        type: 'signup',
      })

      if (error) {
        const res = await supabase.auth.verifyOtp({
          email,
          token: fullCode,
          type: 'email',
        })
        if (!res.error) {
          error = null
          otpData = res.data
        }
      }

      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
        timeoutRef.current = null
      }

      if (error) {
        const newAttempts = attemptsLeft - 1
        const wrongCode = 'Felaktig kod. Kontrollera och försök igen.'
        if (newAttempts <= 0) {
          setMessage({ text: 'För många felaktiga försök. Skicka en ny kod.', type: 'error' })
          setAttemptsLeft(0)
        } else {
          setMessage({
            text: `${wrongCode} ${newAttempts} försök kvar.`,
            type: 'error',
          })
          setAttemptsLeft(newAttempts)
        }
        setCode(['', '', '', '', '', ''])
        inputRefs.current[0]?.focus()
        setLoading(false)
        return
      }

      // Lyckad verifiering
      const verifiedUserId = otpData?.user?.id ?? null

      // Hämta lösenord från sessionStorage och logga in
      const storedPassword = sessionStorage.getItem('signup_password_pending_verify')
      if (storedPassword) {
        try {
          sessionStorage.removeItem('signup_password_pending_verify')
          sessionStorage.removeItem('bilar_signup_email')
        } catch { /* ignore */ }
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password: storedPassword })
        if (signInError) {
          setMessage({ text: 'Verifieringen lyckades men inloggningen misslyckades. Försök logga in manuellt.', type: 'error' })
          setLoading(false)
          return
        }
      }

      const userId = verifiedUserId ?? (await supabase.auth.getUser()).data.user?.id ?? null

      if (userId) {
        // Sätt otp_verified = true (logga fel men avbryt inte flödet)
        const { error: otpVerifiedErr } = await supabase
          .from('profiles')
          .update({ otp_verified: true })
          .eq('id', userId)

        if (otpVerifiedErr) {
          console.error('[bilar] otp_verified update fel:', otpVerifiedErr)
        }

        // Hämta organization_id
        const { data: profile } = await supabase
          .from('profiles')
          .select('organization_id')
          .eq('id', userId)
          .single()

        // Sätt alltid account_type = 'company' — kan vara 'private' p.g.a. legacy-data
        // (signUp anropades tidigare utan account_type i metadata).
        const { error: accountTypeErr } = await supabase
          .from('profiles')
          .update({ account_type: 'company' })
          .eq('id', userId)
        if (accountTypeErr) {
          console.error('[bilar] account_type update fel:', accountTypeErr)
        }

        // organization_id är NULL för nya användare (handle_new_user sätter det inte automatiskt).
        // Sätt det explicit till userId — konsekvent med multi-tenant backfill-mönstret.
        const orgId: string = profile?.organization_id ?? userId

        if (!profile?.organization_id) {
          // Uppdatera profilen med organization_id
          const { error: profileUpdateErr } = await supabase
            .from('profiles')
            .update({ organization_id: userId })
            .eq('id', userId)

          if (profileUpdateErr) {
            console.error('[bilar] profile organization_id update fel:', profileUpdateErr)
          }

          // Skapa organizations-rad (ignorera konflikt om den redan finns)
          const { error: orgInsertErr } = await supabase
            .from('organizations')
            .upsert(
              { id: orgId, name: '', slug: 'org-' + orgId.replace(/-/g, '') },
              { onConflict: 'id', ignoreDuplicates: true }
            )

          if (orgInsertErr) {
            console.error('[bilar] organizations upsert fel:', orgInsertErr)
          }
        }

        // Skapa/uppdatera rad i organization_sites via server action (kräver service role)
        const orgSiteResult = await createOrganizationSiteAction(orgId)
        if (!orgSiteResult.success) {
          console.error('[bilar] organization_sites upsert fel:', orgSiteResult.error)
        }
      }

      setMessage({ text: 'Koden godkänd! Fortsätter...', type: 'success' })
      router.push('/registrera/profil')
    } catch {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
        timeoutRef.current = null
      }
      setMessage({ text: 'Ett oväntat fel uppstod. Försök igen.', type: 'error' })
      setLoading(false)
    }
  }, [code, codeExpired, attemptsLeft, email, router])

  // Auto-verify när alla 6 siffror är ifyllda
  useEffect(() => {
    const fullCode = code.join('')
    if (fullCode.length === 6 && /^\d{6}$/.test(fullCode) && !loading) {
      handleVerify()
    }
  }, [code, loading, handleVerify])

  const handleCodeChange = (index: number, value: string) => {
    if (value && !/^\d$/.test(value)) return
    const newCode = [...code]
    newCode[index] = value
    setCode(newCode)
    setMessage(null)
    if (value && index < 5) inputRefs.current[index + 1]?.focus()
  }

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
  }

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').trim()
    if (/^\d{6}$/.test(pasted)) {
      setCode(pasted.split(''))
      setMessage(null)
      inputRefs.current[5]?.focus()
    }
  }

  const handleResend = async () => {
    setResending(true)
    setMessage(null)
    setCodeExpired(false)
    setTimeLeft(CODE_EXPIRY_SECONDS)
    setAttemptsLeft(MAX_ATTEMPTS)
    setCode(['', '', '', '', '', ''])
    inputRefs.current[0]?.focus()

    try {
      const supabase = createClient()
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { shouldCreateUser: false },
      })
      setMessage(
        error
          ? { text: 'Kunde inte skicka ny kod. Försök igen.', type: 'error' }
          : { text: 'Ny kod skickad! Kontrollera din e-post.', type: 'success' }
      )
    } catch {
      setMessage({ text: 'Kunde inte skicka ny kod. Försök igen.', type: 'error' })
    } finally {
      setResending(false)
    }
  }

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`

  if (!email) {
    return (
      <main className="min-h-screen bg-bg-page flex items-center justify-center px-4">
        <div className="text-center">
          <p className="text-sm text-danger mb-4">Ingen e-postadress hittades.</p>
          <button
            onClick={() => router.replace('/registrera')}
            className="text-sm text-brand-blue hover:underline"
          >
            Tillbaka till registreringen
          </button>
        </div>
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
            const active = step === 2
            const done = step < 2
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
          <h1 className="text-xl font-bold text-text-primary mb-1">Verifiera din e-post</h1>
          <p className="text-sm text-text-secondary mb-1">
            Steg 2 av 3 — Vi har skickat en 6-siffrig kod till
          </p>
          <p className="text-sm font-medium text-text-primary mb-6">{email}</p>

          {/* Countdown */}
          {!codeExpired && timeLeft > 0 && (
            <p className="text-xs text-text-secondary text-center mb-4">
              Koden är giltig i <span className="font-medium text-text-primary">{formatTime(timeLeft)}</span>
            </p>
          )}

          {/* Försök kvar */}
          {attemptsLeft < MAX_ATTEMPTS && attemptsLeft > 0 && (
            <p className="text-xs text-warning text-center mb-4">
              {attemptsLeft} försök kvar
            </p>
          )}

          {/* OTP-fält */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-text-primary text-center mb-3">
              Ange koden
            </label>
            <div className="flex justify-center gap-2">
              {code.map((digit, index) => (
                <input
                  key={index}
                  id={`code-${index}`}
                  ref={(el) => { inputRefs.current[index] = el }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleCodeChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  onPaste={index === 0 ? handlePaste : undefined}
                  disabled={loading || codeExpired || attemptsLeft === 0}
                  aria-label={`Siffra ${index + 1} av 6`}
                  className={`w-11 h-13 text-center text-xl font-bold rounded-lg border-2 focus:outline-none focus:ring-2 transition-colors disabled:opacity-40 ${
                    codeExpired || attemptsLeft === 0
                      ? 'border-danger/30 bg-red-50'
                      : message?.type === 'error'
                      ? 'border-danger focus:ring-danger/30'
                      : 'border-border-standard focus:ring-brand-blue focus:border-brand-blue'
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Meddelande */}
          {message && (
            <div
              className={`p-3 rounded-lg text-sm text-center mb-4 ${
                message.type === 'error'
                  ? 'bg-red-50 border border-danger/20 text-danger'
                  : 'bg-success-light border border-success/20 text-success'
              }`}
              role="alert"
              aria-live="polite"
            >
              {message.text}
            </div>
          )}

          {/* Laddar */}
          {loading && (
            <div className="flex items-center justify-center gap-2 text-sm text-text-secondary mb-4">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Verifierar...</span>
            </div>
          )}

          {/* Manuell verifiera-knapp (backup om auto-verify missar) */}
          {code.join('').length === 6 && !loading && (
            <button
              type="button"
              onClick={handleVerify}
              disabled={codeExpired || attemptsLeft === 0}
              className="w-full py-2.5 bg-brand-blue hover:bg-brand-blue-hover text-white text-sm font-semibold rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed mb-4"
            >
              Verifiera
            </button>
          )}

          {/* Återskicka — alltid synlig som länk, primärknapp när expired/slut på försök */}
          {(codeExpired || attemptsLeft === 0) ? (
            <button
              type="button"
              onClick={handleResend}
              disabled={resending}
              className="w-full py-2.5 border-2 border-brand-blue text-brand-blue text-sm font-semibold rounded-lg hover:bg-brand-blue-light transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {resending ? 'Skickar...' : 'Skicka ny kod'}
            </button>
          ) : (
            <div className="text-center">
              <button
                type="button"
                onClick={handleResend}
                disabled={resending}
                className="text-sm text-brand-blue hover:underline disabled:opacity-50"
              >
                {resending ? 'Skickar...' : 'Skicka koden igen'}
              </button>
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
