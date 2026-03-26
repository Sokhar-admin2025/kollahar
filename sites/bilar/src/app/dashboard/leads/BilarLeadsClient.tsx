'use client'

import { useState, useTransition, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { AlertTriangle, Clock, CheckCircle2, ChevronRight, UserCircle2, Car } from 'lucide-react'
import type { BilarLead, LeadStatus } from '../../../lib/features/bilar-leads-service'

// ─── Typer ───────────────────────────────────────────────────────────────────

interface InitialFilters {
  status: string
  source: string
  make: string
  from: string
  to: string
}

interface BilarLeadsClientProps {
  leads: BilarLead[]
  organizationId: string
  nowIso: string
  initialFilters: InitialFilters
  updateStatusAction: (
    leadId: string,
    status: LeadStatus,
    organizationId: string
  ) => Promise<{ success: boolean; error?: string }>
}

// ─── Hjälpfunktioner ─────────────────────────────────────────────────────────

function relativeTime(isoString: string, now: Date): string {
  const diff = now.getTime() - new Date(isoString).getTime()
  if (diff < 60_000) return 'Nyss'
  const mins = Math.floor(diff / 60_000)
  if (mins < 60) return `${mins} min sedan`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours} h sedan`
  return `${Math.floor(hours / 24)} d sedan`
}

function slaCountdown(deadline: string, now: Date): string {
  const diff = new Date(deadline).getTime() - now.getTime()
  if (diff <= 0) return '0 min kvar'
  return `${Math.ceil(diff / 60_000)} min kvar`
}

// ─── Status-konfiguration ─────────────────────────────────────────────────────

const STATUS_CONFIG: Record<LeadStatus, { label: string; dot: string; bg: string; text: string }> =
  {
    new: {
      label: 'Ny',
      dot: '#2563EB',
      bg: '#EFF6FF',
      text: '#1D4ED8',
    },
    contacted: {
      label: 'Kontaktad',
      dot: '#16A34A',
      bg: '#F0FDF4',
      text: '#15803D',
    },
    qualified: {
      label: 'Kvalificerad',
      dot: '#D97706',
      bg: '#FEF9C3',
      text: '#92400E',
    },
    sold: {
      label: 'Såld',
      dot: '#0F172A',
      bg: '#F1F5F9',
      text: '#0F172A',
    },
    archived: {
      label: 'Arkiverad',
      dot: '#94A3B8',
      bg: '#F8FAFC',
      text: '#64748B',
    },
  }

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: 'all', label: 'Alla statusar' },
  { value: 'new', label: 'Ny' },
  { value: 'contacted', label: 'Kontaktad' },
  { value: 'qualified', label: 'Kvalificerad' },
  { value: 'sold', label: 'Såld' },
  { value: 'archived', label: 'Arkiverad' },
]

const SOURCE_OPTIONS: { value: string; label: string }[] = [
  { value: 'all', label: 'Alla källor' },
  { value: 'bilar', label: 'Bilar' },
  { value: 'main', label: 'Main' },
]

// ─── StatusDropdown ───────────────────────────────────────────────────────────

interface StatusDropdownProps {
  leadId: string
  current: LeadStatus
  disabled: boolean
  onSelect: (id: string, status: LeadStatus) => void
}

function StatusDropdown({ leadId, current, disabled, onSelect }: StatusDropdownProps) {
  const [open, setOpen] = useState(false)
  const cfg = STATUS_CONFIG[current]

  return (
    <div className="relative inline-block">
      <button
        type="button"
        disabled={disabled}
        onClick={(e) => {
          e.stopPropagation()
          setOpen((v) => !v)
        }}
        className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold transition hover:opacity-80 disabled:opacity-50"
        style={{ background: cfg.bg, color: cfg.text }}
      >
        <span
          className="inline-block h-1.5 w-1.5 rounded-full"
          style={{ background: cfg.dot }}
        />
        {cfg.label}
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={(e) => {
              e.stopPropagation()
              setOpen(false)
            }}
          />
          <div
            className="absolute left-0 top-full z-20 mt-1 min-w-[160px] rounded-lg border py-1 shadow-lg"
            style={{ background: '#FFFFFF', borderColor: '#E2E8F0' }}
            onClick={(e) => e.stopPropagation()}
          >
            {(Object.keys(STATUS_CONFIG) as LeadStatus[]).map((s) => {
              const c = STATUS_CONFIG[s]
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => {
                    onSelect(leadId, s)
                    setOpen(false)
                  }}
                  className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs font-medium transition hover:bg-[#F8FAFC]"
                  style={{ color: '#0F172A' }}
                >
                  <span
                    className="inline-block h-1.5 w-1.5 rounded-full"
                    style={{ background: c.dot }}
                  />
                  {c.label}
                </button>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}

// ─── SourceBadge ─────────────────────────────────────────────────────────────

function SourceBadge({ site }: { site: string }) {
  const isBilar = site === 'bilar'
  return (
    <span
      className="rounded-full px-2 py-0.5 text-[11px] font-semibold"
      style={
        isBilar
          ? { background: '#F0FDF4', color: '#15803D' }
          : { background: '#EFF6FF', color: '#1D4ED8' }
      }
    >
      {isBilar ? 'Bilar' : 'Main'}
    </span>
  )
}

// ─── SLA-indikator ────────────────────────────────────────────────────────────

function SlaIndicator({
  lead,
  now,
}: {
  lead: BilarLead
  now: Date
}) {
  if (lead.sla_missed) {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-semibold" style={{ color: '#EF4444' }}>
        <AlertTriangle className="h-3 w-3" />
        Missad
      </span>
    )
  }
  if (lead.sla_warning) {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-semibold" style={{ color: '#D97706' }}>
        <Clock className="h-3 w-3" />
        {slaCountdown(lead.sla_deadline, now)}
      </span>
    )
  }
  if (lead.first_response_at) {
    return (
      <span className="inline-flex items-center gap-1 text-[11px]" style={{ color: '#16A34A' }}>
        <CheckCircle2 className="h-3 w-3" />
        Inom SLA
      </span>
    )
  }
  if (lead.status === 'new') {
    return (
      <span className="inline-flex items-center gap-1 text-[11px]" style={{ color: '#64748B' }}>
        <Clock className="h-3 w-3" />
        {slaCountdown(lead.sla_deadline, now)}
      </span>
    )
  }
  return <span className="text-[11px]" style={{ color: '#94A3B8' }}>–</span>
}

// ─── LoadingSkeleton ──────────────────────────────────────────────────────────

function LoadingSkeleton() {
  return (
    <div className="divide-y" style={{ borderColor: '#F1F5F9' }}>
      {[...Array(5)].map((_, i) => (
        <div key={i} className="flex animate-pulse items-center gap-4 px-4 py-3">
          <div className="h-10 w-10 rounded-lg" style={{ background: '#F1F5F9' }} />
          <div className="flex-1 space-y-2">
            <div className="h-3 w-1/3 rounded" style={{ background: '#F1F5F9' }} />
            <div className="h-3 w-1/2 rounded" style={{ background: '#F1F5F9' }} />
          </div>
          <div className="h-5 w-16 rounded-full" style={{ background: '#F1F5F9' }} />
        </div>
      ))}
    </div>
  )
}

// ─── Huvud-komponent ──────────────────────────────────────────────────────────

export default function BilarLeadsClient({
  leads: initialLeads,
  organizationId,
  nowIso,
  initialFilters,
  updateStatusAction,
}: BilarLeadsClientProps) {
  const router = useRouter()
  const now = new Date(nowIso)

  const [optimisticStatus, setOptimisticStatus] = useState<Record<string, LeadStatus>>({})
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [, startTransition] = useTransition()

  const [filters, setFilters] = useState(initialFilters)
  const [pending, setPending] = useState(false)

  const leads = initialLeads.map((l) => ({
    ...l,
    status: optimisticStatus[l.id] ?? l.status,
  }))

  // ── Filterpush ──────────────────────────────────────────────────────────────
  const applyFilters = useCallback(
    (next: typeof filters) => {
      setPending(true)
      const params = new URLSearchParams()
      if (next.status && next.status !== 'all') params.set('status', next.status)
      if (next.source && next.source !== 'all') params.set('source', next.source)
      if (next.make) params.set('make', next.make)
      if (next.from) params.set('from', next.from)
      if (next.to) params.set('to', next.to)
      const qs = params.toString()
      router.push(`/dashboard/leads${qs ? `?${qs}` : ''}`)
      // pending-state rensas av navigeringen
    },
    [router]
  )

  // ── Statusbyte (optimistic) ─────────────────────────────────────────────────
  const handleStatusChange = (leadId: string, status: LeadStatus) => {
    setOptimisticStatus((prev) => ({ ...prev, [leadId]: status }))
    setUpdatingId(leadId)
    startTransition(async () => {
      const result = await updateStatusAction(leadId, status, organizationId)
      if (!result.success) {
        setOptimisticStatus((prev) => {
          const next = { ...prev }
          delete next[leadId]
          return next
        })
      } else {
        router.refresh()
      }
      setUpdatingId(null)
    })
  }

  // ── Filterändring ────────────────────────────────────────────────────────────
  const handleFilterChange = (key: keyof typeof filters, value: string) => {
    const next = { ...filters, [key]: value }
    setFilters(next)
    applyFilters(next)
  }

  // ── Summering ────────────────────────────────────────────────────────────────
  const missedCount = leads.filter((l) => l.sla_missed).length
  const newCount = leads.filter((l) => l.status === 'new' && !l.sla_missed).length

  return (
    <div className="min-h-screen" style={{ background: '#F7F8FA' }}>
      <div className="mx-auto max-w-5xl px-4 py-6">

        {/* Rubrik */}
        <header className="mb-5">
          <h1 className="text-xl font-semibold" style={{ color: '#0F172A' }}>
            Leads
          </h1>
          <p className="mt-0.5 text-sm" style={{ color: '#64748B' }}>
            {missedCount > 0
              ? `${missedCount} missade leads — åtgärda nu`
              : newCount > 0
                ? `${newCount} nya leads — svara inom 15 min`
                : 'Du är i fas — inga brådskande leads just nu'}
          </p>
        </header>

        {/* Filter */}
        <div
          className="mb-4 flex flex-wrap items-end gap-3 rounded-xl border p-4"
          style={{ background: '#FFFFFF', borderColor: '#E2E8F0' }}
        >
          {/* Status */}
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-medium uppercase tracking-wide" style={{ color: '#94A3B8' }}>
              Status
            </label>
            <select
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
              className="rounded-lg border px-3 py-1.5 text-sm focus:outline-none focus:ring-2"
              style={{
                borderColor: '#E2E8F0',
                color: '#0F172A',
                background: '#F8FAFC',
              }}
            >
              {STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          {/* Källa */}
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-medium uppercase tracking-wide" style={{ color: '#94A3B8' }}>
              Källa
            </label>
            <select
              value={filters.source}
              onChange={(e) => handleFilterChange('source', e.target.value)}
              className="rounded-lg border px-3 py-1.5 text-sm focus:outline-none"
              style={{ borderColor: '#E2E8F0', color: '#0F172A', background: '#F8FAFC' }}
            >
              {SOURCE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          {/* Märke */}
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-medium uppercase tracking-wide" style={{ color: '#94A3B8' }}>
              Märke
            </label>
            <input
              type="text"
              placeholder="t.ex. Volvo"
              value={filters.make}
              onChange={(e) => setFilters((f) => ({ ...f, make: e.target.value }))}
              onKeyDown={(e) => {
                if (e.key === 'Enter') applyFilters(filters)
              }}
              onBlur={() => applyFilters(filters)}
              className="rounded-lg border px-3 py-1.5 text-sm focus:outline-none focus:ring-2"
              style={{ borderColor: '#E2E8F0', color: '#0F172A', background: '#F8FAFC', width: 140 }}
            />
          </div>

          {/* Från */}
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-medium uppercase tracking-wide" style={{ color: '#94A3B8' }}>
              Från datum
            </label>
            <input
              type="date"
              value={filters.from}
              onChange={(e) => handleFilterChange('from', e.target.value)}
              className="rounded-lg border px-3 py-1.5 text-sm focus:outline-none"
              style={{ borderColor: '#E2E8F0', color: '#0F172A', background: '#F8FAFC' }}
            />
          </div>

          {/* Till */}
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-medium uppercase tracking-wide" style={{ color: '#94A3B8' }}>
              Till datum
            </label>
            <input
              type="date"
              value={filters.to}
              onChange={(e) => handleFilterChange('to', e.target.value)}
              className="rounded-lg border px-3 py-1.5 text-sm focus:outline-none"
              style={{ borderColor: '#E2E8F0', color: '#0F172A', background: '#F8FAFC' }}
            />
          </div>

          {(filters.status !== 'all' || filters.source !== 'all' || filters.make || filters.from || filters.to) && (
            <button
              type="button"
              onClick={() => {
                const cleared = { status: 'all', source: 'all', make: '', from: '', to: '' }
                setFilters(cleared)
                applyFilters(cleared)
              }}
              className="rounded-lg px-3 py-1.5 text-sm font-medium transition hover:opacity-80"
              style={{ color: '#EF4444', background: '#FEF2F2' }}
            >
              Rensa filter
            </button>
          )}
        </div>

        {/* Tabell */}
        <div
          className="overflow-hidden rounded-xl border"
          style={{ background: '#FFFFFF', borderColor: '#E2E8F0' }}
        >
          {pending ? (
            <LoadingSkeleton />
          ) : leads.length === 0 ? (
            /* Tom state */
            <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
              <Car className="mb-3 h-10 w-10" style={{ color: '#BFDBFE' }} />
              <p className="font-semibold" style={{ color: '#0F172A' }}>
                Inga leads ännu
              </p>
              <p className="mt-1 max-w-xs text-sm" style={{ color: '#64748B' }}>
                Annonser från bilar.kollahar.se och kollahar.se visas här när du får
                inkommande leads.
              </p>
            </div>
          ) : (
            <>
              {/* Tabellhuvud */}
              <div
                className="hidden grid-cols-[1fr_1fr_auto_auto_auto_auto] items-center gap-4 border-b px-4 py-2 text-[11px] font-medium uppercase tracking-wide md:grid"
                style={{ borderColor: '#F1F5F9', color: '#94A3B8' }}
              >
                <span>Köpare</span>
                <span>Bil</span>
                <span className="w-[88px]">Status</span>
                <span className="w-[56px]">Källa</span>
                <span className="w-[100px]">SLA</span>
                <span className="w-[88px] text-right">Tid</span>
              </div>

              {/* Rader */}
              <div className="divide-y" style={{ borderColor: '#F1F5F9' }}>
                {leads.map((lead) => (
                  <button
                    key={lead.id}
                    type="button"
                    onClick={() => router.push(`/dashboard/leads/${lead.id}`)}
                    className="group grid w-full grid-cols-[1fr_auto] items-center gap-3 px-4 py-3 text-left transition hover:bg-[#F8FAFC] md:grid-cols-[1fr_1fr_auto_auto_auto_auto_auto]"
                  >
                    {/* Köpare */}
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                        style={{ background: '#EFF6FF' }}
                      >
                        <UserCircle2 className="h-4 w-4" style={{ color: '#2563EB' }} />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium" style={{ color: '#0F172A' }}>
                          {lead.buyer_name}
                        </p>
                        {lead.is_guest && (
                          <span className="text-[11px]" style={{ color: '#94A3B8' }}>
                            Gäst
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Bil */}
                    <div className="hidden min-w-0 md:block">
                      <p className="truncate text-sm" style={{ color: '#0F172A' }}>
                        {[lead.listing_make, lead.listing_model].filter(Boolean).join(' ') || lead.listing_title}
                      </p>
                      {lead.listing_year && (
                        <p className="text-[11px]" style={{ color: '#94A3B8' }}>
                          {lead.listing_year}
                        </p>
                      )}
                    </div>

                    {/* Status */}
                    <div
                      onClick={(e) => e.stopPropagation()}
                      className="hidden w-[88px] md:block"
                    >
                      <StatusDropdown
                        leadId={lead.id}
                        current={lead.status}
                        disabled={updatingId === lead.id}
                        onSelect={handleStatusChange}
                      />
                    </div>

                    {/* Källa */}
                    <div className="hidden w-[56px] md:block">
                      <SourceBadge site={lead.source_site} />
                    </div>

                    {/* SLA */}
                    <div className="hidden w-[100px] md:block">
                      <SlaIndicator lead={lead} now={now} />
                    </div>

                    {/* Tid */}
                    <p className="hidden w-[88px] text-right text-[11px] md:block" style={{ color: '#94A3B8' }}>
                      {relativeTime(lead.created_at, now)}
                    </p>

                    {/* Mobil: chevron */}
                    <ChevronRight
                      className="h-4 w-4 shrink-0 transition group-hover:translate-x-0.5 md:hidden"
                      style={{ color: '#CBD5E1' }}
                    />

                    {/* Mobil: statusrad under */}
                    <div className="col-span-2 flex flex-wrap items-center gap-2 md:hidden">
                      <StatusDropdown
                        leadId={lead.id}
                        current={lead.status}
                        disabled={updatingId === lead.id}
                        onSelect={handleStatusChange}
                      />
                      <SourceBadge site={lead.source_site} />
                      <SlaIndicator lead={lead} now={now} />
                      <span className="text-[11px]" style={{ color: '#94A3B8' }}>
                        {relativeTime(lead.created_at, now)}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Footer-räknare */}
        {leads.length > 0 && (
          <p className="mt-3 text-center text-[11px]" style={{ color: '#94A3B8' }}>
            {leads.length} lead{leads.length !== 1 ? 's' : ''}
            {missedCount > 0 && (
              <span className="ml-2 font-semibold" style={{ color: '#EF4444' }}>
                · {missedCount} missade
              </span>
            )}
          </p>
        )}
      </div>
    </div>
  )
}
