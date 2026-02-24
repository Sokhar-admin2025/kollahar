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
import { formatCurrency } from '@/lib/features/listings/utils/price-utils'
import LeadList from '@/app/components/LeadList'

interface DealerDashboardClientProps {
  companyName: string
  data: DealerDashboardData
  userId: string
  orgOwnerId?: string
  organizationId?: string
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
}: DealerDashboardClientProps) {
  const router = useRouter()
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
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
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
            <h1 className="text-2xl font-display font-bold text-brand-green dark:text-white sm:text-3xl">
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
                </tr>
              </thead>
              <tbody>
                {data.inventory.length === 0 ? (
                  <tr>
                    <td
                      colSpan={8}
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
                          {row.status === 'active' ? 'Aktiv' : row.status === 'draft' ? 'Gömd' : 'Såld'}
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
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
