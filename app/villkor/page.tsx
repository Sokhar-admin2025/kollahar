import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Användarvillkor',
  description: 'Användarvillkor för Kolla här!',
}

export default function VillkorPage() {
  return (
    <div className="min-h-screen bg-brand-beige py-12 md:py-16">
      <div className="max-w-3xl mx-auto px-6">
        <div className="bg-white rounded-xl shadow-sm p-8 md:p-12">
          <h1 className="text-2xl font-display text-brand-text mb-4">Användarvillkor</h1>
          <p className="text-brand-text/80">Användarvillkor kommer snart.</p>
          <Link
            href="/"
            className="inline-block mt-6 text-sm font-medium text-brand-green hover:underline"
          >
            ← Tillbaka
          </Link>
        </div>
      </div>
    </div>
  )
}
