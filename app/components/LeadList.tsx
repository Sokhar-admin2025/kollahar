'use client'

import { useMemo, useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { updateLeadStatusAction } from '@/app/actions/lead-actions'
import type { LeadActionItem, LeadStatus } from '@/lib/features/dealer/dealer-analytics-service'

const STATUS_OPTIONS: Array<{ value: LeadStatus; label: string }> = [
  { value: 'new', label: 'Ny' },
  { value: 'contacted', label: 'Kontaktad' },
  { value: 'qualified', label: 'Kvalificerad' },
  { value: 'sold', label: 'Såld' },
  { value: 'archived', label: 'Arkiverad' },
]

function formatRelativeTime(isoDate: string): string {
  const target = new Date(isoDate).getTime()
  const now = Date.now()
  const diffMs = target - now
  const abs = Math.abs(diffMs)
  const minute = 60 * 1000
  const hour = 60 * minute
  const day = 24 * hour
  const rtf = new Intl.RelativeTimeFormat('sv-SE', { numeric: 'auto' })

  if (abs < hour) return rtf.format(Math.round(diffMs / minute), 'minute')
  if (abs < day) return rtf.format(Math.round(diffMs / hour), 'hour')
  return rtf.format(Math.round(diffMs / day), 'day')
}

interface LeadListProps {
  leads: LeadActionItem[]
}

export default function LeadList({ leads }: LeadListProps) {
  const router = useRouter()
  const [pendingLeadId, setPendingLeadId] = useState<string | null>(null)
  const [localStatus, setLocalStatus] = useState<Record<string, LeadStatus>>({})
  const [, startTransition] = useTransition()

  const byId = useMemo(() => new Map(leads.map((lead) => [lead.id, lead])), [leads])

  const handleStatusChange = (leadId: string, status: LeadStatus) => {
    setLocalStatus((prev) => ({ ...prev, [leadId]: status }))
    setPendingLeadId(leadId)
    startTransition(async () => {
      const res = await updateLeadStatusAction(leadId, status)
      if (!res.success) {
        setLocalStatus((prev) => {
          const next = { ...prev }
          delete next[leadId]
          return next
        })
      } else {
        router.refresh()
      }
      setPendingLeadId(null)
    })
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <div className="border-b border-gray-200 px-6 py-4 dark:border-gray-700">
        <h2 className="text-lg font-semibold text-brand-text dark:text-white">Lead Action Center</h2>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[56rem] text-left text-sm">
          <thead className="border-b border-gray-200 bg-gray-50 text-xs uppercase text-gray-500 dark:border-gray-700 dark:bg-gray-700/50 dark:text-gray-400">
            <tr>
              <th className="px-4 py-3">Kund</th>
              <th className="px-4 py-3">Intresse</th>
              <th className="px-4 py-3">Inkommen</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {leads.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                  Inga leads ännu.
                </td>
              </tr>
            ) : (
              leads.map((lead) => {
                const current = byId.get(lead.id)
                if (!current) return null
                const listingText = [current.listing_make, current.listing_model, current.listing_year ? String(current.listing_year) : null]
                  .filter(Boolean)
                  .join(' ')
                const isPending = pendingLeadId === lead.id

                return (
                  <tr key={lead.id} className="border-b border-gray-100 dark:border-gray-700">
                    <td className="px-4 py-3 align-top">
                      <p className="font-medium text-brand-text dark:text-white">{current.buyer_name}</p>
                      <p className="text-xs text-brand-text/70 dark:text-gray-400">{current.buyer_phone}</p>
                    </td>
                    <td className="px-4 py-3 align-top">
                      {current.listing_id ? (
                        <Link href={`/annons/${current.listing_id}`} className="font-medium text-brand-green hover:underline">
                          {listingText || current.listing_title}
                        </Link>
                      ) : (
                        <span className="text-brand-text/70 dark:text-gray-400">Borttagen annons</span>
                      )}
                      {listingText && (
                        <p className="text-xs text-brand-text/60 dark:text-gray-400 mt-0.5">{current.listing_title}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-brand-text/80 dark:text-gray-300 align-top">
                      {formatRelativeTime(current.created_at)}
                    </td>
                    <td className="px-4 py-3 align-top">
                      <select
                        value={localStatus[current.id] ?? current.status}
                        disabled={isPending}
                        onChange={(e) => handleStatusChange(current.id, e.target.value as LeadStatus)}
                        className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm text-brand-text focus:border-brand-green focus:outline-none focus:ring-2 focus:ring-brand-green/20 disabled:opacity-60 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-200"
                      >
                        {STATUS_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
