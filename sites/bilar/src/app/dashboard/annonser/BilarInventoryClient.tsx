'use client'

import { useState, useTransition, useRef, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import {
  Car,
  Plus,
  MoreHorizontal,
  Eye,
  EyeOff,
  Pencil,
  Trash2,
  CheckCircle2,
  AlertCircle,
  X,
} from 'lucide-react'
import type { BilarListing } from '../../../lib/features/bilar-listings-service'

// ─── Props ────────────────────────────────────────────────────────────────────

interface InitialFilters {
  status: string
  make: string
}

interface BilarInventoryClientProps {
  listings: BilarListing[]
  organizationId: string
  initialFilters: InitialFilters
  updateStatusAction: (
    listingId: string,
    organizationId: string,
    status: 'active' | 'paused' | 'sold'
  ) => Promise<{ success: boolean; error?: string }>
  deleteListingAction: (
    listingId: string,
    organizationId: string
  ) => Promise<{ success: boolean; error?: string }>
}

// ─── Status-config ────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  active:  { label: 'Aktiv',  bg: '#F0FDF4', text: '#15803D' },
  paused:  { label: 'Pausad', bg: '#FEF9C3', text: '#92400E' },
  sold:    { label: 'Såld',   bg: '#F1F5F9', text: '#0F172A' },
  draft:   { label: 'Utkast', bg: '#EFF6FF', text: '#1D4ED8' },
  deleted: { label: 'Raderad', bg: '#FEF2F2', text: '#DC2626' },
}

const STATUS_FILTER_OPTIONS = [
  { value: 'all',    label: 'Alla annonser' },
  { value: 'active', label: 'Aktiva' },
  { value: 'paused', label: 'Pausade' },
  { value: 'sold',   label: 'Sålda' },
  { value: 'draft',  label: 'Utkast' },
]

// ─── Hjälpfunktioner ─────────────────────────────────────────────────────────

function formatPrice(p: number | null): string {
  if (p == null) return '–'
  return p.toLocaleString('sv-SE') + ' kr'
}

// ─── ConfirmDialog ────────────────────────────────────────────────────────────

interface ConfirmDialogProps {
  title: string
  description: string
  confirmLabel: string
  danger?: boolean
  onConfirm: () => void
  onCancel: () => void
  isPending: boolean
}

