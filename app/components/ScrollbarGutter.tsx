'use client'

import { useEffect } from 'react'

/** Mät scrollbar-bredd även när sidan är kort (ingen synlig scrollbar). */
function getScrollbarWidth(): number {
  if (typeof document === 'undefined') return 0
  const outer = document.createElement('div')
  outer.style.cssText = 'overflow:scroll; position:absolute; top:-9999px; width:100px; height:1px;'
  document.body.appendChild(outer)
  const width = outer.offsetWidth - outer.clientWidth
  document.body.removeChild(outer)
  return width
}

/**
 * Sätter CSS-variabel --scrollbar-width så att innehållets bredd inte hoppar
 * när scrollbar dyker upp (desktop, särskilt Safari med overlay-scrollbar).
 */
export default function ScrollbarGutter() {
  useEffect(() => {
    const w = getScrollbarWidth()
    document.documentElement.style.setProperty('--scrollbar-width', `${w}px`)
    return () => {
      document.documentElement.style.removeProperty('--scrollbar-width')
    }
  }, [])

  return null
}
