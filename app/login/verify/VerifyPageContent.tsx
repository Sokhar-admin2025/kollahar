'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, useSearchParams } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { DASHBOARD_TEXTS } from '@/app/lib/content'

const supabase = createClient()

const VERIFY_TIMEOUT_MS = 15000 // 15 sekunder

const MAX_ATTEMPTS = 5
const CODE_EXPIRY_SECONDS = 15 * 60 // 15 minuter

export default function VerifyPageContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  
  const email = searchParams.get('email') || ''
  const type = searchParams.get('type') || 'signup' // 'signup' eller 'login'
  const fromUpgrade = searchParams.get('from') === 'upgrade'
  
  const [code, setCode] = useState<string[]>(['', '', '', '', '', ''])
  const [loading, setLoading] = useState(false)
  const [resending, setResending] = useState(false)
  const [message, setMessage] = useState<{ text: string; type: 'error' | 'success' } | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [attemptsLeft, setAttemptsLeft] = useState(MAX_ATTEMPTS)
  const [timeLeft, setTimeLeft] = useState(CODE_EXPIRY_SECONDS)
  const [codeExpired, setCodeExpired] = useState(false)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  // Countdown timer
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

  // Auto-focus första input vid mount
  useEffect(() => {
    inputRefs.current[0]?.focus()
  }, [])

  const handleVerify = useCallback(async () => {
    const fullCode = code.join('').trim()
    
    if (fullCode.length !== 6) {
      setMessage({ text: DASHBOARD_TEXTS.auth.verify.errors.invalidCode, type: 'error' })
      return
    }

    if (codeExpired) {
      setMessage({ text: DASHBOARD_TEXTS.auth.verify.errors.expiredCode, type: 'error' })
      return
    }

    if (attemptsLeft <= 0) {
      setMessage({ text: DASHBOARD_TEXTS.auth.verify.errors.tooManyAttempts, type: 'error' })
      return
    }

    setLoading(true)
    setMessage(null)
    setSuccessMessage(null)

    // Rensa tidigare timeout om den finns
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    // Sätt timeout för verifieringen
    timeoutRef.current = setTimeout(() => {
      setLoading(false)
      setMessage({ 
        text: 'Det tar längre tid än vanligt. Försök igen eller ladda om sidan.', 
        type: 'error' 
      })
      timeoutRef.current = null
    }, VERIFY_TIMEOUT_MS)

    try {
      // Robust OTP: först signup, vid fel fallback till email (olika flöden/resend kan ge olika typ)
      let { data: otpData, error } = await supabase.auth.verifyOtp({
        email,
        token: fullCode,
        type: 'signup',
      })

      if (error) {
        console.log('Signup verification failed, trying email type...')
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

      // Rensa timeout om vi fick svar
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
        timeoutRef.current = null
      }

      if (error) {
        const newAttempts = attemptsLeft - 1
        const wrongCodeMessage = 'Felaktig kod. Kontrollera och försök igen.'
        if (newAttempts <= 0) {
          setMessage({ 
            text: DASHBOARD_TEXTS.auth.verify.errors.tooManyAttempts ?? wrongCodeMessage, 
            type: 'error' 
          })
          setAttemptsLeft(0)
          setCode(['', '', '', '', '', ''])
          inputRefs.current[0]?.focus()
        } else if (error.message?.toLowerCase().includes('expired') || error.message?.toLowerCase().includes('invalid') || error.message?.toLowerCase().includes('token')) {
          setMessage({ 
            text: wrongCodeMessage + (newAttempts > 0 ? ` ${DASHBOARD_TEXTS.auth.verify.attemptsLeft?.(newAttempts) ?? `${newAttempts} försök kvar.`}` : ''), 
            type: 'error' 
          })
          setAttemptsLeft(newAttempts)
          setCode(['', '', '', '', '', ''])
          inputRefs.current[0]?.focus()
        } else {
          setMessage({ 
            text: wrongCodeMessage, 
            type: 'error' 
          })
          setAttemptsLeft(newAttempts)
        }
        setLoading(false)
      } else {
        // Lyckad OTP-verifiering: använd alltid user-id från verifyOtp-svaret (så vi inte missar pga timing/getUser())
        const verifiedUserId = otpData?.user?.id ?? null
        setSuccessMessage('Koden godkänd! Loggar in...')
        setMessage({ text: DASHBOARD_TEXTS.auth.verify.success, type: 'success' })

        let signInError: Error | null = null
        const storedPassword =
          typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('signup_password_pending_verify') : null
        if (storedPassword) {
          try {
            sessionStorage.removeItem('signup_password_pending_verify')
          } catch {
            /* ignore */
          }
          const signInRes = await supabase.auth.signInWithPassword({
            email,
            password: storedPassword,
          })
          signInError = signInRes.error
        }
        // Om vi inte hade lösenord använder vi sessionen från verifyOtp (redan satt)

        if (signInError) {
          setMessage({
            text: signInError.message ?? 'Kunde inte logga in. Försök logga in manuellt med e-post och lösenord.',
            type: 'error',
          })
          setLoading(false)
          return
        }

        const userIdToUpdate = verifiedUserId ?? (await supabase.auth.getUser()).data.user?.id ?? null
        if (userIdToUpdate) {
          const { error: updateErr } = await supabase
            .from('profiles')
            .update({ otp_verified: true })
            .eq('id', userIdToUpdate)
          if (updateErr) {
            console.error('Kunde inte uppdatera otp_verified i profiles:', updateErr)
            setMessage({
              text: 'Verifieringen lyckades men något gick fel. Försök logga in igen.',
              type: 'error',
            })
            setLoading(false)
            return
          }
        }

        // Full sidladdning så session-cookien skickas med och dashboard ser användaren
        window.location.href = '/dashboard'
      }
    } catch {
      // Rensa timeout vid fel
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
        timeoutRef.current = null
      }
      setMessage({ 
        text: DASHBOARD_TEXTS.auth.verify.errors.generic, 
        type: 'error' 
      })
      setLoading(false)
    }
  }, [code, codeExpired, attemptsLeft, email, type])

  // Auto-verify när alla 6 siffror är ifyllda
  useEffect(() => {
    const fullCode = code.join('')
    if (fullCode.length === 6 && /^\d{6}$/.test(fullCode) && !loading) {
      handleVerify()
    }
  }, [code, loading, handleVerify])

  // Cleanup timeout vid unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  const handleCodeChange = (index: number, value: string) => {
    // Endast siffror
    if (value && !/^\d$/.test(value)) return

    const newCode = [...code]
    newCode[index] = value
    setCode(newCode)
    setMessage(null)

    // Auto-focus nästa input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus()
    }
  }

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
  }

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault()
    const pastedData = e.clipboardData.getData('text').trim()
    
    if (/^\d{6}$/.test(pastedData)) {
      const newCode = pastedData.split('')
      setCode(newCode)
      setMessage(null)
      // Focus sista input
      inputRefs.current[5]?.focus()
    }
  }

  const handleResendCode = async () => {
    setResending(true)
    setMessage(null)
    setCodeExpired(false)
    setTimeLeft(CODE_EXPIRY_SECONDS)
    setAttemptsLeft(MAX_ATTEMPTS)
    setCode(['', '', '', '', '', ''])
    inputRefs.current[0]?.focus()

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: type === 'signup' && !fromUpgrade,
        }
      })

      if (error) {
        setMessage({ 
          text: 'Kunde inte skicka ny kod. Försök igen.', 
          type: 'error' 
        })
      } else {
        setMessage({ 
          text: 'Ny kod skickad! Kontrollera din e-post.', 
          type: 'success' 
        })
      }
    } catch {
      setMessage({ 
        text: 'Kunde inte skicka ny kod. Försök igen.', 
        type: 'error' 
      })
    } finally {
      setResending(false)
    }
  }

  const t = DASHBOARD_TEXTS.auth.verify

  if (!email) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-4 bg-brand-beige">
        <div className="text-center">
          <p className="text-red-600 mb-4">Ingen e-post angiven.</p>
          <button
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              router.replace('/login')
            }}
            className="text-brand-green hover:underline"
          >
            Tillbaka till inloggning
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4 bg-brand-beige">
      <div className="w-full max-w-md space-y-4">
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            router.replace('/login')
          }}
          className="mb-2 inline-block text-sm font-medium text-brand-text/70 hover:text-brand-green transition focus:outline-none focus:ring-2 focus:ring-brand-green rounded"
          aria-label="Tillbaka"
        >
          {t.back}
        </button>

        <div className="space-y-6 rounded-xl border p-8 shadow-md bg-white text-brand-text">
          <div className="text-center">
            <h1 className="text-2xl font-display text-brand-green mb-2">{t.title}</h1>
            <p className="text-sm text-gray-600">
              {t.subtitle} <span className="font-medium">{email}</span>
            </p>
          </div>

          {/* Countdown */}
          {!codeExpired && timeLeft > 0 && (
            <div className="text-center text-sm text-gray-600">
              {t.countdown(timeLeft)}
            </div>
          )}

          {/* Försök kvar */}
          {attemptsLeft < MAX_ATTEMPTS && attemptsLeft > 0 && (
            <div className="text-center text-sm text-orange-600">
              {t.attemptsLeft(attemptsLeft)}
            </div>
          )}

          {/* Kod-input */}
          <div className="space-y-4">
            <label htmlFor="code-0" className="text-sm font-medium block text-center">
              {t.codeLabel}
            </label>
            <div className="flex justify-center gap-2">
              {code.map((digit, index) => (
                <input
                  key={index}
                  id={`code-${index}`}
                  ref={(el) => {
                    inputRefs.current[index] = el
                  }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleCodeChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  onPaste={index === 0 ? handlePaste : undefined}
                  className={`w-12 h-14 text-center text-2xl font-bold rounded-lg border-2 focus:ring-2 focus:ring-brand-green focus:border-brand-green outline-none transition-colors ${
                    codeExpired || attemptsLeft === 0
                      ? 'border-red-50 border-red-300'
                      : message?.type === 'error'
                      ? 'border-red-300'
                      : 'border-gray-300'
                  }`}
                  disabled={loading || codeExpired || attemptsLeft === 0}
                  aria-label={`Siffra ${index + 1} av 6`}
                />
              ))}
            </div>
          </div>

          {/* Meddelanden */}
          {message && (
            <div 
              className={`p-3 rounded text-sm text-center ${
                message.type === 'error' 
                  ? 'bg-red-100 text-red-700' 
                  : 'bg-green-100 text-green-700'
              }`}
              role="alert"
              aria-live="polite"
            >
              {message.text}
            </div>
          )}

          {/* Kod gått ut eller för många försök */}
          {(codeExpired || attemptsLeft === 0) && (
            <div className="text-center">
              <button
                type="button"
                onClick={handleResendCode}
                disabled={resending}
                className="w-full rounded-xl border-2 border-brand-green p-3 text-brand-green font-medium hover:bg-brand-green/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-brand-green"
              >
                {resending ? t.resending : t.resend}
              </button>
            </div>
          )}

          {/* Skicka ny kod-knapp (alltid synlig som backup) */}
          {!codeExpired && attemptsLeft > 0 && (
            <div className="text-center">
              <button
                type="button"
                onClick={handleResendCode}
                disabled={resending}
                className="text-sm text-brand-green hover:underline focus:outline-none focus:ring-2 focus:ring-brand-green rounded"
              >
                {resending ? t.resending : t.resend}
              </button>
            </div>
          )}

          {/* Verifiera-knapp (backup om auto-verify inte fungerar) */}
          {code.join('').length === 6 && !loading && (
            <button
              type="button"
              onClick={handleVerify}
              disabled={codeExpired || attemptsLeft === 0}
              className="w-full rounded-xl bg-brand-green p-3 text-white font-medium hover:bg-brand-green/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-md focus:outline-none focus:ring-2 focus:ring-brand-green focus:ring-offset-2"
            >
              {t.submit}
            </button>
          )}

          {loading && (
            <div className="text-center text-sm text-gray-600 flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>{t.loading}</span>
            </div>
          )}

          {successMessage && (
            <div className="text-center text-sm text-brand-green font-medium flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>{successMessage}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

