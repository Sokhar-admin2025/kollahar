'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import {
  TrendingUp,
  Users,
  Package,
  ArrowLeft,
  Upload,
  BarChart3,
  MessageSquare,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  CircleHelp,
  Sparkles,
} from 'lucide-react'

import type { DealerDashboardData } from '@/lib/features/dealer/dealer-analytics-service'
import type { SaleListItem } from '@/lib/features/leados/leados-sales-service'
import { formatCurrency } from '@/lib/features/listings/utils/price-utils'
import LeadList from '@/app/components/LeadList'
import { reassignLeadAction } from '@/app/actions/lead-actions'
import { confirmListingSaleAction } from '@/app/actions/listing-sale-actions'
import { useTransition, useState } from 'react'

interface DealerDashboardClientProps {
  companyName: string
  data: DealerDashboardData
  userId: string
  orgOwnerId?: string
  organizationId?: string
  recentSales: SaleListItem[]
}

function InfoHint({ text }: { text: string }) {
  return (
    <div className="group relative">
      <button
        type="button"
        aria-label="Visa mer info"
        className="inline-flex h-6 w-6 items-center justify-center rounded-full text-gray-500 hover:text-brand-green focus:outline-none focus:ring-2 focus:ring-brand-green/30"
      >
        <CircleHelp className="h-4 w-4" />
      </button>
      <div className="pointer-events-none absolute right-0 top-7 z-20 hidden w-64 rounded-lg border border-gray-200 bg-white p-3 text-xs normal-case text-brand-text shadow-lg group-hover:block group-focus-within:block dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200">
        {text}
      </div>
    </div>
  )
}

