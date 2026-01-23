'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { AUTH_CONFIG } from '@/lib/constants'

// Kopplingen till Supabase
const supabase = createClient()

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  
  // Vi delar upp meddelandet i text och typ (error eller success)
  const [message, setMessage] = useState<{ text: string; type: 'error' | 'success' } | null>(null)
  
  const router = useRouter()

  const handleSignIn = async () => {
    setLoading(true)
    setMessage(null)
    const cleanEmail = email.trim()

    const { error } = await supabase.auth.signInWithPassword({
      email: cleanEmail,
      password,
    })

    if (error) {
      setMessage({ text: 'Fel: ' + error.message, type: 'error' })
      setLoading(false)
    } else {
      // Lyckad inloggning
      setMessage({ text: 'Inloggad! Skickar vidare...', type: 'success' })
      setTimeout(() => {
        router.push('/') // Skickar användaren till startsidan
        router.refresh()
      }, 1000)
    }
  }

  const handleSignUp = async () => {
    setLoading(true)
    setMessage(null)
    const cleanEmail = email.trim()
    
    // Validera lösenordslängd innan anrop till Supabase
    if (password.length < AUTH_CONFIG.MIN_PASSWORD_LENGTH) {
      setMessage({ 
        text: `Lösenordet måste vara minst ${AUTH_CONFIG.MIN_PASSWORD_LENGTH} tecken långt.`, 
        type: 'error' 
      })
      setLoading(false)
      return
    }
    
    const { error } = await supabase.auth.signUp({
      email: cleanEmail,
      password,
    })

    if (error) {
      setMessage({ text: 'Kunde inte skapa konto: ' + error.message, type: 'error' })
      setLoading(false)
    } else {
      setMessage({ text: 'Konto skapat! Du kan nu logga in.', type: 'success' })
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4 bg-brand-beige">
      <div className="w-full max-w-md space-y-4">
        <button
          type="button"
          onClick={() => router.push('/')}
          className="mb-2 inline-block text-sm font-medium text-brand-text/70 hover:text-brand-green transition"
        >
          ← Tillbaka till annonserna
        </button>
        <div className="space-y-4 rounded-xl border p-8 shadow-md bg-white text-brand-text">
          <h1 className="text-2xl font-display text-brand-green text-center mb-6">Logga in / Skapa konto</h1>
          
          <div className="space-y-2">
            <label className="text-sm font-medium">E-post</label>
            <input
              className="w-full rounded-xl border border-gray-300 p-2 focus:ring-2 focus:ring-brand-green focus:border-brand-green outline-none"
              type="email"
              placeholder="din@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium">Lösenord</label>
            <input
              className={`w-full rounded-xl border p-2 focus:ring-2 focus:ring-brand-green outline-none ${
                password.length > 0 && password.length < AUTH_CONFIG.MIN_PASSWORD_LENGTH
                  ? 'border-red-300 focus:ring-red-500'
                  : 'border-gray-300'
              }`}
              type="password"
              placeholder={`Minst ${AUTH_CONFIG.MIN_PASSWORD_LENGTH} tecken`}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            {password.length > 0 && password.length < AUTH_CONFIG.MIN_PASSWORD_LENGTH && (
              <p className="text-xs text-red-600">
                Lösenordet måste vara minst {AUTH_CONFIG.MIN_PASSWORD_LENGTH} tecken långt.
              </p>
            )}
          </div>
          
          {/* Här kollar vi om meddelandet är error (rött) eller success (grönt) */}
          {message && (
            <div className={`p-3 rounded text-sm text-center ${
              message.type === 'error' 
                ? 'bg-red-100 text-red-700' 
                : 'bg-green-100 text-green-700'
            }`}>
              {message.text}
            </div>
          )}
          
          <div className="flex flex-col gap-3 mt-6">
            <button
              onClick={handleSignIn}
              disabled={loading}
              className="w-full rounded-xl bg-brand-green p-3 text-white font-medium hover:bg-brand-green/90 disabled:opacity-50 transition-colors shadow-md"
            >
              {loading ? 'Arbetar...' : 'Logga in'}
            </button>
            
            <button
              onClick={handleSignUp}
              disabled={loading}
              className="w-full rounded-xl border border-brand-green p-3 text-brand-green font-medium hover:bg-brand-green/10 disabled:opacity-50 transition-colors"
            >
              Skapa nytt konto
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}