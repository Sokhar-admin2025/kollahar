'use client'

import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, Clock, CheckCircle2, Activity } from 'lucide-react'
import type { SellerLeadOSData, LeadOSLead } from '@/lib/features/leados/leados-types'

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

function LeadListSection({
  title,
  leads,
  showCountdown,
  nowIso,
}: {
  title: string
  leads: LeadOSLead[]
  showCountdown?: boolean
  nowIso: string
}) {
  const [now, setNow] = useState<Date>(() => new Date(nowIso))

  useEffect(() => {
    if (!showCountdown) return
    const id = setInterval(() => {
      setNow(new Date())
    }, 15 * 1000)
    return () => clearInterval(id)
  }, [showCountdown])

  return (
    <section className="mb-6">
      <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-brand-text/70">
        {title}
      </h2>
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900/70">
        {leads.length === 0 ? (
          <div className="px-4 py-6 text-center text-sm text-gray-500 dark:text-gray-400">
            Inga leads i denna kategori.
          </div>
        ) : (
          <div className="max-h-80 space-y-2 overflow-y-auto px-3 py-3">
            {leads.map((lead) => (
              <div
                key={lead.id}
                className="flex items-start justify-between rounded-lg border border-gray-100 bg-white px-3 py-2 text-sm shadow-xs dark:border-gray-700 dark:bg-gray-900"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-brand-text dark:text-white">
                    {lead.buyerName}
                  </p>
                  <p className="text-xs text-brand-text/70 dark:text-gray-400">
                    {lead.buyerPhone}
                  </p>
                  <p className="mt-1 truncate text-xs font-medium text-brand-text dark:text-gray-100">
                    {lead.listingTitle}
                  </p>
                  {lead.listingSubtitle && (
                    <p className="truncate text-[11px] text-brand-text/60 dark:text-gray-400">
                      {lead.listingSubtitle}
                    </p>
                  )}
                </div>
                {showCountdown && (
                  <div className="ml-3 shrink-0 text-right">
                    <p className="flex items-center justify-end gap-1 text-[11px] font-semibold text-amber-700 dark:text-amber-300">
                      <Clock className="h-3 w-3" />
                      {formatCountdown(lead.slaDeadline, now)}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}

export default function SellerDashboardClient({ sellerName, data }: SellerDashboardClientProps) {
  const now = useMemo(() => new Date(data.nowIso), [data.nowIso])

  const avgResponseLabel = formatDurationMs(data.stats.averageResponseTimeMs)
  const slaPercent = Math.round(data.stats.percentWithinSla)

  const totalOpen =
    data.stats.missedCount + data.stats.newCount + Math.max(0, data.stats.activeCount)

  return (
    <div className="min-h-screen bg-brand-beige px-4 py-5">
      <header className="mb-6">
        <p className="text-xs uppercase tracking-wide text-brand-text/60">Seller Mode</p>
        <h1 className="mt-1 text-2xl font-semibold text-brand-text">
          Hej {sellerName}, här är dina leads.
        </h1>
        <p className="mt-1 text-sm text-brand-text/70">
          Fokus på svarstid och missa så få möjligheter som möjligt.
        </p>
      </header>

      <section className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl bg-white p-3 shadow-sm ring-1 ring-red-100 dark:bg-gray-900 dark:ring-red-900/40">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-red-700 dark:text-red-300">Missade</span>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </div>
          <p className="mt-2 text-2xl font-semibold text-brand-text dark:text-white">
            {data.stats.missedCount}
          </p>
          <p className="mt-1 text-[11px] text-brand-text/60">
            Leads äldre än 15 min utan svar.
          </p>
        </div>

        <div className="rounded-xl bg-white p-3 shadow-sm ring-1 ring-amber-100 dark:bg-gray-900 dark:ring-amber-900/40">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-amber-800 dark:text-amber-200">Nya</span>
            <Clock className="h-4 w-4 text-amber-500" />
          </div>
          <p className="mt-2 text-2xl font-semibold text-brand-text dark:text-white">
            {data.stats.newCount}
          </p>
          <p className="mt-1 text-[11px] text-brand-text/60">Inom 15 min-fönstret.</p>
        </div>

        <div className="rounded-xl bg-white p-3 shadow-sm ring-1 ring-gray-100 dark:bg-gray-900 dark:ring-gray-800">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-brand-text/80">Snitt-svarstid</span>
            <Activity className="h-4 w-4 text-brand-green" />
          </div>
          <p className="mt-2 text-2xl font-semibold text-brand-text dark:text-white">
            {avgResponseLabel}
          </p>
          <p className="mt-1 text-[11px] text-brand-text/60">
            Baserat på {data.stats.respondedCount} besvarade leads.
          </p>
        </div>

        <div className="rounded-xl bg-white p-3 shadow-sm ring-1 ring-emerald-100 dark:bg-gray-900 dark:ring-emerald-900/40">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-emerald-800 dark:text-emerald-200">
              Inom SLA
            </span>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </div>
          <p className="mt-2 text-2xl font-semibold text-brand-text dark:text-white">
            {Number.isNaN(slaPercent) ? '–' : `${slaPercent}%`}
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
          nowIso={now.toISOString()}
        />
        <LeadListSection
          title="Nya leads (på väg mot SLA)"
          leads={data.leadsByBucket.new}
          showCountdown
          nowIso={now.toISOString()}
        />
        <LeadListSection
          title="Aktiva leads"
          leads={data.leadsByBucket.active}
          nowIso={now.toISOString()}
        />
      </main>

      <footer className="mt-6 text-center text-[11px] text-brand-text/60">
        {totalOpen > 0
          ? `Du har ${totalOpen} öppna leads att jobba med just nu.`
          : 'Du är i fas – inga öppna leads just nu.'}
      </footer>
    </div>
  )
}

