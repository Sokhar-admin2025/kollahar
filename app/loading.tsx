'use client'

import { Loader2 } from 'lucide-react'

export default function RootLoading() {
  return (
    <div className="min-h-screen bg-brand-beige flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div
          className="flex items-center justify-center rounded-full border-4 border-brand-green/20 border-t-brand-green w-12 h-12 animate-spin"
          aria-hidden="true"
        >
          <Loader2 className="w-6 h-6 text-brand-green" />
        </div>
        <p className="text-sm text-brand-text/60 antialiased">
          Laddar...
        </p>
      </div>
    </div>
  )
}

