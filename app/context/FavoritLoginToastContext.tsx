'use client'

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'

const FavoritLoginToastContext = createContext<{
  showFavoritLoginToast: () => void
}>({
  showFavoritLoginToast: () => {},
})

export function FavoritLoginToastProvider({ children }: { children: ReactNode }) {
  const [show, setShow] = useState(false)

  const showFavoritLoginToast = useCallback(() => {
    setShow(true)
  }, [])

  return (
    <FavoritLoginToastContext.Provider value={{ showFavoritLoginToast }}>
      {children}
      {show && (
        <div
          className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-amber-600 text-white text-sm px-4 py-2 rounded-full shadow-lg flex items-center gap-2"
          role="status"
          aria-live="polite"
        >
          <span>Logga in för att spara favoriter.</span>
          <button
            type="button"
            onClick={() => setShow(false)}
            className="text-white/80 hover:text-white underline text-xs"
          >
            Stäng
          </button>
        </div>
      )}
    </FavoritLoginToastContext.Provider>
  )
}

export function useFavoritLoginToast() {
  return useContext(FavoritLoginToastContext)
}
