'use client'

import { useEffect } from 'react'

/** Mät scrollbar-bredd även när sidan är kort (ingen synlig scrollbar). */
function getScrollbarWidth(): number {
  if (typeof document === 'undefined' || !document.body) return 0
  try {
    const outer = document.createElement('div')
    outer.style.cssText = 'overflow:scroll; position:absolute; top:-9999px; width:100px; height:1px;'
    document.body.appendChild(outer)
    const width = outer.offsetWidth - outer.clientWidth
    document.body.removeChild(outer)
    return width
  } catch {
    return 0
  }
}

/**
 * Sätter CSS-variabel --scrollbar-width så att innehållets bredd inte hoppar
 * när scrollbar dyker upp (desktop, särskilt Safari med overlay-scrollbar).
 */
export default function ScrollbarGutter() {
  useEffect(() => {
    if (typeof document === 'undefined' || !document.documentElement) return
    const w = getScrollbarWidth()
    document.documentElement.style.setProperty('--scrollbar-width', `${w}px`)
    return () => {
      try {
        document.documentElement.style.removeProperty('--scrollbar-width')
      } catch {
        // Ignorera vid unmount om DOM inte längre tillgänglig
      }
    }
  }, [])

  return null
}
