'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

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
    <div className="flex min-h-screen flex-col items-center justify-center p-4 bg-gray-50">
      <div className="w-full max-w-md space-y-4 rounded-lg border p-8 shadow-lg bg-white text-black">
        <h1 className="text-2xl font-bold text-center mb-6">Logga in / Skapa konto</h1>
        
        <div className="space-y-2">
          <label className="text-sm font-medium">E-post</label>
          <input
            className="w-full rounded border border-gray-300 p-2 focus:ring-2 focus:ring-blue-500 outline-none"
            type="email"
            placeholder="din@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        
        <div className="space-y-2">
          <label className="text-sm font-medium">Lösenord</label>
          <input
            className="w-full rounded border border-gray-300 p-2 focus:ring-2 focus:ring-blue-500 outline-none"
            type="password"
            placeholder="Minst 6 tecken"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
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
            className="w-full rounded bg-black p-3 text-white font-medium hover:bg-gray-800 disabled:opacity-50 transition-colors"
          >
            {loading ? 'Arbetar...' : 'Logga in'}
          </button>

          <button
            onClick={handleSignUp}
            disabled={loading}
            className="w-full rounded border border-gray-300 p-3 text-gray-700 font-medium hover:bg-gray-50 disabled:opacity-50 transition-colors"
          >
            Skapa nytt konto
          </button>
        </div>
      </div>
    </div>
  )
}