'use client'

import { useEffect, useRef, useState, useTransition, useCallback } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Car,
  UserCircle2,
  MessageCircle,
  ShieldAlert,
  Send,
  Users,
} from 'lucide-react'
import { createClient } from '../../../../lib/supabase/client'
import type {
  BilarLeadDetail,
  LeadMessage,
  LeadStatus,
  OrgMember,
} from '../../../../lib/features/bilar-leads-service'
import BilarCommanderModal from './BilarCommanderModal'

// ─── Props ────────────────────────────────────────────────────────────────────

interface BilarLeadDetailClientProps {
  lead: BilarLeadDetail
  currentUserId: string
  organizationId: string
  nowIso: string
  orgMembers: OrgMember[]
  isOwner: boolean
  reassignAction: (
    leadId: string,
    organizationId: string,
    newAssigneeProfileId: string
  ) => Promise<{ success: boolean; error?: string }>
  sendMessageAction: (
    leadId: string,
    organizationId: string,
    content: string,
    authorProfileId: string
  ) => Promise<{ success: boolean; error?: string; messageId?: string; createdAt?: string }>
  updateStatusAction: (
    leadId: string,
    status: LeadStatus,
    organizationId: string
  ) => Promise<{ success: boolean; error?: string }>
  saveNoteAction: (
    leadId: string,
    organizationId: string,
    note: string
  ) => Promise<{ success: boolean; error?: string }>
}

// ─── Status-config ────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<LeadStatus, { label: string; dot: string; bg: string; text: string }> =
  {
    new:       { label: 'Ny',           dot: '#2563EB', bg: '#EFF6FF', text: '#1D4ED8' },
    contacted: { label: 'Kontaktad',    dot: '#16A34A', bg: '#F0FDF4', text: '#15803D' },
    qualified: { label: 'Kvalificerad', dot: '#D97706', bg: '#FEF9C3', text: '#92400E' },
    sold:      { label: 'Såld',         dot: '#0F172A', bg: '#F1F5F9', text: '#0F172A' },
    archived:  { label: 'Arkiverad',    dot: '#94A3B8', bg: '#F8FAFC', text: '#64748B' },
  }

const STATUS_ORDER: LeadStatus[] = ['new', 'contacted', 'qualified', 'sold', 'archived']

// ─── Hjälpfunktioner ─────────────────────────────────────────────────────────

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString('sv-SE', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return ''
  }
}

function formatPrice(p: number): string {
  return p.toLocaleString('sv-SE') + ' kr'
}

function slaLabel(lead: BilarLeadDetail, now: Date): { text: string; color: string; icon: React.ReactNode } {
  if (lead.sla_missed) {
    return {
      text: 'Missad SLA',
      color: '#EF4444',
      icon: <AlertTriangle className="h-3.5 w-3.5" />,
    }
  }
  if (lead.first_response_at) {
    return {
      text: 'Inom SLA',
      color: '#16A34A',
      icon: <CheckCircle2 className="h-3.5 w-3.5" />,
    }
  }
  if (lead.status === 'new') {
    const minsLeft = Math.max(
      0,
      Math.ceil((new Date(lead.sla_deadline).getTime() - now.getTime()) / 60_000)
    )
    return {
      text: minsLeft > 0 ? `${minsLeft} min kvar` : 'SLA löper ut nu',
      color: lead.sla_warning ? '#D97706' : '#64748B',
      icon: <Clock className="h-3.5 w-3.5" />,
    }
  }
  return { text: '–', color: '#94A3B8', icon: null }
}

// ─── StatusDropdown ───────────────────────────────────────────────────────────

interface StatusDropdownProps {
  leadId: string
  organizationId: string
  current: LeadStatus
  disabled: boolean
  onChange: (status: LeadStatus) => void
}

