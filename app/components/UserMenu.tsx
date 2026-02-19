'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { User as UserIcon } from 'lucide-react'

const supabase = createClient()

interface Profile {
  full_name: string | null
  avatar_url: string | null
}

export default function UserMenu() {
  const router = useRouter()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [email, setEmail] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement | null>(null)

  // Hämta inloggad användare + profil och lyssna på auth-state-ändringar
  useEffect(() => {
    let isMounted = true

    const loadProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!isMounted) return

      if (!user) {
        // Användare loggad ut - rensa state
        setEmail(null)
        setProfile(null)
        setOpen(false)
        return
      }

      setEmail(user.email ?? null)

      const { data } = await supabase
        .from('profiles')
        .select('full_name, avatar_url')
        .eq('id', user.id)
        .maybeSingle()

      if (!isMounted) return

      if (data) {
        setProfile({
          full_name: data.full_name,
          avatar_url: data.avatar_url,
        })
      } else {
        setProfile({ full_name: null, avatar_url: null })
      }
    }

    // Ladda initial profil
    loadProfile()

    // Lyssna på auth-state-ändringar (t.ex. logout)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!isMounted) return
      if (!session?.user) {
        // Logout - rensa state omedelbart
        setEmail(null)
        setProfile(null)
        setOpen(false)
      } else {
        // Session finns - ladda profil igen
        loadProfile()
      }
    })

    return () => {
      isMounted = false
      subscription.unsubscribe()
    }
  }, [])

  // Stäng menyn vid klick utanför
  useEffect(() => {
    if (!open) return

    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  const handleSignOut = async () => {
    setOpen(false) // Stäng menyn direkt för bättre UX
    await supabase.auth.signOut() // onAuthStateChange kommer att rensa state automatiskt
    router.push('/?logged_out=true')
    router.refresh()
  }

  const displayName = profile?.full_name || email || 'Användare'
  const initials = displayName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase())
    .join('') || 'U'

  const hasAvatar = Boolean(profile?.avatar_url)

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="inline-flex items-center justify-center h-10 w-10 rounded-full border border-brand-green/30 bg-white text-brand-green hover:bg-brand-green/10 focus:outline-none focus:ring-2 focus:ring-brand-green focus:ring-offset-2 focus:ring-offset-white"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Öppna användarmeny"
      >
        {hasAvatar ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={profile!.avatar_url!}
            alt={displayName}
            className="h-9 w-9 rounded-full object-cover"
          />
        ) : (
          <span className="flex items-center justify-center h-9 w-9 rounded-full bg-brand-green text-white text-sm font-semibold">
            {initials.length <= 2 ? initials : <UserIcon className="h-5 w-5" aria-hidden="true" />}
          </span>
        )}
      </button>

      {open && (
        <div
          className="absolute right-0 mt-2 w-56 rounded-xl bg-white shadow-lg border border-gray-100 py-2 z-30"
          role="menu"
          aria-label="Användarmeny"
        >
          <div className="px-4 py-2 border-b border-gray-100">
            <p className="text-sm font-semibold text-brand-text line-clamp-1">{displayName}</p>
          </div>

          <button
            type="button"
            className="w-full text-left px-4 py-2 text-sm text-brand-text hover:bg-brand-beige focus:outline-none focus:bg-brand-beige"
            onClick={() => {
              setOpen(false)
              router.push('/dashboard')
            }}
            role="menuitem"
          >
            Min Dashboard
          </button>

          <button
            type="button"
            className="w-full text-left px-4 py-2 text-sm text-brand-text hover:bg-brand-beige focus:outline-none focus:bg-brand-beige"
            onClick={() => {
              setOpen(false)
              router.push('/dashboard/settings')
            }}
            role="menuitem"
          >
            Inställningar
          </button>

          <button
            type="button"
            className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 focus:outline-none focus:bg-red-50"
            onClick={handleSignOut}
            role="menuitem"
          >
            Logga ut
          </button>
        </div>
      )}
    </div>
  )
}

