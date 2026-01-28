'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { AUTH_CONFIG } from '@/lib/constants'
import { DASHBOARD_TEXTS } from '@/app/lib/content'
import { Eye, EyeOff } from 'lucide-react'
import Header from '@/app/components/organisms/Header'

// Kopplingen till Supabase
const supabase = createClient()

type AuthName = 'login' | 'signup'

// Användarvänliga felmeddelanden
const getErrorMessage = (error: any, mode: AuthName): string => {
  if (!error) {
    return DASHBOARD_TEXTS.auth[mode].errors.generic
  }

  const message = String(error.message || '').toLowerCase()

  if (mode === 'login') {
    const loginErrors = DASHBOARD_TEXTS.auth.login.errors

    if (message.includes('invalid') || message.includes('credentials')) {
      return loginErrors.invalidCredentials
    }
    if (message.includes('network') || message.includes('fetch')) {
      return loginErrors.networkError
    }

    return loginErrors.generic
  }

  // mode === 'signup'
  const signupErrors = DASHBOARD_TEXTS.auth.signup.errors

  if (message.includes('already registered') || message.includes('user exists')) {
    return signupErrors.emailExists
  }
  if (message.includes('password')) {
    return signupErrors.weakPassword
  }
  if (message.includes('email')) {
    return signupErrors.invalidEmail
  }

  return signupErrors.generic
}