export default function DealerDashboardClient({
  companyName,
  data,
  orgOwnerId,
  organizationId,
  recentSales,
}: DealerDashboardClientProps) {
  const router = useRouter()
  const [isReassigning, startReassignTransition] = useTransition()
  const [reassignError, setReassignError] = useState<string | null>(null)
  const [reassignInputs, setReassignInputs] = useState<Record<string, string>>({})
  const [reassignSuccessLeadId, setReassignSuccessLeadId] = useState<string | null>(null)
  const [isConfirmingSale, startConfirmSaleTransition] = useTransition()
  const [saleError, setSaleError] = useState<string | null>(null)
  const sellerId = orgOwnerId ?? ''
  const orgId = organizationId ?? ''

  useEffect(() => {
    if (!sellerId || !orgId) return
    const supabase = createClient()
    const channel = supabase
      .channel('dealer-dashboard')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'leads',
          filter: `organization_id=eq.${orgId}`,
        },
        () => router.refresh()
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'listing_views',
          filter: `seller_id=eq.${sellerId}`,
        },
        () => router.refresh()
      )
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [sellerId, orgId, router])

  const formatPercent = (value: number) => `${value.toFixed(2)}%`
  const getConversionBadgeClass = (value: number) => {
    if (value < 1) return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
    if (value <= 3) return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400'
    return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400'
  }
  const analyticsProTooltipText =
    'Se exakt varifrån dina leads kommer (Facebook, Google, Instagram). Få veckovisa ROI-rapporter och optimera din annonsbudget. Klicka för att kontakta oss och aktivera Pro-vyn för din anläggning.'
  const analyticsProMailto = `mailto:hej@kollahar.se?subject=${encodeURIComponent('Intresse: Analytics Pro (Beta)')}&body=${encodeURIComponent(
    'Hej! Jag är intresserad av att höra mer om Analytics Pro för vår anläggning.'
  )}`

  return (
    <div className="min-h-screen bg-brand-beige dark:bg-gray-900">
      <div className="mx-auto max-w-6xl px-4 py-5">
        {/* Header */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Link
              href="/dashboard"
              className="mb-2 inline-flex items-center gap-1 text-sm text-brand-text hover:text-brand-green dark:text-gray-400 dark:hover:text-brand-green"
            >
              <ArrowLeft size={16} />
              Tillbaka till Min Sida
            </Link>
            <p className="text-xs uppercase tracking-wide text-brand-text/60 dark:text-gray-400">
              Dealer
            </p>
            <h1 className="mt-1 text-2xl font-display font-bold text-brand-green dark:text-white sm:text-3xl">
              Dealer Command Center
            </h1>
            <p className="mt-1 text-brand-text dark:text-gray-400">
              {companyName}
            </p>
          </div>
          <div className="flex gap-2">
            <Link
              href="/dashboard/import"
              className="inline-flex items-center gap-2 rounded-xl bg-brand-green/10 px-4 py-2.5 text-sm font-semibold text-brand-green hover:bg-brand-green/20"
            >
              <Upload size={18} />
              Importera CSV
            </Link>
            <div className="group relative inline-flex">
              <a
                href={analyticsProMailto}
                className="inline-flex items-center gap-2 rounded-xl border border-indigo-200 bg-gradient-to-r from-indigo-50 to-amber-50 px-4 py-2.5 text-sm font-semibold text-indigo-700 shadow-sm transition hover:from-indigo-100 hover:to-amber-100 hover:text-indigo-800 dark:border-indigo-700/60 dark:from-indigo-900/30 dark:to-amber-900/20 dark:text-indigo-300 dark:hover:from-indigo-900/50 dark:hover:to-amber-900/30"
              >
                <Sparkles size={18} />
                Aktivera Analytics Pro (Beta)
              </a>
              <div className="pointer-events-none absolute right-0 top-[calc(100%+8px)] z-20 hidden w-80 rounded-lg border border-gray-200 bg-white p-3 text-xs normal-case text-brand-text shadow-lg group-hover:block group-focus-within:block dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200">
                {analyticsProTooltipText}
              </div>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-blue-100 p-2.5 dark:bg-blue-900/30">
                <BarChart3 className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Total Views
                </p>
                <p className="text-2xl font-bold text-brand-text dark:text-white">
                  {data.totalViews.toLocaleString('sv-SE')}
                </p>
              </div>
            </div>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-amber-100 p-2.5 dark:bg-amber-900/30">
                <Users className="h-6 w-6 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Total Leads
                </p>
                <p className="text-2xl font-bold text-brand-text dark:text-white">
                  {data.totalLeads}
                </p>
              </div>
            </div>
          </div>
          <Link
            href="/dashboard/messages"
            className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:border-gray-800 hover:border-brand-green/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-emerald-100 p-2.5 dark:bg-emerald-900/30">
                <MessageSquare className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Aktiva konversationer
                </p>
                <p className="text-2xl font-bold text-brand-text dark:text-white">
                  {data.activeConversationsCount}
                </p>
              </div>
            </div>
          </Link>
          <div className="relative rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
            <div className="absolute right-3 top-3">
              <InfoHint text="Inventory Health visar hur attraktiv en annons är. Poängen bygger på >3 bilder, >100 tecken i beskrivningen och ≥1 visning." />
            </div>
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-green-100 p-2.5 dark:bg-green-900/30">
                <Package className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Inventory Health
                </p>
                <p className="text-2xl font-bold text-brand-text dark:text-white">
                  {data.averageHealthPercent}% ∅
                </p>
              </div>
            </div>
          </div>
          <div className="relative rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
            <div className="absolute right-3 top-3">
              <InfoHint text="Conversion Rate = leads / views. Färger: röd <1%, gul 1–3%, grön >3%. Trenden jämför senaste veckan med veckan innan." />
            </div>
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-violet-100 p-2.5 dark:bg-violet-900/30">
                <TrendingUp className="h-6 w-6 text-violet-600 dark:text-violet-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Conversion Rate
                </p>
                <p className="text-2xl font-bold text-brand-text dark:text-white">
                  {formatPercent(data.conversionRate)}
                </p>
                <p className="mt-0.5 inline-flex items-center gap-1 text-xs font-medium text-brand-text/70 dark:text-gray-300">
                  {data.conversionTrend === 'up' ? (
                    <ArrowUpRight className="h-3.5 w-3.5 text-emerald-500" />
                  ) : data.conversionTrend === 'down' ? (
                    <ArrowDownRight className="h-3.5 w-3.5 text-red-500" />
                  ) : (
                    <Minus className="h-3.5 w-3.5 text-amber-500" />
                  )}
                  {`${data.conversionTrendDelta >= 0 ? '+' : ''}${data.conversionTrendDelta.toFixed(2)} pp vs förra veckan`}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Performance Insights */}
        <div className="mb-8 rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <div className="border-b border-gray-200 px-6 py-4 dark:border-gray-700">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-brand-text dark:text-white">
              <TrendingUp size={20} />
              Performance Insights
            </h2>
          </div>
          <div className="grid gap-6 p-6 sm:grid-cols-2">
            {/* Trending */}
            <div>
              <h3 className="mb-3 text-sm font-medium text-gray-500 dark:text-gray-400">
                Top 3 Trending (senaste 7 dagar)
              </h3>
              {data.trendingListings.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Inga visningar än.
                </p>
              ) : (
                <ul className="space-y-2">
                  {data.trendingListings.map((l) => (
                    <li
                      key={l.id}
                      className="flex items-center justify-between rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 dark:border-gray-700 dark:bg-gray-700/50"
                    >
                      <Link
                        href={`/annons/${l.id}`}
                        className="truncate font-medium text-brand-text hover:text-brand-green dark:text-white dark:hover:text-brand-green"
                      >
                        {l.title}
                      </Link>
                      <span className="ml-2 shrink-0 rounded-full bg-brand-green/10 px-2 py-0.5 text-xs font-semibold text-brand-green">
                        {l.views} visningar
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            {/* Price Drop */}
            <div>
              <h3 className="mb-3 text-sm font-medium text-gray-500 dark:text-gray-400">
                Price Drop Performance
              </h3>
              {data.priceDropListings.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Inga prissänkningar än.
                </p>
              ) : (
                <ul className="space-y-2">
                  {data.priceDropListings.map((l) => (
                    <li
                      key={l.id}
                      className="flex items-center justify-between rounded-lg border border-amber-100 bg-amber-50/50 px-3 py-2 dark:border-amber-900/30 dark:bg-amber-900/10"
                    >
                      <Link
                        href={`/annons/${l.id}`}
                        className="truncate font-medium text-brand-text hover:text-brand-green dark:text-white dark:hover:text-brand-green"
                      >
                        {l.title}
                      </Link>
                      <span className="ml-2 shrink-0 rounded-full bg-amber-200 px-2 py-0.5 text-xs font-semibold text-amber-800 dark:bg-amber-900/50 dark:text-amber-200">
                        {formatCurrency(l.previous_price)} → {formatCurrency(l.price)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>

        <div className="mb-8">
          <LeadList leads={data.leadActionItems} />
        </div>

        {/* Lead Commander – enkel omfördelning av leads */}
        <div className="mb-8 rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <div className="flex flex-col gap-2 border-b border-gray-200 px-6 py-4 sm:flex-row sm:items-center sm:justify-between dark:border-gray-700">
            <div>
              <h2 className="text-lg font-semibold text-brand-text dark:text-white">
                Lead Commander
              </h2>
              <p className="mt-1 text-xs text-brand-text/70 dark:text-gray-400">
                Intern vy för att omfördela aktiva leads inom din organisation.
              </p>
            </div>
            {reassignError && (
              <p className="text-xs text-red-500 dark:text-red-400">{reassignError}</p>
            )}
            {reassignSuccessLeadId && !reassignError && (
              <p className="text-xs text-emerald-600 dark:text-emerald-400">
                Lead omfördelad.
              </p>
            )}
          </div>
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {data.leadCommanderItems.length === 0 ? (
              <div className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                Inga aktiva leads att omfördela just nu.
              </div>
            ) : (
              data.leadCommanderItems
                .slice()
                .sort((a, b) => {
                  const aUnassigned = a.assigned_to ? 1 : 0
                  const bUnassigned = b.assigned_to ? 1 : 0
                  if (aUnassigned !== bUnassigned) return aUnassigned - bUnassigned
                  const aIsNew = a.status === 'new' ? 0 : 1
                  const bIsNew = b.status === 'new' ? 0 : 1
                  return aIsNew - bIsNew
                })
                .slice(0, 10)
                .map((lead) => (
                <div
                  key={lead.id}
                  className="flex flex-col gap-3 px-6 py-4 md:flex-row md:items-center md:justify-between"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-brand-text dark:text-white">
                      {lead.buyer_name}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-brand-text/70 dark:text-gray-400">
                      {lead.listing_title}
                    </p>
                    <p className="mt-1 text-[11px] text-brand-text/60 dark:text-gray-500">
                      Status:{' '}
                      <span className="font-medium">
                        {lead.status === 'new'
                          ? 'Ny'
                          : lead.status === 'contacted'
                            ? 'Kontaktad'
                            : lead.status === 'qualified'
                              ? 'Kvalificerad'
                              : lead.status === 'sold'
                                ? 'Såld'
                                : 'Arkiverad'}
                      </span>{' '}
                      · Tilldelad:{' '}
                      <span className="font-medium">
                        {lead.assigned_to ? lead.assigned_to : 'Ej tilldelad'}
                      </span>
                    </p>
                  </div>
                  <form
                    className="flex flex-col gap-2 md:w-80 md:flex-row md:items-center md:justify-end"
                    onSubmit={(e) => {
                      e.preventDefault()
                      const targetId = reassignInputs[lead.id]?.trim()
                      if (!targetId) {
                        setReassignError('Ange ett profil-id att omfördela till.')
                        setReassignSuccessLeadId(null)
                        return
                      }
                      setReassignError(null)
                      setReassignSuccessLeadId(null)
                      startReassignTransition(async () => {
                        const result = await reassignLeadAction(lead.id, targetId)
                        if (!result.success) {
                          setReassignError(result.error)
                          setReassignSuccessLeadId(null)
                        } else {
                          setReassignInputs((prev) => ({ ...prev, [lead.id]: '' }))
                          setReassignSuccessLeadId(lead.id)
                          // Data hämtas om via server-render vid nästa sidladdning; här kan vi nöja oss.
                        }
                      })
                    }}
                  >
                    <input
                      type="text"
                      value={reassignInputs[lead.id] ?? ''}
                      onChange={(e) =>
                        setReassignInputs((prev) => ({ ...prev, [lead.id]: e.target.value }))
                      }
                      placeholder="Nytt assignee profil-id"
                      className="w-full rounded-lg border border-gray-300 bg-white px-2 py-1 text-xs text-brand-text shadow-sm focus:border-brand-green focus:outline-none focus:ring-2 focus:ring-brand-green/20 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
                    />
                    <button
                      type="submit"
                      disabled={isReassigning}
                      className="inline-flex items-center justify-center rounded-lg bg-brand-green px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-brand-green/90 disabled:opacity-60"
                    >
                      {isReassigning ? 'Omfördelar…' : 'Omfördela'}
                    </button>
                  </form>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Inventory Management */}
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <div className="flex flex-col gap-4 border-b border-gray-200 px-6 py-4 sm:flex-row sm:items-center sm:justify-between dark:border-gray-700">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-brand-text dark:text-white">
              <Package size={20} />
              Inventory Management
            </h2>
            <button
              type="button"
              disabled
              className="inline-flex items-center gap-2 rounded-xl border border-gray-300 bg-gray-50 px-4 py-2 text-sm font-medium text-gray-400 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-500"
              title="Kommer i Phase 4"
            >
              <Upload size={18} />
              Bulk Import (Phase 4)
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[32rem] text-left text-sm">
              <thead className="border-b border-gray-200 bg-gray-50 text-xs uppercase text-gray-500 dark:border-gray-700 dark:bg-gray-700/50 dark:text-gray-400">
                <tr>
                  <th className="px-4 py-3">Titel</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Health</th>
                  <th className="px-4 py-3">Pris</th>
                  <th className="px-4 py-3">Views</th>
                  <th className="px-4 py-3">Favoriter</th>
                  <th className="px-4 py-3">Leads</th>
                  <th className="px-4 py-3">Conv. %</th>
                  <th className="px-4 py-3 text-right">Åtgärder</th>
                </tr>
              </thead>
              <tbody>
                {data.inventory.length === 0 ? (
                  <tr>
                    <td
                      colSpan={9}
                      className="px-4 py-8 text-center text-gray-500 dark:text-gray-400"
                    >
                      Inga annonser än. Lägg till din första annons.
                    </td>
                  </tr>
                ) : (
                  data.inventory.map((row) => (
                    <tr
                      key={row.id}
                      className="cursor-pointer border-b border-gray-100 transition hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-700/30"
                      onClick={() => router.push(`/annons/${row.id}`)}
                    >
                      <td className="px-4 py-3 font-medium text-brand-text dark:text-white">
                        <Link
                          href={`/annons/${row.id}`}
                          className="hover:text-brand-green"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {row.title}
                        </Link>
                        {(row.make || row.model || row.year) && (
                          <div className="mt-0.5 text-xs font-normal text-brand-text/60 dark:text-gray-400">
                            {[row.year, row.make, row.model].filter(Boolean).join(' ')}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                            row.status === 'active'
                              ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                              : row.status === 'draft'
                                ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400'
                                : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                          }`}
                        >
                          {row.status === 'active'
                            ? 'Aktiv'
                            : row.status === 'draft'
                              ? 'Gömd'
                              : 'Såld'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                            row.healthScore >= 100
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400'
                              : row.healthScore >= 70
                                ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
                                : 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400'
                          }`}
                        >
                          {row.healthScore}%
                        </span>
                      </td>
                      <td className="px-4 py-3 text-brand-text dark:text-gray-300">
                        {row.bortskankes ? 'Bortskänkes' : formatCurrency(row.price)}
                      </td>
                      <td className="px-4 py-3 text-brand-text dark:text-gray-300">
                        {row.views}
                      </td>
                      <td className="px-4 py-3 text-brand-text dark:text-gray-300">
                        {row.favorites}
                      </td>
                      <td className="px-4 py-3 text-brand-text dark:text-gray-300">
                        {row.leads}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${getConversionBadgeClass(row.conversionRate)}`}
                        >
                          {formatPercent(row.conversionRate)}
                        </span>
                        <div className="mt-1 inline-flex items-center gap-1 text-[11px] text-brand-text/70 dark:text-gray-400">
                          {row.conversionTrend === 'up' ? (
                            <ArrowUpRight className="h-3.5 w-3.5 text-emerald-500" />
                          ) : row.conversionTrend === 'down' ? (
                            <ArrowDownRight className="h-3.5 w-3.5 text-red-500" />
                          ) : (
                            <Minus className="h-3.5 w-3.5 text-amber-500" />
                          )}
                          {`${row.conversionTrendDelta >= 0 ? '+' : ''}${row.conversionTrendDelta.toFixed(2)} pp`}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right align-middle">
                        <div className="flex flex-col items-end gap-1 text-[11px]">
                          {row.status === 'sold' ? (
                            <p className="max-w-xs text-right text-[11px] text-brand-text/70 dark:text-gray-400">
                              Annonsen är såld – se <span className="font-semibold">Senaste
                              försäljningar</span> nedan för sammanfattning.
                            </p>
                          ) : (
                            <>
                              <button
                                type="button"
                                disabled={isConfirmingSale}
                                onClick={(e) => {
                                  e.stopPropagation()
                                  const confirmed = window.confirm(
                                    'Är du säker på att denna annons är såld? Detta markerar annonsen som såld och skapar en säljdump i LeadOS.'
                                  )
                                  if (!confirmed) return
                                  const soldVia: 'sokhar' | 'external' | 'other' = 'external'
                                  setSaleError(null)
                                  startConfirmSaleTransition(async () => {
                                    const result = await confirmListingSaleAction({
                                      listingId: row.id,
                                      soldVia,
                                      leadId: null,
                                    })
                                    if (!result.success) {
                                      setSaleError(result.error)
                                    } else {
                                      router.refresh()
                                    }
                                  })
                                }}
                                className="inline-flex items-center justify-center rounded-full bg-emerald-600 px-3 py-1 text-[11px] font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-60"
                              >
                                {isConfirmingSale ? 'Markerar…' : 'Markera som såld'}
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  router.push(`/dashboard/edit/${row.id}`)
                                }}
                                className="inline-flex items-center justify-center rounded-full bg-gray-100 px-3 py-1 text-[11px] font-medium text-brand-text shadow-sm transition hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
                              >
                                Hantera annons
                              </button>
                            </>
                          )}
                          {saleError && (
                            <p className="mt-0.5 max-w-xs text-right text-[11px] text-red-500 dark:text-red-400">
                              {saleError}
                            </p>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Senaste försäljningar */}
        <div className="mt-8 rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <div className="border-b border-gray-200 px-6 py-4 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-brand-text dark:text-white">
              Senaste försäljningar
            </h2>
            <p className="mt-1 text-xs text-brand-text/70 dark:text-gray-400">
              Läs in de senaste affärerna registrerade i LeadOS (listing_sales). Endast läsning i
              första versionen.
            </p>
          </div>
          {recentSales.length === 0 ? (
            <div className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
              Inga registrerade försäljningar ännu.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[32rem] text-left text-sm">
                <thead className="border-b border-gray-200 bg-gray-50 text-xs uppercase text-gray-500 dark:border-gray-700 dark:bg-gray-700/50 dark:text-gray-400">
                  <tr>
                    <th className="px-4 py-3">Datum</th>
                    <th className="px-4 py-3">Annons</th>
                    <th className="px-4 py-3">Pris</th>
                    <th className="px-4 py-3">Säljare</th>
                    <th className="px-4 py-3">Kanal</th>
                  </tr>
                </thead>
                <tbody>
                  {recentSales.map((sale) => (
                    <tr
                      key={sale.id}
                      className="border-b border-gray-100 last:border-0 dark:border-gray-700"
                    >
                      <td className="px-4 py-3 text-xs text-brand-text/80 dark:text-gray-300">
                        {new Date(sale.soldAt).toLocaleString('sv-SE', {
                          year: 'numeric',
                          month: '2-digit',
                          day: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-brand-text dark:text-white">
                        <div className="truncate">{sale.listingTitle}</div>
                        {(sale.listingMake || sale.listingModel || sale.listingYear) && (
                          <div className="mt-0.5 text-xs font-normal text-brand-text/60 dark:text-gray-400">
                            {[sale.listingYear, sale.listingMake, sale.listingModel]
                              .filter(Boolean)
                              .join(' ')}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-brand-text dark:text-gray-300">
                        {typeof sale.priceAtSale === 'number'
                          ? formatCurrency(sale.priceAtSale)
                          : '–'}
                      </td>
                      <td className="px-4 py-3 text-sm text-brand-text/80 dark:text-gray-300">
                        {sale.soldByName ?? 'Okänd'}
                      </td>
                      <td className="px-4 py-3 text-xs text-brand-text/70 dark:text-gray-400">
                        {sale.soldVia === 'sokhar'
                          ? 'Kollahär/LeadOS'
                          : sale.soldVia === 'external'
                            ? 'Extern kanal'
                            : 'Annat'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
