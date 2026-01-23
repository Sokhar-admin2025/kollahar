'use client'

import { useEffect, useState, useRef } from 'react'
import { ArrowUp } from 'lucide-react'

interface ScrollToSearchProps {
  heroElementId?: string
}

export default function ScrollToSearch({ 
  heroElementId = 'hero-section'
}: ScrollToSearchProps) {
  const [isVisible, setIsVisible] = useState(false)
  const lastScrollYRef = useRef(0)

  useEffect(() => {
    let ticking = false

    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const currentScrollY = window.scrollY
          const heroElement = document.getElementById(heroElementId)
          
          // Bestäm scroll-riktning
          const direction = currentScrollY > lastScrollYRef.current ? 'down' : 'up'
          lastScrollYRef.current = currentScrollY

          // Kolla om Hero är synlig
          let heroVisible = false
          if (heroElement) {
            const rect = heroElement.getBoundingClientRect()
            heroVisible = rect.bottom > 0 && rect.top < window.innerHeight
          }

          // Visa knappen när:
          // 1. Användaren scrollar uppåt OCH
          // 2. Hero inte är synlig
          if (direction === 'up' && !heroVisible) {
            setIsVisible(true)
          } else if (direction === 'down' || heroVisible) {
            setIsVisible(false)
          }

          ticking = false
        })
        ticking = true
      }
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [heroElementId])

  const handleClick = () => {
    // Scrolla till toppen av sidan
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  if (!isVisible) return null

  return (
    <button
      onClick={handleClick}
      className="fixed bottom-6 right-6 z-50 bg-brand-green text-white p-4 rounded-full shadow-lg hover:bg-brand-green/90 focus:outline-none focus:ring-2 focus:ring-brand-green focus:ring-offset-2 transition-all duration-300 hover:scale-110"
      aria-label="Tillbaka till toppen"
      title="Tillbaka till toppen"
    >
      <ArrowUp size={24} aria-hidden="true" />
    </button>
  )
}
