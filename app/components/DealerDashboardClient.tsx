'use client'

import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  TrendingUp,
  Users,
  Package,
  Ship,
  ArrowLeft,
  Upload,
  BarChart3,
} from 'lucide-react'

import type { DealerDashboardData } from '@/lib/features/dealer/dealer-analytics-service'
import { formatCurrency } from '@/lib/features/listings/utils/price-utils'

interface DealerDashboardClientProps {
  companyName: string
  data: DealerDashboardData
  userId: string
}

export default function DealerDashboardClient({
  companyName,
  data,
}: DealerDashboardClientProps) {
  const router = useRouter()

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
          <Link
            href="/dashboard/create"
            className="inline-flex items-center gap-2 rounded-xl bg-brand-green px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-green/90"
          >
            <Ship size={18} />
            Ny annons
          </Link>
        </div>

        {/* Stats Grid */}
        <div className="mb-8 grid gap-4 sm:grid-cols-3">
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
                  Hot Leads (30 dagar)
                </p>
                <p className="text-2xl font-bold text-brand-text dark:text-white">
                  {data.hotLeadsLast30Days}
                </p>
              </div>
            </div>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-green-100 p-2.5 dark:bg-green-900/30">
                <Package className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Inventory Health
                </p>
                <p className="text-2xl font-bold text-brand-text dark:text-white">
                  {data.activeListingsCount} aktiva
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
                  {data.trendingListings.map((l, i) => (
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
                  <th className="px-4 py-3">Pris</th>
                  <th className="px-4 py-3">Views</th>
                  <th className="px-4 py-3">Leads</th>
                </tr>
              </thead>
              <tbody>
                {data.inventory.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
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
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                            row.status === 'active'
                              ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                              : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                          }`}
                        >
                          {row.status === 'active' ? 'Aktiv' : 'Såld'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-brand-text dark:text-gray-300">
                        {row.bortskankes ? 'Bortskänkes' : formatCurrency(row.price)}
                      </td>
                      <td className="px-4 py-3 text-brand-text dark:text-gray-300">
                        {row.views}
                      </td>
                      <td className="px-4 py-3 text-brand-text dark:text-gray-300">
                        {row.leads}
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