function StatusDropdown({ leadId: _leadId, current, disabled, onChange }: StatusDropdownProps) {
  const [open, setOpen] = useState(false)
  const cfg = STATUS_CONFIG[current]

  return (
    <div className="relative inline-block">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold transition hover:opacity-80 disabled:opacity-50"
        style={{ background: cfg.bg, color: cfg.text }}
      >
        <span className="h-2 w-2 rounded-full" style={{ background: cfg.dot }} />
        {cfg.label}
        <span className="ml-0.5 text-xs opacity-60">▾</span>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div
            className="absolute left-0 top-full z-20 mt-1 min-w-[160px] rounded-lg border py-1 shadow-lg"
            style={{ background: '#FFFFFF', borderColor: '#E2E8F0' }}
          >
            {STATUS_ORDER.map((s) => {
              const c = STATUS_CONFIG[s]
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => { onChange(s); setOpen(false) }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition hover:bg-[#F8FAFC]"
                  style={{ color: '#0F172A' }}
                >
                  <span className="h-2 w-2 rounded-full" style={{ background: c.dot }} />
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

// ─── LeadChat ─────────────────────────────────────────────────────────────────

interface LeadChatProps {
  leadId: string
  organizationId: string
  currentUserId: string
  initialMessages: LeadMessage[]
  sendMessageAction: BilarLeadDetailClientProps['sendMessageAction']
}

function LeadChat({
  leadId,
  organizationId,
  currentUserId,
  initialMessages,
  sendMessageAction,
}: LeadChatProps) {
  const [messages, setMessages] = useState<LeadMessage[]>(initialMessages)
  const [content, setContent] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const listRef = useRef<HTMLDivElement | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)

  // Auto-scroll till botten
  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight
    }
  }, [messages.length])

  // Supabase Realtime — lyssna på nya lead_messages för detta lead
  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel(`lead:${leadId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'lead_messages',
          filter: `lead_id=eq.${leadId}`,
        },
        (payload) => {
          const newMsg = payload.new as LeadMessage
          // Undvik dubbletter (optimistic insert har temp-id)
          setMessages((prev) => {
            const hasTempForContent = prev.some(
              (m) => m.id.startsWith('temp-') && m.content === newMsg.content
            )
            if (hasTempForContent) {
              // Ersätt temp-raden med den verkliga
              return prev.map((m) =>
                m.id.startsWith('temp-') && m.content === newMsg.content ? newMsg : m
              )
            }
            if (prev.some((m) => m.id === newMsg.id)) return prev
            return [...prev, newMsg]
          })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [leadId])

  const handleSend = async () => {
    const trimmed = content.trim()
    if (!trimmed || isSending) return

    setIsSending(true)
    setError(null)

    // Optimistic insert
    const optimistic: LeadMessage = {
      id: `temp-${Date.now()}`,
      lead_id: leadId,
      organization_id: organizationId,
      author_profile_id: currentUserId,
      role: 'seller',
      content: trimmed,
      created_at: new Date().toISOString(),
    }
    setMessages((prev) => [...prev, optimistic])
    setContent('')

    try {
      const result = await sendMessageAction(leadId, organizationId, trimmed, currentUserId)
      if (!result.success) {
        // Rollback optimistic
        setMessages((prev) => prev.filter((m) => m.id !== optimistic.id))
        setContent(trimmed)
        setError(result.error ?? 'Kunde inte skicka meddelandet.')
      }
    } catch {
      setMessages((prev) => prev.filter((m) => m.id !== optimistic.id))
      setContent(trimmed)
      setError('Kunde inte skicka meddelandet.')
    } finally {
      setIsSending(false)
      textareaRef.current?.focus()
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const getMsgStyle = (role: LeadMessage['role']): React.CSSProperties => {
    if (role === 'system') return {}
    if (role === 'owner') return { background: '#1D4ED8', color: '#FFFFFF' }
    return { background: '#2563EB', color: '#FFFFFF' }
  }

  const getMsgWrapperClass = (role: LeadMessage['role']): string => {
    if (role === 'system') return 'flex justify-center'
    return 'flex justify-end'
  }

  return (
    <section
      className="flex flex-col rounded-xl border"
      style={{ background: '#FFFFFF', borderColor: '#E2E8F0', minHeight: 420 }}
    >
      {/* Header */}
      <div
        className="flex items-center gap-2 border-b px-4 py-3"
        style={{ borderColor: '#F1F5F9' }}
      >
        <MessageCircle className="h-4 w-4" style={{ color: '#2563EB' }} />
        <h2 className="text-sm font-semibold" style={{ color: '#0F172A' }}>
          Intern lead-konversation
        </h2>
        <span
          className="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
          style={{ background: '#F1F5F9', color: '#64748B' }}
        >
          Internt
        </span>
        <p className="ml-auto text-[11px]" style={{ color: '#94A3B8' }}>
          Kunden ser inte detta
        </p>
      </div>

      {/* Meddelandelista */}
      <div
        ref={listRef}
        className="flex-1 space-y-3 overflow-y-auto p-4"
        style={{ maxHeight: 400, background: '#F8FAFC' }}
      >
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center py-10 text-center">
            <MessageCircle className="mb-2 h-8 w-8" style={{ color: '#BFDBFE' }} />
            <p className="text-sm font-medium" style={{ color: '#64748B' }}>
              Inget internt samtal ännu
            </p>
            <p className="mt-0.5 text-xs" style={{ color: '#94A3B8' }}>
              Skriv det första meddelandet nedan
            </p>
          </div>
        ) : (
          messages.map((msg) => (
            <div key={msg.id} className={getMsgWrapperClass(msg.role)}>
              {msg.role === 'system' ? (
                <div className="flex items-center gap-1.5 rounded-full border border-dashed px-3 py-1"
                  style={{ borderColor: '#E2E8F0' }}>
                  <ShieldAlert className="h-3 w-3" style={{ color: '#D97706' }} />
                  <p className="text-[11px] italic" style={{ color: '#64748B' }}>
                    {msg.content}
                  </p>
                  <span className="text-[10px]" style={{ color: '#94A3B8' }}>
                    {formatTime(msg.created_at)}
                  </span>
                </div>
              ) : (
                <div className="max-w-[75%]">
                  <div
                    className="rounded-2xl rounded-tr-sm px-3 py-2 text-sm"
                    style={getMsgStyle(msg.role)}
                  >
                    <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                  </div>
                  <p
                    className="mt-0.5 text-right text-[10px]"
                    style={{ color: '#94A3B8' }}
                  >
                    {msg.role === 'owner' ? 'Ägare' : 'Säljare'} · {formatTime(msg.created_at)}
                  </p>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Input */}
      <div className="border-t p-3" style={{ borderColor: '#F1F5F9' }}>
        {error && (
          <p className="mb-2 text-xs" style={{ color: '#EF4444' }}>
            {error}
          </p>
        )}
        <div className="flex items-end gap-2">
          <textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={2}
            maxLength={4000}
            placeholder="Skriv en intern uppdatering… (Enter skickar)"
            disabled={isSending}
            className="flex-1 resize-none rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2"
            style={{
              borderColor: '#E2E8F0',
              color: '#0F172A',
              background: '#F8FAFC',
            }}
          />
          <button
            type="button"
            onClick={handleSend}
            disabled={isSending || !content.trim()}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg transition disabled:opacity-40"
            style={{ background: '#2563EB', color: '#FFFFFF' }}
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
        <p className="mt-1 text-[10px]" style={{ color: '#94A3B8' }}>
          Shift+Enter för ny rad · Max 4000 tecken · Sparas internt i LeadOS
        </p>
      </div>
    </section>
  )
}

// ─── InternalNote ─────────────────────────────────────────────────────────────

interface InternalNoteProps {
  leadId: string
  organizationId: string
  initialNote: string | null
  saveNoteAction: BilarLeadDetailClientProps['saveNoteAction']
}

function InternalNote({ leadId, organizationId, initialNote, saveNoteAction }: InternalNoteProps) {
  const [note, setNote] = useState(initialNote ?? '')
  const [savedAt, setSavedAt] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const save = useCallback(
    async (value: string) => {
      setIsSaving(true)
      await saveNoteAction(leadId, organizationId, value)
      setIsSaving(false)
      setSavedAt(
        new Date().toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' })
      )
    },
    [leadId, organizationId, saveNoteAction]
  )

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value
    setNote(value)
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => save(value), 1000)
  }

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  return (
    <div>
      <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide" style={{ color: '#94A3B8' }}>
        Intern anteckning
      </label>
      <textarea
        value={note}
        onChange={handleChange}
        rows={4}
        maxLength={2000}
        placeholder="Privata anteckningar om detta lead — syns bara för ditt team"
        className="w-full resize-none rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2"
        style={{ borderColor: '#E2E8F0', color: '#0F172A', background: '#F8FAFC' }}
      />
      <p className="mt-1 text-[11px]" style={{ color: '#94A3B8' }}>
        {isSaving
          ? 'Sparar…'
          : savedAt
            ? `Sparad ${savedAt}`
            : 'Autosparas efter 1 sek'}
      </p>
    </div>
  )
}

// ─── Huvud-komponent ──────────────────────────────────────────────────────────

export default function BilarLeadDetailClient({
  lead: initialLead,
  currentUserId,
  organizationId,
  nowIso,
  orgMembers,
  isOwner,
  reassignAction,
  sendMessageAction,
  updateStatusAction,
  saveNoteAction,
}: BilarLeadDetailClientProps) {
  const router = useRouter()
  const now = new Date(nowIso)

  const [status, setStatus] = useState<LeadStatus>(initialLead.status)
  const [updatingStatus, setUpdatingStatus] = useState(false)
  const [commanderOpen, setCommanderOpen] = useState(false)
  const [, startTransition] = useTransition()

  const handleStatusChange = (newStatus: LeadStatus) => {
    const prev = status
    setStatus(newStatus)
    setUpdatingStatus(true)
    startTransition(async () => {
      const result = await updateStatusAction(initialLead.id, newStatus, organizationId)
      if (!result.success) setStatus(prev)
      else router.refresh()
      setUpdatingStatus(false)
    })
  }

  const { text: slaText, color: slaColor, icon: slaIcon } = slaLabel(
    { ...initialLead, status, sla_missed: initialLead.sla_missed },
    now
  )

  const carLabel = [initialLead.listing_make, initialLead.listing_model]
    .filter(Boolean)
    .join(' ')

  return (
    <div className="min-h-screen" style={{ background: '#F7F8FA' }}>
      <div className="mx-auto max-w-5xl px-4 py-6">

        {/* Tillbaka */}
        <Link
          href="/dashboard/leads"
          className="mb-5 inline-flex items-center gap-1.5 text-sm font-medium transition hover:opacity-70"
          style={{ color: '#2563EB' }}
        >
          <ArrowLeft className="h-4 w-4" />
          Alla leads
        </Link>

        {/* Tvåkolumns-layout */}
        <div className="grid gap-5 lg:grid-cols-[340px_1fr]">

          {/* ── Vänster kolumn ── */}
          <div className="flex flex-col gap-4">

            {/* Bilkort */}
            <div
              className="overflow-hidden rounded-xl border"
              style={{ background: '#FFFFFF', borderColor: '#E2E8F0' }}
            >
              {initialLead.listing_image ? (
                <div className="relative h-36 w-full">
                  <Image
                    src={initialLead.listing_image}
                    alt={carLabel || 'Bil'}
                    fill
                    className="object-cover"
                    sizes="340px"
                  />
                </div>
              ) : (
                <div
                  className="flex h-36 items-center justify-center"
                  style={{ background: '#EFF6FF' }}
                >
                  <Car className="h-10 w-10" style={{ color: '#BFDBFE' }} />
                </div>
              )}
              <div className="p-4">
                <p className="font-semibold" style={{ color: '#0F172A' }}>
                  {carLabel || initialLead.listing_title}
                </p>
                {initialLead.listing_year && (
                  <p className="text-sm" style={{ color: '#64748B' }}>
                    {initialLead.listing_year}
                  </p>
                )}
                {initialLead.listing_price && (
                  <p className="mt-1 text-sm font-semibold" style={{ color: '#2563EB' }}>
                    {formatPrice(initialLead.listing_price)}
                  </p>
                )}
                {initialLead.listing_id && (
                  <Link
                    href={`/bil/${initialLead.listing_id}`}
                    className="mt-2 inline-block text-xs transition hover:underline"
                    style={{ color: '#2563EB' }}
                  >
                    Visa annons →
                  </Link>
                )}
              </div>
            </div>

            {/* Köparinfo */}
            <div
              className="rounded-xl border p-4"
              style={{ background: '#FFFFFF', borderColor: '#E2E8F0' }}
            >
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide" style={{ color: '#94A3B8' }}>
                Köpare
              </p>
              <div className="flex items-center gap-3">
                <div
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
                  style={{ background: '#EFF6FF' }}
                >
                  <UserCircle2 className="h-5 w-5" style={{ color: '#2563EB' }} />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold" style={{ color: '#0F172A' }}>
                    {initialLead.buyer_name}
                  </p>
                  {initialLead.buyer_email && (
                    <p className="truncate text-xs" style={{ color: '#64748B' }}>
                      {initialLead.buyer_email}
                    </p>
                  )}
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {/* Källbadge */}
                <span
                  className="rounded-full px-2 py-0.5 text-[11px] font-semibold"
                  style={
                    initialLead.source_site === 'bilar'
                      ? { background: '#F0FDF4', color: '#15803D' }
                      : { background: '#EFF6FF', color: '#1D4ED8' }
                  }
                >
                  {initialLead.source_site === 'bilar' ? 'Bilar' : 'Main'}
                </span>
                {initialLead.is_guest && (
                  <span
                    className="rounded-full px-2 py-0.5 text-[11px] font-semibold"
                    style={{ background: '#F1F5F9', color: '#64748B' }}
                  >
                    Gäst
                  </span>
                )}
              </div>
              <p className="mt-2 text-[11px]" style={{ color: '#94A3B8' }}>
                Inkommen {formatTime(initialLead.created_at)}
              </p>
            </div>

            {/* Status */}
            <div
              className="rounded-xl border p-4"
              style={{ background: '#FFFFFF', borderColor: '#E2E8F0' }}
            >
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide" style={{ color: '#94A3B8' }}>
                Status
              </p>
              <StatusDropdown
                leadId={initialLead.id}
                organizationId={organizationId}
                current={status}
                disabled={updatingStatus}
                onChange={handleStatusChange}
              />

              {/* SLA */}
              <div
                className="mt-3 flex items-center gap-1.5 text-xs font-medium"
                style={{ color: slaColor }}
              >
                {slaIcon}
                {slaText}
              </div>

              {/* Omfördela-knapp — synlig för org-ägare */}
              {isOwner && (
                <button
                  type="button"
                  onClick={() => setCommanderOpen(true)}
                  className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg border py-2 text-sm font-medium transition hover:bg-[#F8FAFC]"
                  style={{ borderColor: '#E2E8F0', color: '#2563EB' }}
                >
                  <Users className="h-4 w-4" />
                  Omfördela lead
                </button>
              )}
            </div>

            {/* Intern anteckning */}
            <div
              className="rounded-xl border p-4"
              style={{ background: '#FFFFFF', borderColor: '#E2E8F0' }}
            >
              <InternalNote
                leadId={initialLead.id}
                organizationId={organizationId}
                initialNote={initialLead.internal_note}
                saveNoteAction={saveNoteAction}
              />
            </div>
          </div>

          {/* ── Höger kolumn — LeadChat ── */}
          <LeadChat
            leadId={initialLead.id}
            organizationId={organizationId}
            currentUserId={currentUserId}
            initialMessages={initialLead.messages}
            sendMessageAction={sendMessageAction}
          />
        </div>
      </div>

      {/* Commander Modal */}
      {commanderOpen && (
        <BilarCommanderModal
          leadId={initialLead.id}
          organizationId={organizationId}
          currentAssignedTo={initialLead.assigned_to}
          currentUserId={currentUserId}
          orgMembers={orgMembers}
          onClose={() => setCommanderOpen(false)}
          reassignAction={reassignAction}
        />
      )}
    </div>
  )
}
