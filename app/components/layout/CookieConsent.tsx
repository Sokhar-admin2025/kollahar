'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

export default function CookieConsent() {
  const [showBanner, setShowBanner] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!localStorage.getItem('cookie_consent')) {
      setShowBanner(true)
    }
  }, [])

  const handleAccept = () => {
    // Spara samtycke i localStorage
    localStorage.setItem('cookie_consent', 'true')
    setShowBanner(false)
  }

  // Visa ingenting om bannern inte ska visas
  if (!showBanner) {
    return null
  }

  return (
    <div 
      className="fixed bottom-0 left-0 right-0 z-50 text-white px-4 py-4 md:py-3 shadow-lg"
      style={{ backgroundColor: '#1a2e26' }} // Mörkgrön enligt bildbeskrivning
      role="banner"
      aria-label="Cookie consent"
    >
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          {/* Text */}
          <div className="flex-1 text-sm md:text-base leading-relaxed antialiased">
            <p>
              Vi använder nödvändiga kakor för att sajten ska fungera. Genom att använda Kolla här! godkänner du detta.
            </p>
          </div>

          {/* Knappar */}
          <div className="flex items-center gap-4 flex-shrink-0">
            {/* "Läs mer" länk */}
            <Link
              href="/cookies"
              className="text-white underline hover:opacity-80 transition-opacity text-sm md:text-base antialiased"
            >
              Läs mer
            </Link>

            {/* OK-knapp - grön bakgrund med vit text */}
            <button
              onClick={handleAccept}
              className="bg-brand-green text-white px-6 py-2 rounded-xl font-medium hover:bg-brand-green/90 transition-colors focus:outline-none focus:ring-2 focus:ring-brand-green focus:ring-offset-2 focus:ring-offset-[#1a2e26] text-sm md:text-base antialiased"
              aria-label="Godkänn cookies"
            >
              OK
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
