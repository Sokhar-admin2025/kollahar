'use client'

import { useMemo, useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Phone, Mail, ArrowLeft, Loader2, MessageCircle } from 'lucide-react'
import type { LeadDetail } from '@/lib/features/leados/leados-lead-detail-service'
import type { LeadStatus } from '@/lib/features/dealer/dealer-analytics-service'
import { updateLeadStatusAction, updateLeadInternalNoteAction } from '@/app/actions/lead-actions'
import Button from '@/app/components/atoms/Button'
import type { LeadMessage } from '@/lib/features/leados/leados-lead-messages-service'
import { confirmListingSaleAction } from '@/app/actions/listing-sale-actions'
import type { SoldVia } from '@/lib/features/leados/leados-sales-service'
import LeadChat from '@/app/dashboard/_components/LeadChat'
import type { Message as CustomerMessage } from '@/app/types'

interface LeadDetailClientProps {
  lead: LeadDetail
  leadMessages: LeadMessage[]
  customerMessages: CustomerMessage[]
  currentUserId: string
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

export default function LeadDetailClient({
  lead,
  leadMessages,
  customerMessages,
  currentUserId,
}: LeadDetailClientProps) {
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
  const [showConfirmSale, setShowConfirmSale] = useState(false)
  const [saleSubmitting, setSaleSubmitting] = useState(false)
  const [saleError, setSaleError] = useState<string | null>(null)
  const [soldVia, setSoldVia] = useState<SoldVia>('sokhar')

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

  const recentCustomerMessages = useMemo(
    () =>
      [...customerMessages].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      ),
    [customerMessages]
  )

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

  const handleMarkAsSoldClick = () => {
    setShowConfirmSale(true)
    setSaleError(null)
    setSoldVia('sokhar')
  }

  const handleConfirmSale = async () => {
    if (!lead.listingId) {
      setSaleError('Leadet saknar kopplad annons.')
      return
    }

    setSaleSubmitting(true)
    setSaleError(null)
    try {
      const res = await confirmListingSaleAction({
        listingId: lead.listingId,
        leadId: lead.id,
        soldVia,
      })
      if (!res.success) {
        setSaleError(res.error ?? 'Kunde inte registrera försäljning.')
        return
      }
      setShowConfirmSale(false)
      setStatusOptimistic('sold')
      router.refresh()
    } catch (err) {
      console.error('[lead-detail] confirm sale error', err)
      setSaleError('Kunde inte registrera försäljning.')
    } finally {
      setSaleSubmitting(false)
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
          <h1 className="mt-1 text-2xl font-semibold text-brand-text">Lead-detalj</h1>
          <p className="mt-1 text-sm text-brand-text/80">
            Din interna LeadOS-vy för detta lead – status, anteckningar och LeadChat samlat.
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
                disabled={saleSubmitting}
                className={`px-3 py-1 text-xs ${
                  statusOptimistic === 'sold' ? 'bg-emerald-600 text-white' : ''
                }`}
                onClick={handleMarkAsSoldClick}
              >
                {saleSubmitting ? (
                  <span className="inline-flex items-center gap-1">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Registrerar...
                  </span>
                ) : (
                  'Såld till kund!'
                )}
              </Button>
            </div>
            {lead.conversationId && (
              <button
                type="button"
                onClick={() => router.push(`/dashboard/messages?conv=${lead.conversationId}`)}
                className="mt-3 inline-flex items-center gap-1 rounded-full bg-brand-green px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-brand-green/90"
              >
                <MessageCircle className="h-3.5 w-3.5" />
                <span>Öppna kundchatten</span>
              </button>
            )}
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
              <h2 className="text-sm font-semibold text-brand-text">Senaste konversation</h2>
              <span className={statusBadgeClasses}>{statusLabel}</span>
            </div>
            <div className="mt-3 text-xs text-brand-text/80">
              {!lead.conversationId && (
                <p className="text-brand-text/60">
                  Det finns ingen chatt kopplad till detta lead.
                </p>
              )}
              {lead.conversationId && recentCustomerMessages.length === 0 && (
                <p className="text-brand-text/60">
                  Inga meddelanden i kundchatten ännu.
                </p>
              )}
              {lead.conversationId && recentCustomerMessages.length > 0 && (
                <ul className="space-y-1">
                  {recentCustomerMessages.map((msg) => {
                    const senderLabel = msg.sender_id === currentUserId ? 'Säljare' : 'Köpare'
                    return (
                      <li key={msg.id}>
                        <span className="font-semibold">{senderLabel}:</span>{' '}
                        <span>{msg.content}</span>
                      </li>
                    )
                  })}
                </ul>
              )}
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

          <LeadChat
            leadId={lead.id}
            initialMessages={leadMessages}
            leadTitle={lead.listingTitle}
            listingSubtitle={lead.listingSubtitle}
          />

          {showConfirmSale && (
            <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 px-4">
              <div className="w-full max-w-md rounded-xl bg-white p-5 shadow-lg dark:bg-gray-900">
                <h2 className="text-base font-semibold text-brand-text dark:text-white">
                  Bekräfta försäljning
                </h2>
                <p className="mt-2 text-xs text-brand-text/70 dark:text-gray-300">
                  Är du säker på att denna affär är genomförd för denna annons? Denna åtgärd
                  markerar annonsen som såld, stänger andra leads för samma annons och skapar en
                  säljdump i LeadOS.
                </p>
                <p className="mt-2 text-xs text-brand-text/60 dark:text-gray-400">
                  Du befinner dig i ett specifikt lead – försäljningen kopplas till just detta
                  lead i LeadOS (LeadChat och rapportering).
                </p>

                <div className="mt-4 space-y-2 text-xs text-brand-text dark:text-gray-100">
                  <p className="font-medium">Hur såldes objektet?</p>
                  <div className="space-y-1">
                    <label className="flex cursor-pointer items-center gap-2">
                      <input
                        type="radio"
                        name="soldVia"
                        value="sokhar"
                        checked={soldVia === 'sokhar'}
                        onChange={() => setSoldVia('sokhar')}
                      />
                      <span>Såld via Kollahär/LeadOS</span>
                    </label>
                    <label className="flex cursor-pointer items-center gap-2">
                      <input
                        type="radio"
                        name="soldVia"
                        value="external"
                        checked={soldVia === 'external'}
                        onChange={() => setSoldVia('external')}
                      />
                      <span>Såld via annan kanal (t.ex. Blocket, walk-in)</span>
                    </label>
                    <label className="flex cursor-pointer items-center gap-2">
                      <input
                        type="radio"
                        name="soldVia"
                        value="other"
                        checked={soldVia === 'other'}
                        onChange={() => setSoldVia('other')}
                      />
                      <span>Annat</span>
                    </label>
                  </div>
                </div>

                {saleError && (
                  <p className="mt-3 text-xs text-red-600 dark:text-red-400">{saleError}</p>
                )}

                <div className="mt-4 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (!saleSubmitting) {
                        setShowConfirmSale(false)
                      }
                    }}
                    className="inline-flex items-center justify-center rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-brand-text hover:bg-gray-50 dark:border-gray-600 dark:text-gray-100 dark:hover:bg-gray-800"
                  >
                    Avbryt
                  </button>
                  <button
                    type="button"
                    disabled={saleSubmitting}
                    onClick={handleConfirmSale}
                    className="inline-flex items-center justify-center rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-60"
                  >
                    {saleSubmitting ? 'Registrerar…' : 'Bekräfta försäljning'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}

