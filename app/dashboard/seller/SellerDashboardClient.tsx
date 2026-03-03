'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { AlertTriangle, Clock, CheckCircle2, Activity, ChevronRight, Info } from 'lucide-react'
import type { SellerLeadOSData, LeadOSLead } from '@/lib/features/leados/leados-types'
import type { LeadStatus } from '@/lib/features/dealer/dealer-analytics-service'
import { updateLeadStatusAction } from '@/app/actions/lead-actions'

interface SellerDashboardClientProps {
  sellerName: string
  data: SellerLeadOSData
}

function formatDurationMs(ms: number): string {
  if (!Number.isFinite(ms) || ms <= 0) return '–'
  const totalSeconds = Math.round(ms / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  if (minutes === 0) return `${seconds}s`
  if (minutes < 60) return `${minutes} min`
  const hours = Math.floor(minutes / 60)
  const remMinutes = minutes % 60
  if (hours < 24) return `${hours} h ${remMinutes} min`
  const days = Math.floor(hours / 24)
  return `${days} d`
}

function formatCountdown(deadlineIso: string, now: Date): string {
  const deadline = new Date(deadlineIso).getTime()
  const diffMs = deadline - now.getTime()
  if (diffMs <= 0) return '0 min kvar'
  const minutesLeft = Math.ceil(diffMs / (60 * 1000))
  return `${minutesLeft} min kvar`
}

function formatSinceCreated(createdAtIso: string, now: Date): string {
  const createdMs = new Date(createdAtIso).getTime()
  const diffMs = now.getTime() - createdMs
  if (!Number.isFinite(diffMs) || diffMs <= 0) return 'Nyss'
  const minute = 60 * 1000
  const hour = 60 * minute
  const day = 24 * hour
  if (diffMs < hour) {
    const m = Math.round(diffMs / minute)
    return `Inkommen för ${m} min sedan`
  }
  if (diffMs < day) {
    const h = Math.round(diffMs / hour)
    return `Inkommen för ${h} h sedan`
  }
  const d = Math.round(diffMs / day)
  return `Inkommen för ${d} d sedan`
}

function formatOverdue(slaDeadlineIso: string, now: Date): string {
  const deadline = new Date(slaDeadlineIso).getTime()
  const diffMs = now.getTime() - deadline
  if (diffMs <= 0) return ''
  const minutes = Math.round(diffMs / (60 * 1000))
  if (minutes < 60) return `${minutes} min för sent`
  const hours = Math.round(minutes / 60)
  return `${hours} h för sent`
}

interface LeadListSectionProps {
  title: string
  leads: LeadOSLead[]
  bucket: 'missed' | 'new' | 'active'
  nowIso: string
  onQuickUpdate: (leadId: string, status: LeadStatus) => void
  updatingId: string | null
  optimisticStatus: Record<string, LeadStatus>
}

function LeadListSection({
  title,
  leads,
  bucket,
  nowIso,
  onQuickUpdate,
  updatingId,
  optimisticStatus,
}: LeadListSectionProps) {
  const [now, setNow] = useState<Date>(() => new Date(nowIso))
  const [isOpen, setIsOpen] = useState(true)

  useEffect(() => {
    if (bucket !== 'new') return
    const id = setInterval(() => {
      setNow(new Date())
    }, 15 * 1000)
    return () => clearInterval(id)
  }, [bucket])

  return (
    <section className="mb-4 md:mb-5">
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        className="mb-2 flex w-full items-center justify-between rounded-lg bg-transparent px-1 text-left"
      >
        <span className="text-sm font-semibold uppercase tracking-wide text-brand-text/70">
          {title} <span className="text-xs text-brand-text/50">({leads.length})</span>
        </span>
        <ChevronRight
          className={`h-4 w-4 text-brand-text/40 transition-transform ${
            isOpen ? 'rotate-90' : ''
          }`}
          aria-hidden="true"
        />
      </button>
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900/70">
        {!isOpen ? null : leads.length === 0 ? (
          <div className="px-4 py-6 text-center text-sm text-gray-500 dark:text-gray-400">
            Inga leads i denna kategori.
          </div>
        ) : (
          <div className="space-y-2 px-3 py-3">
            {leads.map((lead) => (
              <Link
                key={lead.id}
                href={`/dashboard/seller/leads/${lead.id}`}
                className="group block rounded-lg border border-gray-100 bg-white px-3 py-2 text-sm shadow-xs transition hover:-translate-y-0.5 hover:border-brand-green/40 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-green/40 dark:border-gray-700 dark:bg-gray-900"
              >
                <div className="flex items-start gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[15px] font-semibold text-brand-text dark:text-white">
                      {lead.buyerName}
                    </p>
                    <p className="text-xs md:text-[11px] text-brand-text/70 dark:text-gray-400">
                      {lead.buyerPhone}
                    </p>
                    <p className="mt-2 md:mt-1 truncate text-xs font-medium text-brand-text dark:text-gray-100">
                      {lead.listingTitle}
                    </p>
                    {lead.listingSubtitle && (
                      <p className="truncate text-[11px] text-brand-text/60 dark:text-gray-400">
                        {lead.listingSubtitle}
                      </p>
                    )}
                    <div className="mt-1.5 flex flex-wrap items-center gap-1 text-[11px] text-brand-text/60">
                      <span>{formatSinceCreated(lead.createdAt, now)}</span>
                      <span>•</span>
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 font-semibold ${
                          (optimisticStatus[lead.id] ?? lead.status) === 'new'
                            ? 'bg-amber-50 text-amber-800 ring-1 ring-amber-200'
                            : (optimisticStatus[lead.id] ?? lead.status) === 'contacted'
                              ? 'bg-blue-50 text-blue-800 ring-1 ring-blue-200'
                              : (optimisticStatus[lead.id] ?? lead.status) === 'qualified'
                                ? 'bg-purple-50 text-purple-800 ring-1 ring-purple-200'
                                : (optimisticStatus[lead.id] ?? lead.status) === 'sold'
                                  ? 'bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200'
                                  : 'bg-gray-50 text-gray-700 ring-1 ring-gray-200'
                        }`}
                      >
                        {(optimisticStatus[lead.id] ?? lead.status) === 'new' && 'Ny'}
                        {(optimisticStatus[lead.id] ?? lead.status) === 'contacted' &&
                          'Kontaktad'}
                        {(optimisticStatus[lead.id] ?? lead.status) === 'qualified' &&
                          'Kvalificerad'}
                        {(optimisticStatus[lead.id] ?? lead.status) === 'sold' && 'Såld'}
                        {(optimisticStatus[lead.id] ?? lead.status) === 'archived' &&
                          'Arkiverad'}
                      </span>
                      <span>•</span>
                      <span>Tilldelad: Du</span>
                    </div>
                    {bucket === 'missed' && (
                      <p className="mt-0.5 text-[11px] font-semibold text-red-700 dark:text-red-300">
                        {formatOverdue(lead.slaDeadline, now)}
                      </p>
                    )}
                    {bucket === 'new' && (
                      <p className="mt-0.5 flex items-center gap-1 text-[11px] font-semibold text-amber-700 dark:text-amber-300">
                        <Clock className="h-3 w-3" />
                        {formatCountdown(lead.slaDeadline, now)}
                      </p>
                    )}
                  </div>
                  <div className="mt-1 flex shrink-0 items-center">
                    <ChevronRight className="h-4 w-4 text-brand-text/40 group-hover:text-brand-green md:h-5 md:w-5" />
                  </div>
                </div>
                <div
                  className="mt-3 border-t border-gray-100 pt-2 flex flex-wrap items-center gap-2 text-[11px]"
                  onClick={(e) => {
                    e.stopPropagation()
                    e.preventDefault()
                  }}
                >
                  <button
                    type="button"
                    disabled={updatingId === lead.id}
                    onClick={() => onQuickUpdate(lead.id, 'contacted')}
                    className="rounded-full bg-brand-green/5 px-3 py-1 text-xs font-semibold text-brand-green ring-1 ring-brand-green/40 hover:bg-brand-green/10 disabled:opacity-60"
                  >
                    Sätt som kontaktad
                  </button>
                  <button
                    type="button"
                    disabled={updatingId === lead.id}
                    onClick={() => onQuickUpdate(lead.id, 'sold')}
                    className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800 ring-1 ring-emerald-200 hover:bg-emerald-100 disabled:opacity-60"
                  >
                    Markera som såld
                  </button>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}

export default function SellerDashboardClient({ sellerName, data }: SellerDashboardClientProps) {
  const router = useRouter()
  const now = useMemo(() => new Date(data.nowIso), [data.nowIso])

  const avgResponseLabel = formatDurationMs(data.stats.averageResponseTimeMs ?? 0)
  const slaPercentRaw = data.stats.percentWithinSla
  const hasSlaData = slaPercentRaw != null
  const slaPercent = hasSlaData ? Math.round(slaPercentRaw) : 0

  const totalOpen =
    data.stats.missedCount + data.stats.newCount + Math.max(0, data.stats.activeCount)

  const [optimisticStatus, setOptimisticStatus] = useState<Record<string, LeadStatus>>({})
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [, startTransition] = useTransition()

  const primaryInstruction =
    data.stats.missedCount > 0
      ? `Du har ${data.stats.missedCount} missade leads. Börja med att ringa dem nu.`
      : data.stats.newCount > 0
        ? `Du har ${data.stats.newCount} nya leads. Svara inom 15 minuter.`
        : 'Du är i fas – håll koll på nya leads som dyker upp.'

  const slaCardClasses =
    data.stats.slaStatus === 'no-data'
      ? 'ring-gray-200 bg-white dark:bg-gray-900 dark:ring-gray-800'
      : data.stats.slaStatus === 'good'
        ? 'ring-emerald-200 bg-emerald-50/60 dark:bg-emerald-900/20 dark:ring-emerald-900/40'
        : data.stats.slaStatus === 'warn'
          ? 'ring-amber-200 bg-amber-50/60 dark:bg-amber-900/10 dark:ring-amber-900/40'
          : 'ring-red-200 bg-red-50/60 dark:bg-red-900/20 dark:ring-red-900/40'

  const slaLabelColor =
    data.stats.slaStatus === 'no-data'
      ? 'text-brand-text/70 dark:text-gray-200'
      : data.stats.slaStatus === 'good'
        ? 'text-emerald-800 dark:text-emerald-200'
        : data.stats.slaStatus === 'warn'
          ? 'text-amber-800 dark:text-amber-200'
          : 'text-red-800 dark:text-red-200'

  const slaIconColor =
    data.stats.slaStatus === 'no-data'
      ? 'text-brand-text/40'
      : data.stats.slaStatus === 'good'
        ? 'text-emerald-500'
        : data.stats.slaStatus === 'warn'
          ? 'text-amber-500'
          : 'text-red-500'

  const handleQuickUpdate = (leadId: string, status: LeadStatus) => {
    setOptimisticStatus((prev) => ({ ...prev, [leadId]: status }))
    setUpdatingId(leadId)
    startTransition(async () => {
      const result = await updateLeadStatusAction(leadId, status)
      if (!result.success) {
        setOptimisticStatus((prev) => {
          const next = { ...prev }
          delete next[leadId]
          return next
        })
      }
      // Stats-kort och buckets behöver färsk data – hämta om från servern.
      router.refresh()
      setUpdatingId(null)
    })
  }

  return (
    <div className="min-h-screen bg-brand-beige">
      <div className="mx-auto max-w-6xl px-4 py-5">
        <header className="mb-6">
        <p className="text-xs uppercase tracking-wide text-brand-text/60">Seller Mode</p>
        <h1 className="mt-1 text-2xl font-semibold text-brand-text">
          Hej {sellerName}, här är dina leads.
        </h1>
        <p className="mt-1 text-sm text-brand-text/80">{primaryInstruction}</p>
        </header>

        <section className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div
          className={`rounded-xl p-3 shadow-sm ring-1 ${
            data.stats.missedCount > 0
              ? 'bg-red-50/80 ring-red-200 dark:bg-red-900/30 dark:ring-red-900/60'
              : 'bg-white ring-gray-100 dark:bg-gray-900 dark:ring-gray-800'
          }`}
        >
          <div className="flex items-center justify-between gap-1">
            <div className="flex items-center gap-1">
              <span className="text-xs font-medium text-red-700 dark:text-red-300">
                Missade
              </span>
              <button
                type="button"
                className="group"
                aria-label="Förklaring av missade leads"
                title="Leads som väntat mer än 15 minuter utan första svar. Dessa ska prioriteras direkt."
              >
                <Info className="h-3.5 w-3.5 text-red-400 group-hover:text-red-500" />
              </button>
            </div>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </div>
          <p className="mt-2 text-2xl font-semibold text-brand-text dark:text-white">
            {data.stats.missedCount}
          </p>
          <p className="mt-1 text-[11px] text-brand-text/70">
            Leads äldre än 15 min utan svar.
          </p>
          {data.stats.missedCount > 0 && (
            <p className="mt-1 text-[11px] font-semibold text-red-700 dark:text-red-300">
              Åtgärda nu.
            </p>
          )}
        </div>

        <div className="rounded-xl bg-white p-3 shadow-sm ring-1 ring-amber-100 dark:bg-gray-900 dark:ring-amber-900/40">
          <div className="flex items-center justify-between gap-1">
            <div className="flex items-center gap-1">
              <span className="text-xs font-medium text-amber-800 dark:text-amber-200">
                Nya (SLA)
              </span>
              <button
                type="button"
                className="group"
                aria-label="Förklaring av nya leads"
                title="Färska leads inom 15 minuter från att de kom in. Målet är att svara innan SLA:t bryts."
              >
                <Info className="h-3.5 w-3.5 text-amber-500 group-hover:text-amber-600" />
              </button>
            </div>
            <Clock className="h-4 w-4 text-amber-500" />
          </div>
          <p className="mt-2 text-2xl font-semibold text-brand-text dark:text-white">
            {data.stats.newCount}
          </p>
          <p className="mt-1 text-[11px] text-brand-text/60">Inom 15 min-fönstret.</p>
        </div>

        <div className="rounded-xl bg-white p-3 shadow-sm ring-1 ring-gray-100 dark:bg-gray-900 dark:ring-gray-800">
          <div className="flex items-center justify-between gap-1">
            <div className="flex items-center gap-1">
              <span className="text-xs font-medium text-brand-text/80">Snitt-svarstid</span>
              <button
                type="button"
                className="group"
                aria-label="Förklaring av snitt-svarstid"
                title="Genomsnittlig tid från att ett lead kom in tills första svaret skickades."
              >
                <Info className="h-3.5 w-3.5 text-brand-text/40 group-hover:text-brand-text/70" />
              </button>
            </div>
            <Activity className="h-4 w-4 text-brand-green" />
          </div>
          <p className="mt-2 text-2xl font-semibold text-brand-text dark:text-white">
            {avgResponseLabel}
          </p>
          <p className="mt-1 text-[11px] text-brand-text/60">
            Baserat på {data.stats.respondedCount} besvarade leads.
          </p>
        </div>

        <div className={`rounded-xl p-3 shadow-sm ring-1 ${slaCardClasses}`}>
          <div className="flex items-center justify-between gap-1">
            <div className="flex items-center gap-1">
              <span className={`text-xs font-medium ${slaLabelColor}`}>Inom SLA</span>
              <button
                type="button"
                className="group"
                aria-label="Förklaring av SLA-kort"
                title="Andel besvarade leads där första svaret kom inom 15 minuter. Visar hur väl ni håller uppföljningslöftet."
              >
                <Info className={`h-3.5 w-3.5 ${slaIconColor} opacity-80 group-hover:opacity-100`} />
              </button>
            </div>
            <CheckCircle2 className={`h-4 w-4 ${slaIconColor}`} />
          </div>
          <p className="mt-2 text-2xl font-semibold text-brand-text dark:text-white">
            {Number.isNaN(slaPercentRaw) ? '–' : `${slaPercent}%`}
          </p>
          <p className="mt-1 text-[11px] text-brand-text/60">
            {data.stats.respondedWithinSlaCount} av {data.stats.respondedCount} svar inom 15 min.
          </p>
        </div>
        </section>

        <main>
        <LeadListSection
          title="Missade leads"
          leads={data.leadsByBucket.missed}
          bucket="missed"
          nowIso={now.toISOString()}
          onQuickUpdate={handleQuickUpdate}
          updatingId={updatingId}
          optimisticStatus={optimisticStatus}
        />
        <LeadListSection
          title="Nya leads (SLA)"
          leads={data.leadsByBucket.new}
          bucket="new"
          nowIso={now.toISOString()}
          onQuickUpdate={handleQuickUpdate}
          updatingId={updatingId}
          optimisticStatus={optimisticStatus}
        />
        <LeadListSection
          title="Aktiva leads"
          leads={data.leadsByBucket.active}
          bucket="active"
          nowIso={now.toISOString()}
          onQuickUpdate={handleQuickUpdate}
          updatingId={updatingId}
          optimisticStatus={optimisticStatus}
        />
        </main>

        <footer className="mt-6 text-center text-[11px] text-brand-text/60">
          {totalOpen > 0
            ? `Du har ${totalOpen} öppna leads att jobba med just nu.`
            : 'Du är i fas – inga öppna leads just nu.'}
        </footer>
      </div>
    </div>
  )
}

