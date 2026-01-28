import { Suspense } from 'react'
import LoginPageContent from './LoginPageContent'

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-brand-beige text-brand-text">
          Laddar inloggning...
        </div>
      }
    >
      <LoginPageContent />
    </Suspense>
  )
}

