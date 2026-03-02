'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  AlertTriangle,
  Clock,
  CheckCircle2,
  Activity,
  Package,
  TrendingUp,
} from 'lucide-react'
import type { SellerLeadOSData } from '@/lib/features/leados/leados-types'
import type { DealerDashboardData } from '@/lib/features/dealer/dealer-analytics-service'
import { createClient } from '@/lib/supabase/client'

interface MissionControlClientProps {
  sellerName: string
  sellerLeadData: SellerLeadOSData
  dealerData: DealerDashboardData
  organizationId: string
}

function formatMsToMinutes(ms: number | null | undefined): string {
  if (!ms || !Number.isFinite(ms) || ms <= 0) return '–'
  const minutes = Math.round(ms / (60 * 1000))
  if (minutes < 1) return '<1 min'
  return `${minutes} min`
}

function formatCountdownMs(ms: number): string {
  if (ms <= 0) return '0 min'
  const totalSeconds = Math.ceil(ms / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  if (minutes <= 0) return `${seconds}s`
  if (minutes < 10) return `${minutes} min ${seconds.toString().padStart(2, '0')}s`
  return `${minutes} min`
}

export default function MissionControlClient({
  sellerName,
  sellerLeadData,
  dealerData,
  organizationId,
}: MissionControlClientProps) {
  const router = useRouter()
  const [now, setNow] = useState<Date>(() => new Date(sellerLeadData.nowIso))

  // Realtime: lyssna på nya leads för denna organisation och uppdatera dashboarden.
  useEffect(() => {
    if (!organizationId) return
    const supabase = createClient()
    const channel = supabase
      .channel('mission-control')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'leads',
          filter: `organization_id=eq.${organizationId}`,
        },
        () => router.refresh()
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [organizationId, router])

  // Lokal klocka för SLA-countdown.
  useEffect(() => {
    const id = setInterval(() => {
      setNow(new Date())
    }, 15 * 1000)
    return () => clearInterval(id)
  }, [])

  const leadsAll = useMemo(
    () => [
      ...sellerLeadData.leadsByBucket.missed,
      ...sellerLeadData.leadsByBucket.new,
      ...sellerLeadData.leadsByBucket.active,
    ],
    [sellerLeadData.leadsByBucket.missed, sellerLeadData.leadsByBucket.new, sellerLeadData.leadsByBucket.active]
  )

  const upcomingSlaLead = useMemo(() => {
    const nowMs = now.getTime()
    const fiveMinutesMs = 5 * 60 * 1000

    const candidates = leadsAll.filter((lead) => {
      if (lead.status !== 'new') return false
      if (lead.firstResponseAt) return false
      const deadlineMs = new Date(lead.slaDeadline).getTime()
      if (!Number.isFinite(deadlineMs)) return false
      const diff = deadlineMs - nowMs
      return diff > 0 && diff <= fiveMinutesMs
    })

    if (candidates.length === 0) return null

    return candidates.reduce<{
      leadId: string
      title: string
      subtitle: string | null
      msLeft: number
    } | null>((best, lead) => {
      const deadlineMs = new Date(lead.slaDeadline).getTime()
      const msLeft = deadlineMs - nowMs
      if (!best || msLeft < best.msLeft) {
        return {
          leadId: lead.id,
          title: lead.listingTitle,
          subtitle: lead.listingSubtitle ?? null,
          msLeft,
        }
      }
      return best
    }, null)
  }, [leadsAll, now])

  const activeLeadsCount =
    sellerLeadData.stats.newCount + sellerLeadData.stats.activeCount

  const slaPercentRaw = sellerLeadData.stats.percentWithinSla
  const hasSlaData = slaPercentRaw != null
  const slaPercent = hasSlaData ? Math.round(slaPercentRaw) : 0

  const avgResponseMsLast10 =
    sellerLeadData.stats.averageResponseTimeMsLast10 ??
    sellerLeadData.stats.averageResponseTimeMs

  const slaLabelColor =
    sellerLeadData.stats.slaStatus === 'no-data'
      ? 'text-brand-text/70 dark:text-gray-200'
      : sellerLeadData.stats.slaStatus === 'good'
        ? 'text-emerald-800 dark:text-emerald-200'
        : sellerLeadData.stats.slaStatus === 'warn'
          ? 'text-amber-800 dark:text-amber-200'
          : 'text-red-800 dark:text-red-200'

  const slaCardClasses =
    sellerLeadData.stats.slaStatus === 'no-data'
      ? 'ring-gray-200 bg-white dark:bg-gray-900 dark:ring-gray-800'
      : sellerLeadData.stats.slaStatus === 'good'
        ? 'ring-emerald-200 bg-emerald-50/60 dark:bg-emerald-900/20 dark:ring-emerald-900/40'
        : sellerLeadData.stats.slaStatus === 'warn'
          ? 'ring-amber-200 bg-amber-50/60 dark:bg-amber-900/10 dark:ring-amber-900/40'
          : 'ring-red-200 bg-red-50/60 dark:bg-red-900/20 dark:ring-red-900/40'

  return (
    <div className="min-h-screen bg-brand-beige px-4 py-5">
      <header className="mb-6">
        <p className="text-xs uppercase tracking-wide text-brand-text/60">
          Mission Control
        </p>
        <h1 className="mt-1 text-2xl font-semibold text-brand-text">
          Hej {sellerName}, här är din överblick.
        </h1>
        <p className="mt-1 text-sm text-brand-text/80">
          Se dina leads, SLA-hälsa och lager på ett ställe.
        </p>
      </header>

      {upcomingSlaLead && (
        <section
          className="mb-5 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 shadow-sm dark:border-amber-800 dark:bg-amber-900/30"
          aria-live="polite"
        >
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-2">
              <AlertTriangle className="mt-0.5 h-5 w-5 text-amber-600 dark:text-amber-300" />
              <div>
                <p className="text-sm font-semibold text-amber-900 dark:text-amber-100">
                  Åtgärd krävs – lead är på väg att missa SLA.
                </p>
                <p className="text-xs text-amber-900/80 dark:text-amber-100/80">
                  {upcomingSlaLead.title}
                  {upcomingSlaLead.subtitle ? ` – ${upcomingSlaLead.subtitle}` : ''}
                </p>
                <p className="mt-1 text-xs font-medium text-amber-900 dark:text-amber-100">
                  {`Tid kvar till 15-minuters SLA: ${formatCountdownMs(
                    upcomingSlaLead.msLeft
                  )}`}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 sm:self-start">
              <Link
                href={`/dashboard/seller/leads/${upcomingSlaLead.leadId}`}
                className="inline-flex items-center justify-center rounded-lg bg-amber-700 px-3 py-1.5 text-sm font-semibold text-white shadow-sm transition hover:bg-amber-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2"
              >
                Svara nu
              </Link>
            </div>
          </div>
        </section>
      )}

      <section className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl bg-white p-3 shadow-sm ring-1 ring-gray-100 dark:bg-gray-900 dark:ring-gray-800">
          <div className="flex items-center justify-between gap-1">
            <span className="text-xs font-medium text-brand-text/80">Aktiva leads</span>
            <Activity className="h-4 w-4 text-brand-green" />
          </div>
          <p className="mt-2 text-2xl font-semibold text-brand-text dark:text-white">
            {activeLeadsCount}
          </p>
          <p className="mt-1 text-[11px] text-brand-text/60">
            Baserat på nya + aktiva leads tilldelade dig.
          </p>
        </div>

        <div className={`rounded-xl p-3 shadow-sm ring-1 ${slaCardClasses}`}>
          <div className="flex items-center justify-between gap-1">
            <span className={`text-xs font-medium ${slaLabelColor}`}>Inom SLA</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </div>
          <p className="mt-2 text-2xl font-semibold text-brand-text dark:text-white">
            {hasSlaData ? `${slaPercent}%` : '–'}
          </p>
          <p className="mt-1 text-[11px] text-brand-text/60">
            {sellerLeadData.stats.respondedWithinSlaCount} av{' '}
            {sellerLeadData.stats.respondedCount} svar inom 15 min.
          </p>
        </div>

        <div className="rounded-xl bg-white p-3 shadow-sm ring-1 ring-gray-100 dark:bg-gray-900 dark:ring-gray-800">
          <div className="flex items-center justify-between gap-1">
            <span className="text-xs font-medium text-brand-text/80">Totalt lager</span>
            <Package className="h-4 w-4 text-brand-text/70" />
          </div>
          <p className="mt-2 text-2xl font-semibold text-brand-text dark:text-white">
            {dealerData.activeListingsCount}
          </p>
          <p className="mt-1 text-[11px] text-brand-text/60">
            Aktiva annonser i din organisation.
          </p>
        </div>

        <div className="rounded-xl bg-white p-3 shadow-sm ring-1 ring-gray-100 dark:bg-gray-900 dark:ring-gray-800">
          <div className="flex items-center justify-between gap-1">
            <span className="text-xs font-medium text-brand-text/80">
              Snitt-svarstid (senaste 10)
            </span>
            <Clock className="h-4 w-4 text-brand-green" />
          </div>
          <p className="mt-2 text-2xl font-semibold text-brand-text dark:text-white">
            {formatMsToMinutes(avgResponseMsLast10)}
          </p>
          <p className="mt-1 text-[11px] text-brand-text/60">
            Beräknat på de senaste besvarade leadsen.
          </p>
        </div>
      </section>

      <section className="mb-6 flex flex-col gap-3 sm:flex-row">
        <Link
          href="/dashboard/seller"
          className="inline-flex flex-1 items-center justify-center rounded-xl bg-brand-green px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-green/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-green focus-visible:ring-offset-2"
        >
          Gå till Seller Mode
        </Link>
        <Link
          href="/dashboard/dealer"
          className="inline-flex flex-1 items-center justify-center rounded-xl bg-white px-4 py-3 text-sm font-semibold text-brand-text shadow-sm ring-1 ring-gray-200 transition hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-green focus-visible:ring-offset-2 dark:bg-gray-900 dark:text-gray-100 dark:ring-gray-700 dark:hover:bg-gray-800"
        >
          Hantera inventariet
        </Link>
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold text-brand-text dark:text-white">
              Pipeline-översikt
            </h2>
            <p className="mt-1 text-xs text-brand-text/70">
              {`Missade: ${sellerLeadData.stats.missedCount} · Nya: ${sellerLeadData.stats.newCount} · Aktiva: ${sellerLeadData.stats.activeCount}`}
            </p>
          </div>
          <TrendingUp className="h-5 w-5 text-brand-text/50" />
        </div>
      </section>
    </div>
  )
}

