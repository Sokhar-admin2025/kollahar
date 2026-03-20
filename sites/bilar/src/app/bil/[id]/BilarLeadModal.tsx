'use client'

import { useState, useTransition } from 'react'
import { X, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react'

interface BilarLeadModalProps {
  listingTitle: string
  onClose: () => void
  onSubmit: (
    email: string,
    name: string,
    message: string,
    consent: boolean
  ) => Promise<{ success: boolean; error?: string }>
}

export default function BilarLeadModal({
  listingTitle,
  onClose,
  onSubmit,
}: BilarLeadModalProps) {
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [message, setMessage] = useState('')
  const [consent, setConsent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const [isPending, startTransition] = useTransition()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) { setError('E-post krävs.'); return }
    if (!consent) { setError('Du måste godkänna hantering av dina uppgifter.'); return }
    setError(null)

    startTransition(async () => {
      const result = await onSubmit(email.trim(), name.trim(), message.trim(), consent)
      if (!result.success) {
        setError(result.error ?? 'Något gick fel. Försök igen.')
        return
      }
      setDone(true)
    })
  }

  const inputClass =
    'w-full px-3 py-2.5 border rounded-lg text-sm outline-none transition focus:border-[#2563EB] focus:ring-2 focus:ring-[#BFDBFE]'

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="lead-modal-title"
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
      >
        <div
          className="w-full max-w-md overflow-hidden rounded-2xl shadow-xl"
          style={{ background: '#FFFFFF' }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between px-6 py-4 border-b"
            style={{ borderColor: '#F1F5F9' }}
          >
            <h2 id="lead-modal-title" className="text-base font-semibold" style={{ color: '#0F172A' }}>
              Skicka förfrågan
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1.5 transition hover:bg-[#F1F5F9]"
              aria-label="Stäng"
            >
              <X className="h-4 w-4" style={{ color: '#64748B' }} />
            </button>
          </div>

          {/* Innehåll */}
          {done ? (
            <div className="px-6 py-10 flex flex-col items-center text-center">
              <div
                className="w-14 h-14 rounded-full flex items-center justify-center mb-4"
                style={{ background: '#F0FDF4' }}
              >
                <CheckCircle2 className="w-7 h-7" style={{ color: '#16A34A' }} />
              </div>
              <h3 className="text-base font-semibold mb-1" style={{ color: '#0F172A' }}>
                Förfrågan skickad!
              </h3>
              <p className="text-sm" style={{ color: '#64748B' }}>
                Handlaren återkommer till dig så snart som möjligt.
              </p>
              <button
                type="button"
                onClick={onClose}
                className="mt-6 px-6 py-2.5 rounded-lg text-sm font-semibold text-white transition hover:opacity-90"
                style={{ background: '#2563EB' }}
              >
                Stäng
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
              <p className="text-sm" style={{ color: '#64748B' }}>
                Intresseanmälan för:{' '}
                <span className="font-medium" style={{ color: '#0F172A' }}>
                  {listingTitle}
                </span>
              </p>

              {/* Namn */}
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: '#64748B' }}>
                  Namn <span className="font-normal">(valfritt)</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ditt namn"
                  className={inputClass}
                  style={{ borderColor: '#E2E8F0', color: '#0F172A' }}
                />
              </div>

              {/* E-post */}
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: '#64748B' }}>
                  E-post <span style={{ color: '#EF4444' }}>*</span>
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="din@epost.se"
                  required
                  className={inputClass}
                  style={{ borderColor: '#E2E8F0', color: '#0F172A' }}
                />
              </div>

              {/* Meddelande */}
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: '#64748B' }}>
                  Meddelande <span className="font-normal">(valfritt)</span>
                </label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Skriv ett meddelande till handlaren..."
                  rows={3}
                  className={`${inputClass} resize-none`}
                  style={{ borderColor: '#E2E8F0', color: '#0F172A' }}
                />
              </div>

              {/* GDPR-samtycke */}
              <label className="flex items-start gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={consent}
                  onChange={(e) => setConsent(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded shrink-0"
                  style={{ accentColor: '#2563EB' }}
                />
                <span className="text-xs leading-relaxed" style={{ color: '#64748B' }}>
                  Jag godkänner att min e-postadress lagras och används för att handlaren ska
                  kunna återkomma angående denna annons.
                </span>
              </label>

              {/* Fel */}
              {error && (
                <div
                  className="flex items-center gap-2 rounded-lg px-3 py-2.5"
                  style={{ background: '#FEF2F2' }}
                >
                  <AlertCircle className="w-4 h-4 shrink-0" style={{ color: '#EF4444' }} />
                  <p className="text-xs" style={{ color: '#EF4444' }}>{error}</p>
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={isPending}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
                style={{ background: '#2563EB' }}
              >
                {isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Skickar...
                  </>
                ) : (
                  'Skicka förfrågan'
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </>
  )
}
