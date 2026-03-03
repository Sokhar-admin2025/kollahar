'use client'

import { useMemo, useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Phone, Mail, ArrowLeft, Loader2 } from 'lucide-react'
import type { LeadDetail } from '@/lib/features/leados/leados-lead-detail-service'
import type { LeadStatus } from '@/lib/features/dealer/dealer-analytics-service'
import { updateLeadStatusAction, updateLeadInternalNoteAction } from '@/app/actions/lead-actions'
import Button from '@/app/components/atoms/Button'

interface LeadDetailClientProps {
  lead: LeadDetail
}

function formatSince(dateIso: string): string {
  const ts = new Date(dateIso).getTime()
  const now = Date.now()
  const diffMs = now - ts
  if (!Number.isFinite(diffMs) || diffMs <= 0) return 'Nyss'
  const minute = 60 * 1000
  const hour = 60 * minute
  const day = 24 * hour
  if (diffMs < hour) {
    const m = Math.round(diffMs / minute)
    return `För ${m} min sedan`
  }
  if (diffMs < day) {
    const h = Math.round(diffMs / hour)
    return `För ${h} h sedan`
  }
  const d = Math.round(diffMs / day)
  return `För ${d} d sedan`
}

export default function LeadDetailClient({ lead }: LeadDetailClientProps) {
  const router = useRouter()
  const [note, setNote] = useState(lead.internalNote ?? '')
  const [savingNote, setSavingNote] = useState(false)
  const [noteError, setNoteError] = useState<string | null>(null)
  const [internalUpdatedAt, setInternalUpdatedAt] = useState<string | null>(
    lead.internalNoteUpdatedAt
  )
  const [statusOptimistic, setStatusOptimistic] = useState<LeadStatus>(
    (lead.status as LeadStatus) ?? 'new'
  )
  const [statusUpdating, startStatusTransition] = useTransition()

  const createdSince = useMemo(() => formatSince(lead.createdAt), [lead.createdAt])
  const statusLabel = useMemo(() => {
    switch (statusOptimistic) {
      case 'new':
        return 'Ny'
      case 'contacted':
        return 'Kontaktad'
      case 'qualified':
        return 'Kvalificerad'
      case 'sold':
        return 'Såld'
      case 'archived':
        return 'Arkiverad'
      default:
        return statusOptimistic
    }
  }, [statusOptimistic])
  const statusBadgeClasses = useMemo(() => {
    const base =
      'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1'
    switch (statusOptimistic) {
      case 'new':
        return `${base} bg-amber-50 text-amber-800 ring-amber-200`
      case 'contacted':
        return `${base} bg-blue-50 text-blue-800 ring-blue-200`
      case 'qualified':
        return `${base} bg-purple-50 text-purple-800 ring-purple-200`
      case 'sold':
        return `${base} bg-emerald-50 text-emerald-800 ring-emerald-200`
      case 'archived':
        return `${base} bg-gray-50 text-gray-700 ring-gray-200`
      default:
        return `${base} bg-gray-50 text-gray-700 ring-gray-200`
    }
  }, [statusOptimistic])
  const sourceLabel = useMemo(() => {
    switch (lead.source) {
      case 'guest_form':
        return 'Webbformulär (gäst)'
      case 'lead_card':
        return 'Lead-kort i chatt'
      case 'first_message':
        return 'Första meddelande'
      default:
        return lead.source || 'Okänd källa'
    }
  }, [lead.source])

  const handleStatusChange = (next: LeadStatus) => {
    if (statusOptimistic === next) return
    setStatusOptimistic(next)
    startStatusTransition(async () => {
      const result = await updateLeadStatusAction(lead.id, next)
      if (!result.success) {
        setStatusOptimistic(lead.status as LeadStatus)
      }
      router.refresh()
    })
  }

  const handleSaveNote = async (e: React.FormEvent) => {
    e.preventDefault()
    setSavingNote(true)
    setNoteError(null)
    try {
      const result = await updateLeadInternalNoteAction(lead.id, note)
      if (!result.success) {
        setNoteError(result.error ?? 'Kunde inte spara anteckning.')
        return
      }
      const nowIso = new Date().toISOString()
      setInternalUpdatedAt(nowIso)
    } catch (err) {
      console.error('[lead-detail] save note error', err)
      setNoteError('Kunde inte spara anteckning.')
    } finally {
      setSavingNote(false)
    }
  }

  return (
    <div className="min-h-screen bg-brand-beige">
      <div className="mx-auto max-w-6xl px-4 py-5">
        <header className="mb-6">
          <button
            type="button"
            onClick={() => router.push('/dashboard/seller')}
            className="inline-flex items-center gap-1 text-sm text-brand-text/70 hover:text-brand-green"
          >
            <ArrowLeft className="h-4 w-4" />
            Tillbaka till Seller Mode
          </button>
          <p className="mt-3 text-xs uppercase tracking-wide text-brand-text/60">
            Seller Mode
          </p>
          <h1 className="mt-1 text-2xl font-semibold text-brand-text">
            Lead-detalj
          </h1>
          <p className="mt-1 text-sm text-brand-text/80">
            All information du behöver för att följa upp detta lead.
          </p>
        </header>

        <main className="mx-auto max-w-lg space-y-5">
          <section className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-gray-200">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold text-brand-text">Kund</h2>
                <p className="mt-1 text-base font-medium text-brand-text">{lead.buyerName}</p>
              </div>
              <div className="mt-1 flex flex-col items-end gap-1">
                <span className="text-[11px] uppercase tracking-wide text-brand-text/50">
                  Status
                </span>
                <span className={statusBadgeClasses}>{statusLabel}</span>
              </div>
            </div>
            <div className="mt-3 space-y-1 text-sm text-brand-text/80">
            <a href={`tel:${lead.buyerPhone}`} className="inline-flex items-center gap-1">
              <Phone className="h-4 w-4 text-brand-green" />
              <span>{lead.buyerPhone}</span>
            </a>
            {lead.buyerEmail && (
              <a href={`mailto:${lead.buyerEmail}`} className="inline-flex items-center gap-1">
                <Mail className="h-4 w-4 text-brand-green" />
                <span className="break-all">{lead.buyerEmail}</span>
              </a>
            )}
            </div>
            <p className="mt-3 text-xs text-brand-text/60">
              Inkommen: {new Date(lead.createdAt).toLocaleString('sv-SE')} ({createdSince})
            </p>
            <p className="mt-0.5 text-xs text-brand-text/60">Källa: {sourceLabel}</p>
          </section>

        <section className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-gray-200">
          <h2 className="text-sm font-semibold text-brand-text">Annons</h2>
          <p className="mt-1 text-sm font-medium text-brand-text">{lead.listingTitle}</p>
          <div className="mt-1 text-xs text-brand-text/70">
            {lead.listingMake && lead.listingModel && (
              <p>
                {lead.listingMake} {lead.listingModel}
                {lead.listingYear ? ` • ${lead.listingYear}` : ''}
              </p>
            )}
            {typeof lead.listingPrice === 'number' && (
              <p>{lead.listingPrice.toLocaleString('sv-SE')} kr</p>
            )}
          </div>
          {lead.listingId && (
            <Link
              href={`/annons/${lead.listingId}`}
              className="mt-2 inline-block text-xs font-medium text-brand-green hover:text-brand-green/80"
            >
              Öppna annons
            </Link>
          )}
        </section>

        <section className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-gray-200">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold text-brand-text">Status</h2>
            <span className={statusBadgeClasses}>{statusLabel}</span>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              type="button"
              variant="secondary"
              disabled={statusUpdating}
              className={`px-3 py-1 text-xs ${
                statusOptimistic === 'contacted' ? 'bg-brand-green text-white' : ''
              }`}
              onClick={() => handleStatusChange('contacted')}
            >
              {statusUpdating && statusOptimistic === 'contacted' ? (
                <span className="inline-flex items-center gap-1">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Sparar...
                </span>
              ) : (
                'Sätt som kontaktad'
              )}
            </Button>
            <Button
              type="button"
              variant="secondary"
              disabled={statusUpdating}
              className={`px-3 py-1 text-xs ${
                statusOptimistic === 'sold' ? 'bg-emerald-600 text-white' : ''
              }`}
              onClick={() => handleStatusChange('sold')}
            >
              {statusUpdating && statusOptimistic === 'sold' ? (
                <span className="inline-flex items-center gap-1">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Sparar...
                </span>
              ) : (
                'Markera som såld'
              )}
            </Button>
            <Button
              type="button"
              variant="secondary"
              disabled={statusUpdating}
              className={`px-3 py-1 text-xs ${
                statusOptimistic === 'archived' ? 'bg-gray-800 text-white' : ''
              }`}
              onClick={() => handleStatusChange('archived')}
            >
              {statusUpdating && statusOptimistic === 'archived' ? (
                <span className="inline-flex items-center gap-1">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Sparar...
                </span>
              ) : (
                'Arkivera'
              )}
            </Button>
          </div>
        </section>

          <section className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-gray-200">
            <h2 className="text-sm font-semibold text-brand-text">Intern anteckning</h2>
            <p className="mt-1 text-xs text-brand-text/60">
              Syns endast internt i din LeadOS-vy. Bra för snabb kontext som inte ska delas med
              kunden.
            </p>
            <form onSubmit={handleSaveNote} className="mt-3 space-y-2">
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={5}
                className="w-full rounded-lg border border-gray-300 p-2.5 text-sm text-brand-text focus:border-brand-green focus:outline-none focus:ring-2 focus:ring-brand-green/20"
                placeholder="Ex: Ringde, lämnade röstmeddelande. Vill ha svar efter kl 17."
                disabled={savingNote}
              />
              {noteError && <p className="text-xs text-red-600">{noteError}</p>}
              <div className="flex items-center justify-between gap-3">
                <Button type="submit" disabled={savingNote} className="px-4 py-2 text-sm">
                  {savingNote ? 'Sparar...' : 'Spara anteckning'}
                </Button>
                <p className="text-xs text-brand-text/60">
                  {internalUpdatedAt
                    ? `Senast sparad: ${new Date(internalUpdatedAt).toLocaleString('sv-SE')}`
                    : 'Ingen anteckning sparad ännu.'}
                </p>
              </div>
            </form>
          </section>
        </main>
      </div>
    </div>
  )
}

