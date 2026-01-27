'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { DASHBOARD_TEXTS } from '@/app/lib/content'
import { X, Check } from 'lucide-react'

const supabase = createClient()

interface WelcomePopupProps {
  userId: string | null
  onClose: () => void
}

export default function WelcomePopup({ userId, onClose }: WelcomePopupProps) {
  const router = useRouter()
  const [dontShowAgain, setDontShowAgain] = useState(false)
  const [closing, setClosing] = useState(false)

  // Spåra popup-visning i databas
  useEffect(() => {
    if (!userId) return

    const trackPopupView = async () => {
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('welcome_popup_view_count, welcome_popup_last_shown')
          .eq('id', userId)
          .single()

        if (profile) {
          await supabase
            .from('profiles')
            .update({
              welcome_popup_last_shown: new Date().toISOString(),
              welcome_popup_view_count: (profile.welcome_popup_view_count || 0) + 1,
            })
            .eq('id', userId)
        }
      } catch (error) {
        console.error('Kunde inte spåra popup-visning:', error)
        // Fortsätt ändå - detta är inte kritiskt
      }
    }

    trackPopupView()
  }, [userId])

  const handleClose = async () => {
    setClosing(true)

    // Om användaren valt att inte visa igen, spara det i databas
    if (dontShowAgain && userId) {
      try {
        await supabase
          .from('profiles')
          .update({ welcome_popup_dismissed: true })
          .eq('id', userId)
      } catch (error) {
        console.error('Kunde inte spara popup-inställning:', error)
      }
    }

    // Animerad stängning
    setTimeout(() => {
      onClose()
    }, 200)
  }

  const handleAction = (path: string) => {
    handleClose()
    router.push(path)
  }

  const t = DASHBOARD_TEXTS.auth.welcome

  return (
    <>
      {/* Overlay */}
      <div 
        className={`fixed inset-0 bg-black/50 z-50 transition-opacity ${
          closing ? 'opacity-0' : 'opacity-100'
        }`}
        onClick={handleClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div 
        className={`fixed inset-0 z-50 flex items-center justify-center p-4 ${
          closing ? 'opacity-0 scale-95' : 'opacity-100 scale-100'
        } transition-all duration-200`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="welcome-title"
      >
        <div 
          className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 space-y-6 relative"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Stäng-knapp */}
          <button
            type="button"
            onClick={handleClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-brand-text focus:outline-none focus:ring-2 focus:ring-brand-green rounded-full p-1"
            aria-label="Stäng"
          >
            <X size={20} />
          </button>

          {/* Innehåll */}
          <div className="text-center space-y-4">
            <h2 
              id="welcome-title"
              className="text-2xl font-display text-brand-green"
            >
              {t.title}
            </h2>
            <p className="text-gray-600">
              {t.subtitle}
            </p>
          </div>

          {/* Knappar */}
          <div className="space-y-3">
            <button
              type="button"
              onClick={() => handleAction('/')}
              className="w-full rounded-xl bg-brand-green p-3 text-white font-medium hover:bg-brand-green/90 transition-colors shadow-md focus:outline-none focus:ring-2 focus:ring-brand-green focus:ring-offset-2"
            >
              {t.browseAds}
            </button>
            
            <button
              type="button"
              onClick={() => handleAction('/dashboard/create')}
              className="w-full rounded-xl border-2 border-brand-green p-3 text-brand-green font-medium hover:bg-brand-green/10 transition-colors focus:outline-none focus:ring-2 focus:ring-brand-green focus:ring-offset-2"
            >
              {t.createAd}
            </button>
            
            <button
              type="button"
              onClick={() => handleAction('/dashboard')}
              className="w-full rounded-xl border border-gray-300 p-3 text-brand-text font-medium hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-brand-green focus:ring-offset-2"
            >
              {t.goToProfile}
            </button>
          </div>

          {/* Checkbox för "Visa inte igen" */}
          <div className="flex items-center gap-2 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={() => setDontShowAgain(!dontShowAgain)}
              className={`flex items-center justify-center w-5 h-5 rounded border-2 transition-colors focus:outline-none focus:ring-2 focus:ring-brand-green ${
                dontShowAgain
                  ? 'bg-brand-green border-brand-green'
                  : 'border-gray-300 hover:border-brand-green'
              }`}
              aria-label={t.dontShowAgain}
              aria-checked={dontShowAgain}
              role="checkbox"
            >
              {dontShowAgain && <Check size={14} className="text-white" />}
            </button>
            <label
              onClick={() => setDontShowAgain(!dontShowAgain)}
              className="text-sm text-gray-600 cursor-pointer select-none"
            >
              {t.dontShowAgain}
            </label>
          </div>
        </div>
      </div>
    </>
  )
}
