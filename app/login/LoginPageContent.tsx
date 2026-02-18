'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { AUTH_CONFIG } from '@/lib/constants'
import { DASHBOARD_TEXTS } from '@/app/lib/content'
import { validateDomainMatch } from '@/lib/utils'
import { Eye, EyeOff } from 'lucide-react'

// Kopplingen till Supabase
const supabase = createClient()

type AuthName = 'login' | 'signup'

// Användarvänliga felmeddelanden
const getErrorMessage = (error: unknown, mode: AuthName): string => {
  if (!error) {
    return DASHBOARD_TEXTS.auth[mode].errors.generic
  }

  const message = String(error instanceof Error ? error.message : '').toLowerCase()

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

  const initialEmail = searchParams.get('email') ?? ''
  const [email, setEmail] = useState(initialEmail)
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ text: string; type: 'error' | 'success' } | null>(null)
  const [needsOtpVerification, setNeedsOtpVerification] = useState(false)
  const [sendingOtp, setSendingOtp] = useState(false)

  // Registrering: [Privat] vs [Företag]
  const [signupSubTab, setSignupSubTab] = useState<'private' | 'company'>('private')
  const [companyName, setCompanyName] = useState('')
  const [orgNumber, setOrgNumber] = useState('')
  const [companyWebsite, setCompanyWebsite] = useState('')
  const [termsAccepted, setTermsAccepted] = useState(false)

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

    // Säkerställ att ingen session finns innan vi försöker logga in
    // (för att förhindra att headern visar profilikonen innan vi kontrollerar otp_verified)
    try {
      await supabase.auth.signOut()
      await new Promise(resolve => setTimeout(resolve, 50))
    } catch {
      // Ignorera fel vid signOut
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email: cleanEmail,
      password,
    })

    if (error || !data?.user) {
      setMessage({
        text: getErrorMessage(error, 'login'),
        type: 'error',
      })
      setLoading(false)
    } else {
      try {
        // 1. Hämta profil och kontrollera om kontot är OTP-verifierat
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('otp_verified')
          .eq('id', data.user.id)
          .single()

        const otpVerified =
          !profileError && profile && typeof profile.otp_verified === 'boolean'
            ? profile.otp_verified
            : true // fallback: lås inte ute gamla/anonyma användare

        if (!otpVerified) {
          // Kontot är inte OTP-verifierat – blockera inloggning, kräv 6-siffrig kod
          try {
            const { error: signOutError } = await supabase.auth.signOut()
            if (signOutError) await supabase.auth.signOut()
            await new Promise(resolve => setTimeout(resolve, 100))
          } catch (err) {
            console.warn('Kunde inte signa ut efter otp-verifieringskontroll:', err)
          }
          setNeedsOtpVerification(true)
          setMessage({
            text:
              'Du måste först verifiera din e-post med den 6-siffriga koden vi skickade innan du kan logga in.',
            type: 'error',
          })
          setLoading(false)
          return
        }

        setNeedsOtpVerification(false)

        setMessage({ text: 'Inloggning lyckades. Skickar dig vidare...', type: 'success' })
        const nextUrl = searchParams.get('next')
        const safeNext = nextUrl && nextUrl.startsWith('/') && !nextUrl.startsWith('//') ? nextUrl : null
        const target = safeNext ?? '/?logged_in=returning'
        setTimeout(() => {
          window.location.href = target
        }, 800)
      } catch (err) {
        console.error('Kunde inte verifiera OTP-status vid login:', err)
        setMessage({
          text: 'Ett oväntat fel uppstod vid inloggning. Försök igen.',
          type: 'error',
        })
        setLoading(false)
      }
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

    // Säkerställ att ingen session finns innan vi försöker registrera
    // (för att förhindra att headern visar profilikonen innan vi gör signOut)
    try {
      await supabase.auth.signOut()
      await new Promise(resolve => setTimeout(resolve, 50))
    } catch {
      // Ignorera fel vid signOut
    }

    // 1. Försök skapa användare först (signUp)
    const { error: signUpError } = await supabase.auth.signUp({
      email: cleanEmail,
      password,
      options: {
        // Vi använder OTP för första inloggningen, så vi behöver inte skicka en separat bekräftelselänk
        emailRedirectTo: undefined,
      },
    })

    if (signUpError) {
      const msg = String(signUpError.message || '').toLowerCase()

      // Om användaren redan finns → kontrollera om kontot är verifierat
      if (msg.includes('already registered') || msg.includes('user already registered')) {
        // Kontrollera om kontot är verifierat genom att försöka logga in och kolla otp_verified
        try {
          const { data: testLogin, error: testError } = await supabase.auth.signInWithPassword({
            email: cleanEmail,
            password,
          })

          if (!testError && testLogin?.user) {
            const { data: profile } = await supabase
              .from('profiles')
              .select('otp_verified')
              .eq('id', testLogin.user.id)
              .single()

            await supabase.auth.signOut()

            // Om kontot inte är verifierat → visa knapp för att skicka ny OTP-kod
            if (profile && profile.otp_verified === false) {
              setNeedsOtpVerification(true)
              setMessage({
                text: 'Det finns redan ett konto med denna e-postadress, men det är inte verifierat än. Skicka en ny verifieringskod för att slutföra registreringen.',
                type: 'error',
              })
              setLoading(false)
              return
            } else {
              // Kontot är verifierat → visa standardmeddelande och byt till login-fliken
              setMessage({
                text: DASHBOARD_TEXTS.auth.signup.errors.emailExists,
                type: 'error',
              })
              setActiveTab('login')
              setLoading(false)
              return
            }
          } else {
            // Kunde inte logga in → kontot finns men lösenordet är fel eller något annat
            // Vi kan inte veta om kontot är verifierat eller inte, så visa standardmeddelande
            setMessage({
              text: DASHBOARD_TEXTS.auth.signup.errors.emailExists,
              type: 'error',
            })
            setActiveTab('login')
            setLoading(false)
            return
          }
        } catch {
          // Om vi inte kan kontrollera → visa standardmeddelande
          setMessage({
            text: DASHBOARD_TEXTS.auth.signup.errors.emailExists,
            type: 'error',
          })
          setActiveTab('login')
          setLoading(false)
          return
        }
      } else if (msg.includes('password')) {
        setMessage({ text: DASHBOARD_TEXTS.auth.signup.errors.weakPassword, type: 'error' })
        setLoading(false)
        return
      } else if (msg.includes('email')) {
        setMessage({ text: DASHBOARD_TEXTS.auth.signup.errors.invalidEmail, type: 'error' })
        setLoading(false)
        return
      } else {
        setMessage({ text: DASHBOARD_TEXTS.auth.signup.errors.generic, type: 'error' })
        setLoading(false)
        return
      }
    }

    // 2. Säkerställ att användaren INTE är inloggad förrän OTP är verifierad
    //    (för att förhindra att man kan kringgå verifieringen via headern/dashboard)
    //    VIKTIGT: Vi gör signOut INNAN vi fortsätter, så att headern inte hinner reagera på sessionen
    try {
      const { error: signOutError } = await supabase.auth.signOut()
      if (signOutError) {
        console.warn('Kunde inte signa ut efter signUp:', signOutError)
        // Om signOut misslyckas, försök igen en gång för att säkerställa att sessionen är borta
        await supabase.auth.signOut()
      }
      // Vänta en kort stund för att säkerställa att signOut är helt klart innan vi fortsätter
      await new Promise(resolve => setTimeout(resolve, 100))
    } catch (err) {
      console.warn('Kunde inte signa ut efter signUp (ignoreras, fortsätter med OTP-flödet):', err)
      // Försök igen en sista gång
      try {
        await supabase.auth.signOut()
      } catch (retryErr) {
        console.warn('SignOut-retry misslyckades också:', retryErr)
      }
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

    // 4. Spara lösenord tillfälligt så verify-sidan kan göra force login efter OTP
    try {
      sessionStorage.setItem('signup_password_pending_verify', password)
    } catch {
      /* ignore */
    }
    router.push(`/login/verify?email=${encodeURIComponent(cleanEmail)}&type=signup`)
  }

  const handleCompanySignUp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()

    if (!companyName.trim() || !orgNumber.trim() || !companyWebsite.trim() || !email.trim() || !password) {
      setMessage({ text: 'Fyll i alla fält.', type: 'error' })
      return
    }
    if (!termsAccepted) {
      setMessage({ text: 'Du måste godkänna villkoren.', type: 'error' })
      return
    }
    if (!isValidEmail(email)) {
      setMessage({ text: DASHBOARD_TEXTS.auth.signup.errors.invalidEmail ?? 'Ogiltig e-postadress.', type: 'error' })
      return
    }
    if (password.length < AUTH_CONFIG.MIN_PASSWORD_LENGTH) {
      setMessage({
        text: DASHBOARD_TEXTS.auth.signup.passwordMinLength(AUTH_CONFIG.MIN_PASSWORD_LENGTH),
        type: 'error',
      })
      return
    }
    if (!validateDomainMatch(email.trim(), companyWebsite.trim())) {
      setMessage({
        text: 'E-postens domän måste matcha webbplatsens domän (t.ex. user@företag.se och företag.se).',
        type: 'error',
      })
      return
    }

    setLoading(true)
    setMessage(null)
    const cleanEmail = email.trim()

    try {
      await supabase.auth.signOut()
      await new Promise(resolve => setTimeout(resolve, 50))
    } catch {
      /* ignore */
    }

    const { error: signUpError } = await supabase.auth.signUp({
      email: cleanEmail,
      password,
      options: {
        data: {
          full_name: companyName.trim(),
          org_number: orgNumber.trim(),
          website: companyWebsite.trim().replace(/^https?:\/\//i, '').replace(/^www\./i, '').split('/')[0] || companyWebsite.trim(),
          account_type: 'company',
        },
      },
    })

    if (signUpError) {
      const msg = String(signUpError.message || '').toLowerCase()
      if (msg.includes('already registered') || msg.includes('user already registered')) {
        setMessage({ text: DASHBOARD_TEXTS.auth.signup.errors.emailExists ?? 'E-postadressen används redan.', type: 'error' })
      } else if (msg.includes('password')) {
        setMessage({ text: DASHBOARD_TEXTS.auth.signup.errors.weakPassword ?? 'Lösenordet är för svagt.', type: 'error' })
      } else if (msg.includes('email')) {
        setMessage({ text: DASHBOARD_TEXTS.auth.signup.errors.invalidEmail ?? 'Ogiltig e-post.', type: 'error' })
      } else {
        setMessage({ text: signUpError.message ?? DASHBOARD_TEXTS.auth.signup.errors.generic, type: 'error' })
      }
      setLoading(false)
      return
    }

    try {
      await supabase.auth.signOut()
      await new Promise(resolve => setTimeout(resolve, 100))
    } catch {
      /* ignore */
    }

    const { error: otpError } = await supabase.auth.signInWithOtp({
      email: cleanEmail,
      options: { shouldCreateUser: false },
    })

    if (otpError) {
      setMessage({
        text: otpError.message?.includes('rate limit') ? 'För många försök. Försök igen senare.' : 'Kunde inte skicka verifieringskod. Försök igen.',
        type: 'error',
      })
      setLoading(false)
      return
    }

    try {
      sessionStorage.setItem('signup_password_pending_verify', password)
    } catch {
      /* ignore */
    }
    router.push(`/login/verify?email=${encodeURIComponent(cleanEmail)}&type=signup`)
  }

  // Skicka ny OTP-kod för konton som inte är verifierade
  const handleResendOtpForUnverifiedAccount = async () => {
    if (!email.trim()) {
      setMessage({
        text: 'Fyll i din e-postadress för att skicka ny verifieringskod.',
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

    setSendingOtp(true)
    setMessage(null)
    const cleanEmail = email.trim()

    try {
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
        setSendingOtp(false)
        return
      }

      // Lyckat → redirect till verify-sidan
      setMessage({
        text: 'Ny verifieringskod skickad! Kontrollera din e-post.',
        type: 'success',
      })
      try {
        if (password) sessionStorage.setItem('signup_password_pending_verify', password)
      } catch {
        /* ignore */
      }
      setTimeout(() => {
        router.push(`/login/verify?email=${encodeURIComponent(cleanEmail)}&type=signup`)
      }, 1000)
    } catch (err) {
      console.error('Fel vid skickande av OTP:', err)
      setMessage({
        text: 'Ett oväntat fel uppstod. Försök igen.',
        type: 'error',
      })
      setSendingOtp(false)
    }
  }

  // Keyboard navigation - Enter-tangent
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !loading && !sendingOtp) {
      if (activeTab === 'login') {
        handleSignIn()
      } else if (activeTab === 'signup' && signupSubTab === 'company') {
        handleCompanySignUp()
      } else {
        handleSignUp()
      }
    }
  }

  const t = DASHBOARD_TEXTS.auth
  const reason = searchParams.get('reason')
  const isCompanySignup = activeTab === 'signup' && signupSubTab === 'company'
  const companyDomainMismatch =
    isCompanySignup &&
    Boolean(email.trim() && companyWebsite.trim()) &&
    !validateDomainMatch(email.trim(), companyWebsite.trim())
  const companySubmitDisabled =
    isCompanySignup &&
    (companyDomainMismatch || !termsAccepted || !companyName.trim() || !orgNumber.trim() || !companyWebsite.trim())

  return (
    <div className="flex min-h-screen flex-col bg-brand-beige">
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

          {reason === 'private_profile' && (
            <div
              className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800"
              role="alert"
            >
              Du måste logga in för att se privata säljprofiler.
            </div>
          )}

          {searchParams.get('upgrade') === 'email_sent' && (
            <div
              className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800"
              role="status"
            >
              Verifieringslänk skickad till din nya e-post! Logga in med dina nya uppgifter efter verifiering.
            </div>
          )}

        <div className="space-y-4 rounded-xl border p-8 shadow-md bg-white text-brand-text">
          {/* Tabs */}
          <div className="flex border-b border-gray-200 mb-6">
            <button
              type="button"
              onClick={() => {
                setActiveTab('login')
                setMessage(null)
                setNeedsOtpVerification(false)
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
                setNeedsOtpVerification(false)
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

          {/* Signup: underflikar Privat / Företag */}
          {activeTab === 'signup' && (
            <div className="flex border-b border-gray-100 mb-4">
              <button
                type="button"
                onClick={() => {
                  setSignupSubTab('private')
                  setMessage(null)
                }}
                className={`flex-1 pb-2 text-center text-sm font-medium transition-colors ${
                  signupSubTab === 'private' ? 'text-brand-green border-b-2 border-brand-green' : 'text-gray-500 hover:text-brand-text'
                }`}
              >
                Privat
              </button>
              <button
                type="button"
                onClick={() => {
                  setSignupSubTab('company')
                  setMessage(null)
                }}
                className={`flex-1 pb-2 text-center text-sm font-medium transition-colors ${
                  signupSubTab === 'company' ? 'text-brand-green border-b-2 border-brand-green' : 'text-gray-500 hover:text-brand-text'
                }`}
              >
                Företag
              </button>
            </div>
          )}

          {/* Form */}
          <form 
            onSubmit={
              activeTab === 'login'
                ? handleSignIn
                : isCompanySignup
                  ? handleCompanySignUp
                  : handleSignUp
            }
            onKeyDown={handleKeyDown}
            className="space-y-4"
          >
            {/* Företag: Företagsnamn, Orgnr, Webbplats */}
            {isCompanySignup && (
              <>
                <div className="space-y-2">
                  <label htmlFor="company-name" className="text-sm font-medium block">Företagsnamn</label>
                  <input
                    id="company-name"
                    type="text"
                    value={companyName}
                    onChange={(e) => { setCompanyName(e.target.value); setMessage(null) }}
                    placeholder="t.ex. Min Firma AB"
                    className="w-full rounded-xl border border-gray-300 p-3 focus:ring-2 focus:ring-brand-green focus:border-brand-green outline-none text-brand-text"
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="org-number" className="text-sm font-medium block">Organisationsnummer</label>
                  <input
                    id="org-number"
                    type="text"
                    value={orgNumber}
                    onChange={(e) => { setOrgNumber(e.target.value); setMessage(null) }}
                    placeholder="t.ex. 556123-4567"
                    className="w-full rounded-xl border border-gray-300 p-3 focus:ring-2 focus:ring-brand-green focus:border-brand-green outline-none text-brand-text"
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="company-website" className="text-sm font-medium block">Webbplats (domän)</label>
                  <input
                    id="company-website"
                    type="text"
                    value={companyWebsite}
                    onChange={(e) => { setCompanyWebsite(e.target.value); setMessage(null) }}
                    placeholder="t.ex. foretag.se eller www.foretag.se"
                    className="w-full rounded-xl border border-gray-300 p-3 focus:ring-2 focus:ring-brand-green focus:border-brand-green outline-none text-brand-text"
                  />
                </div>
              </>
            )}

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
                  setNeedsOtpVerification(false)
                }}
                aria-label={t.login.email}
                aria-required="true"
              />
              {companyDomainMismatch && (
                <p className="text-xs text-red-600" role="alert">
                  E-postens domän måste matcha webbplatsens domän.
                </p>
              )}
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

            {/* Företag: godkänn villkor */}
            {isCompanySignup && (
              <div className="flex items-start gap-2">
                <input
                  id="terms"
                  type="checkbox"
                  checked={termsAccepted}
                  onChange={(e) => { setTermsAccepted(e.target.checked); setMessage(null) }}
                  className="mt-1 rounded border-gray-300 text-brand-green focus:ring-brand-green"
                  aria-describedby="terms-desc"
                />
                <label htmlFor="terms" id="terms-desc" className="text-sm text-brand-text">
                  Jag godkänner{' '}
                  <Link href="/villkor" className="text-brand-green hover:underline" target="_blank" rel="noopener noreferrer">
                    villkoren
                  </Link>
                  .
                </label>
              </div>
            )}

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

            {/* Knapp för att skicka ny OTP-kod när kontot inte är verifierat */}
            {needsOtpVerification && (
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={handleResendOtpForUnverifiedAccount}
                  disabled={sendingOtp || loading}
                  className="w-full rounded-xl border-2 border-brand-green p-3 text-brand-green font-medium hover:bg-brand-green/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-brand-green focus:ring-offset-2"
                >
                  {sendingOtp ? 'Skickar ny kod...' : 'Skicka ny verifieringskod'}
                </button>
                <p className="text-xs text-center text-gray-600">
                  Vi skickar en ny 6-siffrig kod till din e-post så att du kan slutföra registreringen.
                </p>
              </div>
            )}
            
            {/* Submit-knapp */}
            <button
              type="submit"
              disabled={loading || (isCompanySignup ? companySubmitDisabled : false)}
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

