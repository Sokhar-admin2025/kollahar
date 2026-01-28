import { Suspense } from 'react'
import VerifyPageContent from './VerifyPageContent'

export default function VerifyPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-brand-beige text-brand-text">
          Laddar verifiering...
        </div>
      }
    >
      <VerifyPageContent />
    </Suspense>
  )
}

