'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

import { DASHBOARD_TEXTS } from '../../../lib/content'
import Button from '../../../components/atoms/Button'
import CreateListingForm from '../../../components/CreateListingForm'
import type { Listing } from '../../../types'

export default function EditListing() {
  const router = useRouter()
  const params = useParams()
  const id = params?.id as string

  const [listing, setListing] = useState<Listing | null>(null)
  const [fetching, setFetching] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const tEdit = DASHBOARD_TEXTS.edit

  useEffect(() => {
    const fetchListing = async () => {
      const client = createClient()
      try {
        const { data: { user } } = await client.auth.getUser()
        
        if (!user) {
          router.push('/login')
          return
        }

        // Hämta annonsen och verifiera ägare
        const { data, error: fetchError } = await client
          .from('listings')
          .select('*')
          .eq('id', id)
          .single()

        if (fetchError || !data) {
          setError('Kunde inte hitta annonsen.')
          setFetching(false)
          return
        }

        // Säkerhetskontroll: Verifiera att användaren äger annonsen
        if (data.user_id !== user.id) {
          setError('Du har inte behörighet att redigera denna annons.')
          setFetching(false)
          return
        }

        setListing(data as Listing)
        setFetching(false)
      } catch (err: any) {
        console.error('Error fetching listing:', err)
        setError('Ett fel uppstod vid hämtning av annonsen.')
        setFetching(false)
      }
    }

    if (id) {
      fetchListing()
    }
  }, [id, router])

  if (fetching) {
    return (
      <div className="min-h-screen bg-brand-beige py-10 px-4">
        <div className="max-w-2xl mx-auto">
          <div className="p-10 text-center text-brand-text/70">{tEdit.loadingData}</div>
        </div>
      </div>
    )
  }

  if (error || !listing) {
    return (
      <div className="min-h-screen bg-brand-beige py-10 px-4">
        <div className="max-w-2xl mx-auto">
          <div className="mb-8 flex items-center justify-between">
            <h1 className="text-3xl font-display text-brand-green">{tEdit.header}</h1>
            <Button variant="link" onClick={() => router.push('/dashboard')}>
              {tEdit.backLink}
            </Button>
          </div>
          <div className="bg-white p-8 rounded-xl shadow-md border border-gray-200">
            <p className="text-red-600 mb-4">{error || 'Annonsen hittades inte.'}</p>
            <Button variant="primary" onClick={() => router.push('/dashboard')}>
              Tillbaka till Dashboard
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-brand-beige py-10 px-4">
      <div className="max-w-2xl mx-auto">
        
        <div className="mb-8 flex items-center justify-between">
          <h1 className="text-3xl font-display text-brand-green">{tEdit.header}</h1>
          <Button variant="link" onClick={() => router.push('/dashboard')}>
            {tEdit.backLink}
          </Button>
        </div>

        <CreateListingForm initialData={listing} />
      </div>
    </div>
  )
}