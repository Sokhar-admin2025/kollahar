'use client'

import { useRouter } from 'next/navigation'

import { DASHBOARD_TEXTS } from '../../lib/content'
import Button from '../../components/atoms/Button'
import CreateListingForm from '../../components/CreateListingForm'

export default function CreateListing() {
  const router = useRouter()
  const t = DASHBOARD_TEXTS.create

  return (
    <div className="min-h-screen bg-brand-beige py-10 px-4">
      <div className="max-w-2xl mx-auto">
        
        <div className="mb-8 flex items-center justify-between">
          <h1 className="text-3xl font-display text-brand-green">{t.header}</h1>
          <Button variant="link" onClick={() => router.push('/dashboard')}>
            {t.backLink}
          </Button>
        </div>

        <CreateListingForm />
      </div>
    </div>
  )
}