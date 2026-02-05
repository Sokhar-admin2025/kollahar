'use client'

import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Search, X, Menu } from 'lucide-react'
import { useEffect, useState } from 'react'
import UserMenu from '../UserMenu'
import Button from '../atoms/Button'
import { DASHBOARD_TEXTS } from '@/app/lib/content'

const supabase = createClient()

interface HeaderProps {
  showSearch?: boolean
  searchQuery?: string
  onSearchChange?: (value: string) => void
  onSearchSubmit?: (e: React.FormEvent) => void
  onClearSearch?: () => void
}

export default function Header({
  showSearch = false,
  searchQuery = '',
  onSearchChange,
  onSearchSubmit,
  onClearSearch,
}: HeaderProps) {
  const router = useRouter()
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [isVerified, setIsVerified] = useState<boolean>(true) // Default true för att inte låsa ute gamla användare
  const t = DASHBOARD_TEXTS

  useEffect(() => {
    const initAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      const userId = user?.id ?? null

      // VIKTIGT: Kontrollera OTP-status INNAN vi sätter currentUserId
      // Detta förhindrar att profilikonen blinkar fram när sidan laddas
      if (userId) {
        try {
          const { data: profile } = await supabase
            .from('profiles')
            .select('otp_verified')
            .eq('id', userId)
            .single()

          const otpVerified =
            profile && typeof profile.otp_verified === 'boolean'
              ? profile.otp_verified
              : true // Fallback: lås inte ute användare om vi inte kan kontrollera

          setIsVerified(otpVerified)

          // Om kontot inte är verifierat → logga ut omedelbart och visa INTE profilikonen
          if (!otpVerified) {
            await supabase.auth.signOut()
            setCurrentUserId(null)
            setIsVerified(true)
            return // Avbryt här så att vi inte sätter currentUserId
          }

          // Endast om kontot är verifierat → visa profilikonen
          setCurrentUserId(userId)
        } catch (err) {
          // Om vi inte kan kontrollera → lås inte ute användaren (fallback)
          console.warn('Kunde inte kontrollera OTP-status i header:', err)
          setIsVerified(true)
          setCurrentUserId(userId)
        }
      } else {
        setCurrentUserId(null)
        setIsVerified(true)
      }
    }

    initAuth()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const userId = session?.user?.id ?? null

      // VIKTIGT: Kontrollera OTP-status INNAN vi sätter currentUserId
      // Detta förhindrar att profilikonen blinkar fram när en session skapas
      if (userId) {
        try {
          const { data: profile } = await supabase
            .from('profiles')
            .select('otp_verified')
            .eq('id', userId)
            .single()

          const otpVerified =
            profile && typeof profile.otp_verified === 'boolean'
              ? profile.otp_verified
              : true

          setIsVerified(otpVerified)

          // Om kontot inte är verifierat → logga ut omedelbart och visa INTE profilikonen
          if (!otpVerified) {
            await supabase.auth.signOut()
            setCurrentUserId(null)
            setIsVerified(true)
            return // Avbryt här så att vi inte sätter currentUserId
          }

          // Endast om kontot är verifierat → visa profilikonen
          setCurrentUserId(userId)
        } catch (err) {
          console.warn('Kunde inte kontrollera OTP-status vid auth state change:', err)
          // Fallback: lås inte ute användaren om vi inte kan kontrollera
          setIsVerified(true)
          setCurrentUserId(userId)
        }
      } else {
        setCurrentUserId(null)
        setIsVerified(true)
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  const handleSellClick = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      // Kontrollera OTP-status innan navigation
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('otp_verified')
          .eq('id', user.id)
          .single()

        const otpVerified =
          profile && typeof profile.otp_verified === 'boolean'
            ? profile.otp_verified
            : true

        if (otpVerified) {
          router.push('/dashboard/create')
        } else {
          // Kontot inte verifierat → redirect till login
          await supabase.auth.signOut()
          router.push('/login')
        }
      } catch {
        // Fallback: lås inte ute användaren om vi inte kan kontrollera
        router.push('/dashboard/create')
      }
    } else {
      router.push('/login')
    }
  }

  const handleDashboardClick = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      // Kontrollera OTP-status innan navigation
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('otp_verified')
          .eq('id', user.id)
          .single()

        const otpVerified =
          profile && typeof profile.otp_verified === 'boolean'
            ? profile.otp_verified
            : true

        if (otpVerified) {
          router.push('/dashboard')
        } else {
          // Kontot inte verifierat → redirect till login
          await supabase.auth.signOut()
          router.push('/login')
        }
      } catch {
        // Fallback: lås inte ute användaren om vi inte kan kontrollera
        router.push('/dashboard')
      }
    } else {
      router.push('/login')
    }
  }

  return (
    <nav className="bg-white border-b border-gray-200 p-4 sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-2">
        {/* Logotyp / Brand */}
        <button
          type="button"
          onClick={() => router.push('/')}
          className="text-2xl md:text-3xl font-display text-brand-green tracking-tight cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand-green focus:ring-offset-2 focus:ring-offset-white"
        >
          {t.navigation.brand}
        </button>

        {/* Sökfält - Desktop (endast om showSearch är true) */}
        {showSearch && (
          <div className="hidden md:flex flex-1 justify-start ml-4">
            <form onSubmit={onSearchSubmit} className="relative w-full max-w-xl">
              <Search
                className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-text/50 z-10"
                size={20}
                aria-hidden="true"
              />
              <input
                type="search"
                aria-label={t.landing.search.placeholder}
                placeholder={t.landing.search.placeholder}
                value={searchQuery}
                onChange={(e) => onSearchChange?.(e.target.value)}
                className="w-full pl-11 pr-20 py-2.5 rounded-full border border-gray-300 text-sm md:text-base bg-white text-brand-text focus:outline-none focus:ring-2 focus:ring-brand-green focus:border-brand-green placeholder:text-brand-text/50"
              />
              {searchQuery && onClearSearch && (
                <button
                  type="button"
                  onClick={onClearSearch}
                  className="absolute right-20 top-1/2 -translate-y-1/2 p-1 text-brand-text/50 hover:text-brand-text focus:outline-none focus:ring-2 focus:ring-brand-green rounded-full transition-colors"
                  aria-label="Rensa sökning"
                >
                  <X size={18} aria-hidden="true" />
                </button>
              )}
              <button
                type="submit"
                className="absolute right-2 top-1/2 -translate-y-1/2 px-4 py-1.5 bg-brand-green text-white text-sm font-medium rounded-full hover:bg-brand-green/90 focus:outline-none focus:ring-2 focus:ring-brand-green focus:ring-offset-2 transition-colors"
                aria-label="Sök"
              >
                Sök
              </button>
            </form>
          </div>
        )}

        {/* Navigation / Actions */}
        <div className="flex items-center gap-2">
          {/* Desktop: UserMenu för inloggad OCH verifierad, annars Logga in + Sälj-knapp */}
          {currentUserId && isVerified ? (
            <div className="hidden md:flex items-center gap-3">
              <Button onClick={handleSellClick}>
                {t.navigation.sellBtn}
              </Button>
              <UserMenu />
            </div>
          ) : (
            <div className="hidden md:flex items-center gap-3">
              <button
                type="button"
                onClick={() => router.push('/login')}
                className="text-sm font-medium hover:underline text-brand-text/70 hover:text-brand-green transition"
              >
                Logga in
              </button>
              <Button onClick={handleSellClick}>
                {t.navigation.sellBtn}
              </Button>
            </div>
          )}

          {/* Mobil: enklare menyikon */}
          <button
            type="button"
            onClick={handleDashboardClick}
            className="inline-flex md:hidden items-center justify-center h-10 w-10 rounded-full border border-brand-green/30 text-brand-green hover:bg-brand-green/10 focus:outline-none focus:ring-2 focus:ring-brand-green focus:ring-offset-2 focus:ring-offset-white"
            aria-label={currentUserId && isVerified ? 'Öppna Min Dashboard' : 'Logga in'}
          >
            <Menu size={20} aria-hidden="true" />
          </button>
        </div>
      </div>
    </nav>
  )
}