function ConfirmDialog({
  title,
  description,
  confirmLabel,
  danger = false,
  onConfirm,
  onCancel,
  isPending,
}: ConfirmDialogProps) {
  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm" onClick={onCancel} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className="w-full max-w-xs overflow-hidden rounded-2xl shadow-xl"
          style={{ background: '#FFFFFF' }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="px-5 py-4">
            <h3 className="text-base font-semibold" style={{ color: '#0F172A' }}>
              {title}
            </h3>
            <p className="mt-1 text-sm" style={{ color: '#64748B' }}>
              {description}
            </p>
          </div>
          <div
            className="flex gap-2 border-t px-5 py-3"
            style={{ borderColor: '#F1F5F9' }}
          >
            <button
              type="button"
              onClick={onCancel}
              disabled={isPending}
              className="flex-1 rounded-lg border py-2 text-sm font-medium transition hover:bg-[#F8FAFC] disabled:opacity-50"
              style={{ borderColor: '#E2E8F0', color: '#64748B' }}
            >
              Avbryt
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={isPending}
              className="flex-1 rounded-lg py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
              style={{ background: danger ? '#EF4444' : '#2563EB' }}
            >
              {isPending ? 'Vänta…' : confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

// ─── ActionsMenu ──────────────────────────────────────────────────────────────

interface ActionsMenuProps {
  listing: BilarListing
  organizationId: string
  onUpdateStatus: (id: string, status: 'active' | 'paused' | 'sold') => void
  onDelete: (id: string) => void
  pendingId: string | null
}

function ActionsMenu({ listing, onUpdateStatus, onDelete, pendingId }: ActionsMenuProps) {
  const [open, setOpen] = useState(false)
  const [menuPos, setMenuPos] = useState<{ top: number; right: number } | null>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        buttonRef.current && !buttonRef.current.contains(e.target as Node) &&
        menuRef.current && !menuRef.current.contains(e.target as Node)
      ) {
        setOpen(false)
      }
    }
    if (open) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  const handleOpen = () => {
    if (!buttonRef.current) return
    const rect = buttonRef.current.getBoundingClientRect()
    setMenuPos({ top: rect.bottom + 4, right: window.innerWidth - rect.right })
    setOpen((v) => !v)
  }

  const isPending = pendingId === listing.id
  const isActive = listing.status === 'active'
  const isSold = listing.status === 'sold'

  return (
    <div className="relative inline-block">
      <button
        ref={buttonRef}
        type="button"
        onClick={handleOpen}
        disabled={isPending}
        className="rounded-lg p-1.5 transition hover:bg-[#F1F5F9] disabled:opacity-40"
        aria-label="Åtgärder"
      >
        <MoreHorizontal className="h-4 w-4" style={{ color: '#64748B' }} />
      </button>

      {open && menuPos && (
        <div
          ref={menuRef}
          className="min-w-[180px] overflow-hidden rounded-xl border py-1 shadow-lg"
          style={{
            position: 'fixed',
            top: menuPos.top,
            right: menuPos.right,
            zIndex: 50,
            background: '#FFFFFF',
            borderColor: '#E2E8F0',
          }}
        >
          {/* Redigera */}
          <Link
            href={`/dashboard/annonser/${listing.id}`}
            onClick={() => setOpen(false)}
            className="flex items-center gap-2.5 px-4 py-2 text-sm transition hover:bg-[#F8FAFC]"
            style={{ color: '#0F172A' }}
          >
            <Pencil className="h-3.5 w-3.5" style={{ color: '#64748B' }} />
            Redigera
          </Link>

          {/* Visa/Göm */}
          {!isSold && (
            <button
              type="button"
              onClick={() => {
                onUpdateStatus(listing.id, isActive ? 'paused' : 'active')
                setOpen(false)
              }}
              className="flex w-full items-center gap-2.5 px-4 py-2 text-left text-sm transition hover:bg-[#F8FAFC]"
              style={{ color: '#0F172A' }}
            >
              {isActive ? (
                <>
                  <EyeOff className="h-3.5 w-3.5" style={{ color: '#64748B' }} />
                  Pausa annons
                </>
              ) : (
                <>
                  <Eye className="h-3.5 w-3.5" style={{ color: '#64748B' }} />
                  Aktivera annons
                </>
              )}
            </button>
          )}

          {/* Markera såld */}
          {!isSold && (
            <button
              type="button"
              onClick={() => {
                onUpdateStatus(listing.id, 'sold')
                setOpen(false)
              }}
              className="flex w-full items-center gap-2.5 px-4 py-2 text-left text-sm transition hover:bg-[#F8FAFC]"
              style={{ color: '#0F172A' }}
            >
              <CheckCircle2 className="h-3.5 w-3.5" style={{ color: '#16A34A' }} />
              Markera såld
            </button>
          )}

          {/* Divider */}
          <div className="my-1 border-t" style={{ borderColor: '#F1F5F9' }} />

          {/* Ta bort */}
          <button
            type="button"
            onClick={() => {
              onDelete(listing.id)
              setOpen(false)
            }}
            className="flex w-full items-center gap-2.5 px-4 py-2 text-left text-sm transition hover:bg-[#FEF2F2]"
            style={{ color: '#EF4444' }}
          >
            <Trash2 className="h-3.5 w-3.5" />
            Ta bort
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Huvud-komponent ──────────────────────────────────────────────────────────

export default function BilarInventoryClient({
  listings: initialListings,
  organizationId,
  initialFilters,
  updateStatusAction,
  deleteListingAction,
}: BilarInventoryClientProps) {
  const router = useRouter()

  const [listings, setListings] = useState(initialListings)
  const [filters, setFilters] = useState(initialFilters)
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [, startTransition] = useTransition()

  // Bekräftelsedialoger
  const [confirmSold, setConfirmSold] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [confirmPending, setConfirmPending] = useState(false)

  // Felvisning
  const [actionError, setActionError] = useState<string | null>(null)

  // ── Filter-push ────────────────────────────────────────────────────────────
  const applyFilters = (next: typeof filters) => {
    const params = new URLSearchParams()
    if (next.status && next.status !== 'all') params.set('status', next.status)
    if (next.make) params.set('make', next.make)
    const qs = params.toString()
    router.push(`/dashboard/annonser${qs ? `?${qs}` : ''}`)
  }

  // ── Statusbyte (optimistic) ────────────────────────────────────────────────
  const handleUpdateStatus = (listingId: string, status: 'active' | 'paused' | 'sold') => {
    if (status === 'sold') {
      setConfirmSold(listingId)
      return
    }
    // active/paused — direkt utan bekräftelse
    setListings((prev) =>
      prev.map((l) => (l.id === listingId ? { ...l, status } : l))
    )
    setPendingId(listingId)
    startTransition(async () => {
      const result = await updateStatusAction(listingId, organizationId, status)
      if (!result.success) {
        // Rollback
        setListings(initialListings)
        setActionError(result.error ?? 'Kunde inte uppdatera status.')
      } else {
        router.refresh()
      }
      setPendingId(null)
    })
  }

  // ── Bekräfta såld ──────────────────────────────────────────────────────────
  const handleConfirmSold = () => {
    if (!confirmSold) return
    const id = confirmSold
    setConfirmPending(true)
    startTransition(async () => {
      const result = await updateStatusAction(id, organizationId, 'sold')
      setConfirmSold(null)
      setConfirmPending(false)
      if (!result.success) {
        setActionError(result.error ?? 'Kunde inte markera som såld.')
      } else {
        router.refresh()
      }
    })
  }

  // ── Ta bort ────────────────────────────────────────────────────────────────
  const handleDeleteRequest = (listingId: string) => {
    setConfirmDelete(listingId)
  }

  const handleConfirmDelete = () => {
    if (!confirmDelete) return
    const id = confirmDelete
    setConfirmPending(true)
    startTransition(async () => {
      const result = await deleteListingAction(id, organizationId)
      setConfirmDelete(null)
      setConfirmPending(false)
      if (!result.success) {
        setActionError(result.error ?? 'Kunde inte ta bort annonsen.')
      } else {
        setListings((prev) => prev.filter((l) => l.id !== id))
        router.refresh()
      }
    })
  }

  const soldListing = confirmSold ? listings.find((l) => l.id === confirmSold) : null
  const deleteListing = confirmDelete ? listings.find((l) => l.id === confirmDelete) : null
  const carLabel = (l: BilarListing) =>
    [l.make, l.model, l.year].filter(Boolean).join(' ') || l.title

  return (
    <div className="min-h-screen" style={{ background: '#F7F8FA' }}>
      <div className="mx-auto max-w-5xl px-4 py-6">

        {/* Header */}
        <div className="mb-5 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold" style={{ color: '#0F172A' }}>
              Annonser
            </h1>
            <p className="mt-0.5 text-sm" style={{ color: '#64748B' }}>
              {listings.length} annons{listings.length !== 1 ? 'er' : ''}
            </p>
          </div>
          <Link
            href="/dashboard/annonser/ny"
            className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90"
            style={{ background: '#2563EB' }}
          >
            <Plus className="h-4 w-4" />
            Lägg upp ny annons
          </Link>
        </div>

        {/* Fel */}
        {actionError && (
          <div
            className="mb-4 flex items-center gap-2 rounded-lg px-4 py-3"
            style={{ background: '#FEF2F2', color: '#EF4444' }}
          >
            <AlertCircle className="h-4 w-4 shrink-0" />
            <p className="flex-1 text-sm">{actionError}</p>
            <button type="button" onClick={() => setActionError(null)}>
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Filter */}
        <div
          className="mb-4 flex flex-wrap items-end gap-3 rounded-xl border p-4"
          style={{ background: '#FFFFFF', borderColor: '#E2E8F0' }}
        >
          {/* Status */}
          <div className="flex flex-col gap-1">
            <label
              className="text-[11px] font-medium uppercase tracking-wide"
              style={{ color: '#94A3B8' }}
            >
              Status
            </label>
            <select
              value={filters.status}
              onChange={(e) => {
                const next = { ...filters, status: e.target.value }
                setFilters(next)
                applyFilters(next)
              }}
              className="rounded-lg border px-3 py-1.5 text-sm focus:outline-none"
              style={{ borderColor: '#E2E8F0', color: '#0F172A', background: '#F8FAFC' }}
            >
              {STATUS_FILTER_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>

          {/* Märke */}
          <div className="flex flex-col gap-1">
            <label
              className="text-[11px] font-medium uppercase tracking-wide"
              style={{ color: '#94A3B8' }}
            >
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
              className="rounded-lg border px-3 py-1.5 text-sm focus:outline-none"
              style={{ borderColor: '#E2E8F0', color: '#0F172A', background: '#F8FAFC', width: 140 }}
            />
          </div>

          {(filters.status !== 'all' || filters.make) && (
            <button
              type="button"
              onClick={() => {
                const cleared = { status: 'all', make: '' }
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
          {listings.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
              <Car className="mb-3 h-10 w-10" style={{ color: '#BFDBFE' }} />
              <p className="font-semibold" style={{ color: '#0F172A' }}>
                Inga annonser ännu
              </p>
              <p className="mt-1 text-sm" style={{ color: '#64748B' }}>
                Lägg upp din första annons för att komma igång.
              </p>
              <Link
                href="/dashboard/annonser/ny"
                className="mt-4 inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white"
                style={{ background: '#2563EB' }}
              >
                <Plus className="h-4 w-4" />
                Lägg upp annons
              </Link>
            </div>
          ) : (
            <>
              {/* Tabellhuvud */}
              <div
                className="hidden grid-cols-[56px_1fr_120px_100px_72px_72px_40px] items-center gap-4 border-b px-4 py-2 text-[11px] font-medium uppercase tracking-wide md:grid"
                style={{ borderColor: '#F1F5F9', color: '#94A3B8' }}
              >
                <span />
                <span>Bil</span>
                <span className="text-right">Pris</span>
                <span className="text-center">Status</span>
                <span className="text-right">Visningar</span>
                <span className="text-right">Leads</span>
                <span />
              </div>

              <div className="divide-y" style={{ borderColor: '#F1F5F9' }}>
                {listings.map((listing) => {
                  const cfg = STATUS_CONFIG[listing.status] ?? STATUS_CONFIG.active
                  const isPending = pendingId === listing.id

                  return (
                    <div
                      key={listing.id}
                      className="grid grid-cols-[56px_1fr_auto] items-center gap-4 px-4 py-3 md:grid-cols-[56px_1fr_120px_100px_72px_72px_40px]"
                      style={{ opacity: isPending ? 0.6 : 1 }}
                    >
                      {/* Thumbnail */}
                      <div
                        className="relative h-10 w-14 shrink-0 overflow-hidden rounded-lg"
                        style={{ background: '#EFF6FF' }}
                      >
                        {listing.thumbnail ? (
                          <Image
                            src={listing.thumbnail}
                            alt={carLabel(listing)}
                            fill
                            className="object-cover"
                            sizes="56px"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center">
                            <Car className="h-5 w-5" style={{ color: '#BFDBFE' }} />
                          </div>
                        )}
                      </div>

                      {/* Bil */}
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium" style={{ color: '#0F172A' }}>
                          {carLabel(listing)}
                        </p>
                        <p className="truncate text-xs" style={{ color: '#94A3B8' }}>
                          {listing.title}
                        </p>
                      </div>

                      {/* Pris — desktop */}
                      <p
                        className="hidden text-right font-semibold tabular-nums md:block"
                        style={{ color: '#2563EB', fontSize: 13 }}
                      >
                        {formatPrice(listing.price)}
                      </p>

                      {/* Status — desktop */}
                      <div className="hidden md:flex md:items-center md:justify-center">
                        <span
                          className="rounded-full px-2.5 py-1 text-xs font-semibold whitespace-nowrap"
                          style={{ background: cfg.bg, color: cfg.text }}
                        >
                          {cfg.label}
                        </span>
                      </div>

                      {/* Visningar — desktop */}
                      <p
                        className="hidden text-right tabular-nums md:block"
                        style={{ color: '#64748B', fontSize: 13 }}
                      >
                        {listing.views_count}
                      </p>

                      {/* Leads — desktop */}
                      <p
                        className="hidden text-right font-medium tabular-nums md:block"
                        style={{ color: listing.leads_count > 0 ? '#2563EB' : '#94A3B8', fontSize: 13 }}
                      >
                        {listing.leads_count}
                      </p>

                      {/* Åtgärder */}
                      <div className="flex justify-end">
                        <ActionsMenu
                          listing={listing}
                          organizationId={organizationId}
                          onUpdateStatus={handleUpdateStatus}
                          onDelete={handleDeleteRequest}
                          pendingId={pendingId}
                        />
                      </div>

                      {/* Mobil: andra rad */}
                      <div className="col-span-3 flex flex-wrap items-center gap-2 md:hidden">
                        <span
                          className="rounded-full px-2 py-0.5 text-[11px] font-semibold"
                          style={{ background: cfg.bg, color: cfg.text }}
                        >
                          {cfg.label}
                        </span>
                        <span className="text-xs" style={{ color: '#64748B' }}>
                          {formatPrice(listing.price)}
                        </span>
                        <span className="text-xs" style={{ color: '#94A3B8' }}>
                          {listing.views_count} visn. · {listing.leads_count} leads
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Bekräftelse — markera såld */}
      {confirmSold && soldListing && (
        <ConfirmDialog
          title="Markera som såld?"
          description={`${carLabel(soldListing)} markeras som såld och döljs från aktiva annonser.`}
          confirmLabel="Markera såld"
          onConfirm={handleConfirmSold}
          onCancel={() => setConfirmSold(null)}
          isPending={confirmPending}
        />
      )}

      {/* Bekräftelse — ta bort */}
      {confirmDelete && deleteListing && (
        <ConfirmDialog
          title="Ta bort annons?"
          description={`${carLabel(deleteListing)} tas bort permanent och kan inte återställas.`}
          confirmLabel="Ta bort"
          danger
          onConfirm={handleConfirmDelete}
          onCancel={() => setConfirmDelete(null)}
          isPending={confirmPending}
        />
      )}
    </div>
  )
}