export default function LoginPageContent() {
  const searchParams = useSearchParams()
  const router = useRouter()

  // Läs tab från URL eller default till 'login'
  const initialTab = (searchParams.get('tab') as AuthName) || 'login'
  const [activeTab, setActiveTab] = useState<AuthName>(initialTab)

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ text: string; type: 'error' | 'success' } | null>(null)

  // Uppdatera URL när tab ändras (endast när activeTab faktiskt ändras)
  useEffect(() => {
    const currentTab = searchParams.get('tab')
    if (currentTab === activeTab || (activeTab === 'login' && !currentTab)) {
      return // Ingen förändring behövs
    }

    const params = new URLSearchParams()
    if (activeTab === 'signup') {
      params.set('tab', 'signup')
    }
    const newUrl = params.toString() ? `/login?${params.toString()}` : '/login'
    window.history.replaceState({}, '', newUrl)
  }, [activeTab, searchParams])

  // Validera email-format
  const isValidEmail = (email: string): boolean => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
  }

  const handleSignIn = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()

    if (!email.trim() || !password) {
      setMessage({
        text: 'Vänligen fyll i både e-post och lösenord.',
        type: 'error',
      })
      return
    }

    if (!isValidEmail(email)) {
      setMessage({
        text: DASHBOARD_TEXTS.auth.login.errors.invalidEmail || 'Ogiltig e-postadress.',
        type: 'error',
      })
      return
    }

    setLoading(true)
    setMessage(null)

    const cleanEmail = email.trim()

    const { error } = await supabase.auth.signInWithPassword({
      email: cleanEmail,
      password,
    })

    if (error) {
      setMessage({
        text: getErrorMessage(error, 'login'),
        type: 'error',
      })
      setLoading(false)
    } else {
      setMessage({ text: 'Inloggad! Skickar vidare...', type: 'success' })
      setTimeout(() => {
        router.push('/?logged_in=true')
        router.refresh()
      }, 1000)
    }
  }

  const handleSignUp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()

    if (!email.trim() || !password) {
      setMessage({
        text: 'Vänligen fyll i både e-post och lösenord.',
        type: 'error',
      })
      return
    }

    if (!isValidEmail(email)) {
      setMessage({
        text: DASHBOARD_TEXTS.auth.signup.errors.invalidEmail,
        type: 'error',
      })
      return
    }

    // Validera lösenordslängd
    if (password.length < AUTH_CONFIG.MIN_PASSWORD_LENGTH) {
      setMessage({
        text: DASHBOARD_TEXTS.auth.signup.passwordMinLength(AUTH_CONFIG.MIN_PASSWORD_LENGTH),
        type: 'error',
      })
      return
    }

    setLoading(true)
    setMessage(null)
    const cleanEmail = email.trim()

    // 1. Försök skapa användare först (signUp)
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: cleanEmail,
      password,
      options: {
        // Vi använder OTP för första inloggningen, så vi behöver inte skicka en separat bekräftelselänk
        emailRedirectTo: undefined,
      },
    })

    if (signUpError) {
      const msg = String(signUpError.message || '').toLowerCase()

      // Om användaren redan finns → visa tydligt meddelande och byt till login-fliken
      if (msg.includes('already registered') || msg.includes('user already registered')) {
        setMessage({
          text: DASHBOARD_TEXTS.auth.signup.errors.emailExists,
          type: 'error',
        })
        setActiveTab('login')
      } else if (msg.includes('password')) {
        setMessage({ text: DASHBOARD_TEXTS.auth.signup.errors.weakPassword, type: 'error' })
      } else if (msg.includes('email')) {
        setMessage({ text: DASHBOARD_TEXTS.auth.signup.errors.invalidEmail, type: 'error' })
      } else {
        setMessage({ text: DASHBOARD_TEXTS.auth.signup.errors.generic, type: 'error' })
      }

      setLoading(false)
      return
    }

    // 2. Säkerställ att användaren INTE är inloggad förrän OTP är verifierad
    //    (för att förhindra att man kan kringgå verifieringen via headern/dashboard)
    try {
      await supabase.auth.signOut()
    } catch (err) {
      console.warn('Kunde inte signa ut efter signUp (ignoreras, fortsätter med OTP-flödet):', err)
    }

    // 3. Skicka 6-siffrig OTP till den nya (eller befintliga) användaren, utan att skapa nytt konto
    const { error: otpError } = await supabase.auth.signInWithOtp({
      email: cleanEmail,
      options: {
        shouldCreateUser: false,
      },
    })

    if (otpError) {
      let errorMessage = 'Kunde inte skicka verifieringskod. '
      if (otpError.message.includes('email') || otpError.message.includes('rate limit')) {
        errorMessage += 'Kontakta support om du inte får något mail.'
      } else {
        errorMessage += otpError.message || 'Försök igen.'
      }
      setMessage({ text: errorMessage, type: 'error' })
      setLoading(false)
      return
    }

    // 4. Redirect till verifieringssidan
    router.push(`/login/verify?email=${encodeURIComponent(cleanEmail)}&type=signup`)
  }

  // Keyboard navigation - Enter-tangent
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !loading) {
      if (activeTab === 'login') {
        handleSignIn()
      } else {
        handleSignUp()
      }
    }
  }

  const t = DASHBOARD_TEXTS.auth

  return (
    <div className="flex min-h-screen flex-col bg-brand-beige">
      {/* Header med logotyp som länk till startsidan */}
      <Header />
      
      <div className="flex flex-col items-center justify-center flex-grow p-4">
        <div className="w-full max-w-md space-y-4">
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              router.replace('/')
            }}
            className="mb-2 inline-block text-sm font-medium text-brand-text/70 hover:text-brand-green transition focus:outline-none focus:ring-2 focus:ring-brand-green rounded"
            aria-label="Tillbaka till annonserna"
          >
            ← Tillbaka till annonserna
          </button>
        
        <div className="space-y-4 rounded-xl border p-8 shadow-md bg-white text-brand-text">
          {/* Tabs */}
          <div className="flex border-b border-gray-200 mb-6">
            <button
              type="button"
              onClick={() => {
                setActiveTab('login')
                setMessage(null)
              }}
              className={`flex-1 pb-3 text-center font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-brand-green rounded-t ${
                activeTab === 'login'
                  ? 'text-brand-green border-b-2 border-brand-green'
                  : 'text-gray-500 hover:text-brand-text'
              }`}
              aria-label="Logga in"
            >
              {t.login.title}
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('signup')
                setMessage(null)
              }}
              className={`flex-1 pb-3 text-center font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-brand-green rounded-t ${
                activeTab === 'signup'
                  ? 'text-brand-green border-b-2 border-brand-green'
                  : 'text-gray-500 hover:text-brand-text'
              }`}
              aria-label="Skapa konto"
            >
              {t.signup.title}
            </button>
          </div>

          {/* Form */}
          <form 
            onSubmit={activeTab === 'login' ? handleSignIn : handleSignUp}
            onKeyDown={handleKeyDown}
            className="space-y-4"
          >
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium block">
                {t.login.email}
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                className="w-full rounded-xl border border-gray-300 p-3 focus:ring-2 focus:ring-brand-green focus:border-brand-green outline-none text-brand-text"
                placeholder="din@email.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value)
                  setMessage(null)
                }}
                aria-label={t.login.email}
                aria-required="true"
              />
            </div>
            
            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium block">
                {t.login.password}
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete={activeTab === 'login' ? 'current-password' : 'new-password'}
                  className={`w-full rounded-xl border p-3 pr-10 focus:ring-2 focus:ring-brand-green outline-none text-brand-text ${
                    password.length > 0 && password.length < AUTH_CONFIG.MIN_PASSWORD_LENGTH && activeTab === 'signup'
                      ? 'border-red-300 focus:ring-red-500'
                      : 'border-gray-300'
                  }`}
                  placeholder={activeTab === 'signup' ? `Minst ${AUTH_CONFIG.MIN_PASSWORD_LENGTH} tecken` : 'Ditt lösenord'}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value)
                    setMessage(null)
                  }}
                  aria-label={t.login.password}
                  aria-required="true"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-brand-text focus:outline-none focus:ring-2 focus:ring-brand-green rounded"
                  aria-label={showPassword ? 'Dölj lösenord' : 'Visa lösenord'}
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
              {password.length > 0 && password.length < AUTH_CONFIG.MIN_PASSWORD_LENGTH && activeTab === 'signup' && (
                <p className="text-xs text-red-600" role="alert">
                  {DASHBOARD_TEXTS.auth.signup.passwordMinLength(AUTH_CONFIG.MIN_PASSWORD_LENGTH)}
                </p>
              )}
            </div>

            {/* Glömt lösenord - endast vid inloggning */}
            {activeTab === 'login' && (
              <div className="text-right">
                <button
                  type="button"
                  onClick={async (e) => {
                    e.preventDefault()
                    e.stopPropagation()

                    if (!email.trim()) {
                      setMessage({
                        text: 'Fyll i din e-postadress för att återställa lösenord.',
                        type: 'error',
                      })
                      return
                    }

                    if (!isValidEmail(email)) {
                      setMessage({
                        text: DASHBOARD_TEXTS.auth.login.errors.invalidEmail,
                        type: 'error',
                      })
                      return
                    }

                    setLoading(true)
                    setMessage(null)
                    const cleanEmail = email.trim()

                    try {
                      const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
                        redirectTo: `${window.location.origin}/reset-password`,
                      })

                      if (error) {
                        let text = 'Kunde inte skicka återställningslänk. '
                        if (error.message?.toLowerCase().includes('rate limit')) {
                          text += 'För många försök. Vänta en stund och försök igen.'
                        } else {
                          text += 'Kontrollera din e-postkonfiguration eller försök igen senare.'
                        }
                        setMessage({ text, type: 'error' })
                      } else {
                        setMessage({
                          text: 'Vi har skickat en länk för att byta lösenord till din e-post.',
                          type: 'success',
                        })
                      }
                    } catch (err) {
                      console.error('Fel vid resetPasswordForEmail:', err)
                      setMessage({
                        text: 'Ett oväntat fel uppstod. Försök igen.',
                        type: 'error',
                      })
                    } finally {
                      setLoading(false)
                    }
                  }}
                  className="text-sm text-brand-green hover:underline focus:outline-none focus:ring-2 focus:ring-brand-green rounded"
                >
                  {t.login.forgotPassword}
                </button>
              </div>
            )}
            
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
            
            {/* Submit-knapp */}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-brand-green p-3 text-white font-medium hover:bg-brand-green/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-md focus:outline-none focus:ring-2 focus:ring-brand-green focus:ring-offset-2"
            >
              {loading 
                ? (activeTab === 'login' ? t.login.loading : t.signup.loading)
                : (activeTab === 'login' ? t.login.submit : t.signup.submit)
              }
            </button>
          </form>
        </div>
      </div>
      </div>
    </div>
  )
}

