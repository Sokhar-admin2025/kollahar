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
  Info,
  Users,
  ChevronRight,
  Lock,
  User,
  RefreshCw,
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

/** Dummy-data för placeholder "Senaste aktivitet" (Pulsen). Ersätts av riktig feed när activity_log finns. */
const RECENT_ACTIVITY_DUMMY: Array<{
  type: string
  message: string
  relativeTime: string
}> = [
  { type: 'lead_new', message: 'Ny lead: Anna K. – Volvo XC60', relativeTime: '2 min sedan' },
  { type: 'inventory_sold', message: 'Annons såld: BMW 320d', relativeTime: '1 timme sedan' },
  { type: 'sync_import_success', message: 'Import lyckades: 12 annonser', relativeTime: 'igår' },
  { type: 'lead_status', message: 'Lead kontaktad: Erik S. – Tesla Model 3', relativeTime: 'igår' },
  { type: 'inventory_created', message: 'Ny annons: Audi A4', relativeTime: '2 dagar sedan' },
  { type: 'lead_sla_missed', message: 'SLA missad för lead – VW Golf', relativeTime: '3 dagar sedan' },
]

function getActivityIcon(type: string) {
  switch (type) {
    case 'lead_new':
    case 'lead_status':
      return <User className="h-4 w-4 shrink-0 text-brand-text/60 dark:text-gray-400" />
    case 'inventory_sold':
    case 'inventory_created':
    case 'inventory_updated':
    case 'inventory_deleted':
      return <Package className="h-4 w-4 shrink-0 text-brand-text/60 dark:text-gray-400" />
    case 'sync_import_success':
    case 'sync_import_error':
      return <RefreshCw className="h-4 w-4 shrink-0 text-brand-text/60 dark:text-gray-400" />
    case 'lead_sla_missed':
    case 'lead_sla_warning':
      return <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
    default:
      return <Activity className="h-4 w-4 shrink-0 text-brand-text/60 dark:text-gray-400" />
  }
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
    <div className="min-h-screen bg-brand-beige">
      <div className="mx-auto max-w-6xl px-4 py-5">
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
              <div className="flex items-center gap-1">
                <span className="text-xs font-medium text-brand-text/80">Aktiva leads</span>
                <button
                  type="button"
                  className="group"
                  aria-label="Förklaring av aktiva leads"
                  title="Visar hur många leads du aktivt behöver jobba med just nu (nya + aktiva i LeadOS-buckets)."
                >
                  <Info className="h-3.5 w-3.5 text-brand-text/40 group-hover:text-brand-text/70" />
                </button>
              </div>
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
              <div className="flex items-center gap-1">
                <span className={`text-xs font-medium ${slaLabelColor}`}>Inom SLA</span>
                <button
                  type="button"
                  className="group"
                  aria-label="Förklaring av SLA-hälsa"
                  title="Andel besvarade leads där första svaret kom inom 15 minuter. Visar hur väl du håller ditt uppföljningslöfte."
                >
                  <Info
                    className={`h-3.5 w-3.5 ${slaLabelColor} opacity-80 group-hover:opacity-100`}
                  />
                </button>
              </div>
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
              <div className="flex items-center gap-1">
                <span className="text-xs font-medium text-brand-text/80">Totalt lager</span>
                <button
                  type="button"
                  className="group"
                  aria-label="Förklaring av totalt lager"
                  title="Antal aktiva annonser i din organisation – hjälper dig se hur mycket du har ute på marknaden."
                >
                  <Info className="h-3.5 w-3.5 text-brand-text/40 group-hover:text-brand-text/70" />
                </button>
              </div>
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
              <div className="flex items-center gap-1">
                <span className="text-xs font-medium text-brand-text/80">
                  Snitt-svarstid (senaste 10)
                </span>
                <button
                  type="button"
                  className="group"
                  aria-label="Förklaring av snitt-svarstid"
                  title="Genomsnittlig tid till första svar på de 10 senaste besvarade leadsen."
                >
                  <Info className="h-3.5 w-3.5 text-brand-text/40 group-hover:text-brand-text/70" />
                </button>
              </div>
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

        {/* Leads att följa upp – kompakt överblick med länk till full Lead Action Center i dealer */}
        {dealerData.leadActionItems.length > 0 && (
          <section className="mb-6 rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-brand-green" />
                <div>
                  <h2 className="text-sm font-semibold text-brand-text dark:text-white">
                    Leads att följa upp
                  </h2>
                  <p className="mt-0.5 text-xs text-brand-text/70 dark:text-gray-400">
                    {dealerData.leadActionItems.filter((l) => l.status === 'new').length > 0
                      ? `${dealerData.leadActionItems.filter((l) => l.status === 'new').length} väntar på svar · ${dealerData.leadActionItems.length} totalt`
                      : `${dealerData.leadActionItems.length} leads i organisationen`}
                  </p>
                </div>
              </div>
              <Link
                href="/dashboard/dealer"
                className="inline-flex items-center gap-1 rounded-lg bg-brand-green/10 px-3 py-2 text-sm font-semibold text-brand-green ring-1 ring-brand-green/30 transition hover:bg-brand-green/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-green focus-visible:ring-offset-2"
              >
                Se alla i Lead Action Center
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
            {dealerData.leadActionItems.filter((l) => l.status === 'new').length > 0 && (
              <ul className="mt-3 space-y-1.5 border-t border-gray-100 pt-3 dark:border-gray-700">
                {dealerData.leadActionItems
                  .filter((l) => l.status === 'new')
                  .slice(0, 5)
                  .map((lead) => (
                    <li
                      key={lead.id}
                      className="flex items-center justify-between gap-2 text-xs text-brand-text/80 dark:text-gray-300"
                    >
                      <span className="min-w-0 truncate">
                        <span className="font-medium text-brand-text dark:text-gray-200">
                          {lead.buyer_name}
                        </span>
                        <span className="mx-1.5">·</span>
                        <span className="truncate">{lead.listing_title}</span>
                      </span>
                      <Link
                        href="/dashboard/dealer"
                        className="shrink-0 text-brand-green hover:underline"
                      >
                        Öppna
                      </Link>
                    </li>
                  ))}
                {dealerData.leadActionItems.filter((l) => l.status === 'new').length > 5 && (
                  <li className="pt-1 text-[11px] text-brand-text/60">
                    +{dealerData.leadActionItems.filter((l) => l.status === 'new').length - 5} till
                  </li>
                )}
              </ul>
            )}
          </section>
        )}

        <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900">
          <div className="flex items-center justify-between gap-2">
            <div>
              <div className="flex items-center gap-1">
                <h2 className="text-sm font-semibold text-brand-text dark:text-white">
                  Pipeline-översikt
                </h2>
                <button
                  type="button"
                  className="group"
                  aria-label="Förklaring av pipeline-översikt"
                  title="Snabb överblick över hur många leads som är missade, nya och aktiva i din LeadOS-pipeline."
                >
                  <Info className="h-3.5 w-3.5 text-brand-text/40 group-hover:text-brand-text/70" />
                </button>
              </div>
              <p className="mt-1 text-xs text-brand-text/70">
                {`Missade: ${sellerLeadData.stats.missedCount} · Nya: ${sellerLeadData.stats.newCount} · Aktiva: ${sellerLeadData.stats.activeCount}`}
              </p>
            </div>
            <TrendingUp className="h-5 w-5 text-brand-text/50" />
          </div>
        </section>

        {/* Senaste aktivitet (Pulsen) – placeholder med dummy-data, kommande funktion */}
        <section
          className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900"
          aria-label="Senaste aktivitet – kommande funktion"
        >
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <h2 className="flex items-center gap-1.5 text-sm font-semibold text-brand-text dark:text-white">
              Senaste aktivitet
              <Lock
                className="h-4 w-4 text-brand-text/50 dark:text-gray-500"
                aria-hidden="true"
              />
            </h2>
            <div className="group relative">
              <button
                type="button"
                className="inline-flex h-6 w-6 items-center justify-center rounded-full text-brand-text/50 hover:text-brand-green focus:outline-none focus:ring-2 focus:ring-brand-green/30"
                aria-label="Vad du kan förvänta dig"
                title="What to expect"
              >
                <Info className="h-4 w-4" />
              </button>
              <div className="pointer-events-none absolute left-0 top-7 z-20 hidden w-72 rounded-lg border border-gray-200 bg-white p-3 text-xs normal-case text-brand-text shadow-lg group-hover:block group-focus-within:block dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200">
                Här kommer du att se en tidslinje med viktiga händelser – nya leads, annonser sålda,
                import lyckad – så du får en snabb puls på vad som hänt. Funktionen är under
                utveckling.
              </div>
            </div>
          </div>
          <ul
            className="space-y-1 border-l-2 border-brand-green/20 pl-4 dark:border-brand-green/30"
            role="list"
          >
            {RECENT_ACTIVITY_DUMMY.map((item, index) => (
              <li
                key={`${item.type}-${index}`}
                className="flex flex-wrap items-center gap-2 py-1.5 text-sm text-brand-text dark:text-gray-200"
              >
                {getActivityIcon(item.type)}
                <span className="min-w-0 flex-1">{item.message}</span>
                <span className="shrink-0 text-xs text-brand-text/60 dark:text-gray-400">
                  {item.relativeTime}
                </span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  )
}

