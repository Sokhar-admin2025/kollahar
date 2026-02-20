'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Upload, ArrowLeft } from 'lucide-react'
import Button from '@/app/components/atoms/Button'

export default function ImportPage() {
  const router = useRouter()
  const [file, setFile] = useState<File | null>(null)
  const [status, setStatus] = useState<'idle' | 'uploading' | 'done' | 'error'>('idle')
  const [message, setMessage] = useState<string>('')
  const [errors, setErrors] = useState<string[]>([])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!file) return
    setStatus('uploading')
    setMessage('')
    setErrors([])

    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch('/api/import-smistabil', {
        method: 'POST',
        body: formData,
      })
      const data = await res.json()

      if (!res.ok) {
        setStatus('error')
        setMessage(data.error ?? `Fel: ${res.status}`)
        return
      }

      setStatus('done')
      setMessage(data.message ?? 'Import klar.')
      setErrors(Array.isArray(data.errors) ? data.errors : [])
      setFile(null)
      router.refresh()
    } catch (err) {
      setStatus('error')
      setMessage(err instanceof Error ? err.message : 'Något gick fel.')
    }
  }

  return (
    <div className="min-h-screen bg-brand-beige flex flex-col">
      <div className="max-w-xl mx-auto py-10 px-4 flex-grow">
        <div className="mb-8 flex items-center justify-between">
          <h1 className="text-3xl font-display text-brand-green">Importera Smistabil CSV</h1>
          <Button variant="link" onClick={() => router.push('/dashboard')}>
            <ArrowLeft className="w-4 h-4 mr-1 inline" />
            Tillbaka
          </Button>
        </div>

        <p className="text-brand-gray mb-6">
          Ladda upp en CSV-fil i Smistabil-format. Annonserna skapas under ditt konto (MNG Productions)
          med generiska kontaktuppgifter för demo.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block">
            <span className="text-sm font-medium text-brand-gray">CSV-fil</span>
            <input
              type="file"
              accept=".csv"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="mt-2 block w-full text-sm text-brand-gray file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-medium file:bg-brand-green file:text-white hover:file:bg-brand-green/90"
            />
          </label>

          <Button
            type="submit"
            disabled={!file || status === 'uploading'}
            className="flex items-center gap-2"
          >
            {status === 'uploading' ? (
              'Importerar…'
            ) : (
              <>
                <Upload className="w-4 h-4" />
                Importera
              </>
            )}
          </Button>
        </form>

        {message && (
          <div
            className={`mt-6 p-4 rounded-lg ${
              status === 'error' ? 'bg-red-50 text-red-800' : 'bg-green-50 text-green-800'
            }`}
          >
            {message}
            {errors.length > 0 && (
              <ul className="mt-3 text-sm list-disc list-inside space-y-1">
                {errors.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
