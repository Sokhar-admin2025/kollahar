'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, useSearchParams } from 'next/navigation'
import { DASHBOARD_TEXTS } from '@/app/lib/content'

const supabase = createClient()

const MAX_ATTEMPTS = 5
const CODE_EXPIRY_SECONDS = 15 * 60 // 15 minuter

export default function VerifyPageContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  
  const email = searchParams.get('email') || ''
  const type = searchParams.get('type') || 'signup' // 'signup' eller 'login'
  
  const [code, setCode] = useState<string[]>(['', '', '', '', '', ''])
  const [loading, setLoading] = useState(false)
  const [resending, setResending] = useState(false)
  const [message, setMessage] = useState<{ text: string; type: 'error' | 'success' } | null>(null)
  const [attemptsLeft, setAttemptsLeft] = useState(MAX_ATTEMPTS)
  const [timeLeft, setTimeLeft] = useState(CODE_EXPIRY_SECONDS)
  const [codeExpired, setCodeExpired] = useState(false)
  
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
    const fullCode = code.join('')
    
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

    try {
      // Verifiera OTP-koden. För email-OTP som skickas via signInWithOtp
      // ska type vara 'magiclink' enligt Supabase-dokumentationen.
      const { error } = await supabase.auth.verifyOtp({
        email,
        token: fullCode,
        type: 'magiclink',        
      })

      if (error) {
        const newAttempts = attemptsLeft - 1
        
        if (newAttempts <= 0) {
          setMessage({ 
            text: DASHBOARD_TEXTS.auth.verify.errors.tooManyAttempts, 
            type: 'error' 
          })
          setAttemptsLeft(0)
          // Rensa fält
          setCode(['', '', '', '', '', ''])
          inputRefs.current[0]?.focus()
        } else if (error.message.includes('expired') || error.message.includes('invalid')) {
          setMessage({ 
            text: `${DASHBOARD_TEXTS.auth.verify.errors.invalidCode} ${DASHBOARD_TEXTS.auth.verify.attemptsLeft(newAttempts)}`, 
            type: 'error' 
          })
          setAttemptsLeft(newAttempts)
          // Rensa fält
          setCode(['', '', '', '', '', ''])
          inputRefs.current[0]?.focus()
        } else {
          setMessage({ 
            text: DASHBOARD_TEXTS.auth.verify.errors.generic, 
            type: 'error' 
          })
          setAttemptsLeft(newAttempts)
        }
        setLoading(false)
      } else {
        // Lyckad verifiering: användaren är nu inloggad, redirecta till startsidan
        setMessage({ text: DASHBOARD_TEXTS.auth.verify.success, type: 'success' })

        // Auto-login och redirect
        setTimeout(() => {
          router.push('/?logged_in=true')
          router.refresh()
        }, 1000)
      }
    } catch (err) {
      setMessage({ 
        text: DASHBOARD_TEXTS.auth.verify.errors.generic, 
        type: 'error' 
      })
      setLoading(false)
    }
  }, [code, codeExpired, attemptsLeft, email, type, router])

  // Auto-verify när alla 6 siffror är ifyllda
  useEffect(() => {
    const fullCode = code.join('')
    if (fullCode.length === 6 && /^\d{6}$/.test(fullCode) && !loading) {
      handleVerify()
    }
  }, [code, loading, handleVerify])

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
          shouldCreateUser: type === 'signup',
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
    } catch (err) {
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
            <div className="text-center text-sm text-gray-600">
              {t.loading}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

