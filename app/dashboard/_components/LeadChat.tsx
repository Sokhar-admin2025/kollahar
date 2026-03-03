'use client'

/**
 * LeadChat – intern LeadOS-konversation per lead (lead_messages).
 * Endast för interna vyer i Seller Mode. Får aldrig användas i kundflöden eller publika routes.
 */

import { useEffect, useRef, useState } from 'react'
import { MessageCircle, ShieldAlert, UserCircle2 } from 'lucide-react'
import type { LeadMessage } from '@/lib/features/leados/leados-lead-messages-service'
import { addLeadMessageAction } from '@/app/actions/lead-message-actions'

interface LeadChatProps {
  leadId: string
  initialMessages: LeadMessage[]
  leadTitle: string
  listingSubtitle?: string | null
}

export default function LeadChat({
  leadId,
  initialMessages,
  leadTitle,
  listingSubtitle,
}: LeadChatProps) {
  const [messages, setMessages] = useState<LeadMessage[]>(initialMessages)
  const [content, setContent] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const listRef = useRef<HTMLDivElement | null>(null)

  // Scrollar till botten när nya meddelanden läggs till (enkel variant).
  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight
    }
  }, [messages.length])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = content.trim()
    if (!trimmed) {
      setError('Meddelandet kan inte vara tomt.')
      return
    }
    if (trimmed.length > 4000) {
      setError('Meddelandet är för långt.')
      return
    }

    setIsSending(true)
    setError(null)
    try {
      const result = await addLeadMessageAction(leadId, 'seller', trimmed)
      if (!result.success) {
        setError(result.error ?? 'Kunde inte spara meddelande.')
        return
      }

      const optimisticMessage: LeadMessage = {
        id: `temp-${Date.now()}`,
        created_at: new Date().toISOString(),
        lead_id: leadId,
        organization_id: '',
        author_profile_id: '',
        role: 'seller',
        content: trimmed,
      }

      setMessages((prev) => [...prev, optimisticMessage])
      setContent('')
    } catch (err) {
      console.error('[LeadChat] addLeadMessageAction failed', err)
      setError('Kunde inte spara meddelande.')
    } finally {
      setIsSending(false)
    }
  }

  const formatTime = (iso: string) => {
    try {
      return new Date(iso).toLocaleString('sv-SE', {
        hour: '2-digit',
        minute: '2-digit',
        day: '2-digit',
        month: '2-digit',
      })
    } catch {
      return ''
    }
  }

  const getRoleLabel = (role: LeadMessage['role']) => {
    switch (role) {
      case 'seller':
        return 'Säljare'
      case 'owner':
        return 'Ägare'
      case 'system':
        return 'System'
      default:
        return role
    }
  }

  const getMessageClasses = (role: LeadMessage['role']) => {
    if (role === 'system') {
      return 'rounded-lg border border-dashed border-gray-200 bg-gray-50 px-3 py-2 text-xs text-brand-text/70 dark:border-gray-700 dark:bg-gray-900/50 dark:text-gray-300'
    }
    if (role === 'owner') {
      return 'rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-sm text-brand-text dark:border-indigo-900/50 dark:bg-indigo-900/20 dark:text-gray-100'
    }
    return 'rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-brand-text dark:border-gray-700 dark:bg-gray-900/80 dark:text-gray-100'
  }

  const getIcon = (role: LeadMessage['role']) => {
    if (role === 'system') {
      return <ShieldAlert className="h-3.5 w-3.5 text-amber-500" />
    }
    return <UserCircle2 className="h-4 w-4 text-brand-green" />
  }

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="flex items-center gap-1.5 text-sm font-semibold text-brand-text dark:text-white">
              <MessageCircle className="h-4 w-4 text-brand-green" />
              Intern lead-konversation
            </h2>
            <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-gray-600 dark:bg-gray-800 dark:text-gray-300">
              Internt
            </span>
          </div>
          <p className="mt-1 text-xs text-brand-text/70 dark:text-gray-400">
            Endast synlig för ditt team. Kunden ser inte detta.
          </p>
        </div>
        <div className="mt-1 text-right text-xs text-brand-text/70 dark:text-gray-300">
          <p className="font-semibold text-brand-text dark:text-gray-100">{leadTitle}</p>
          {listingSubtitle && (
            <p className="mt-0.5 truncate text-[11px] text-brand-text/60 dark:text-gray-400">
              {listingSubtitle}
            </p>
          )}
        </div>
      </div>

      <div
        ref={listRef}
        className="mt-3 max-h-72 space-y-3 overflow-y-auto rounded-lg bg-gray-50 p-3 dark:bg-gray-900/40"
      >
        {messages.length === 0 ? (
          <p className="text-xs text-brand-text/60 dark:text-gray-400">
            Inga interna meddelanden ännu. Använd fältet nedan för att lägga till en första
            uppdatering.
          </p>
        ) : (
          <ul className="space-y-2" role="list">
            {messages.map((msg) => (
              <li key={msg.id} className="flex items-start gap-2 text-xs text-brand-text/80">
                <div className="mt-0.5 shrink-0">{getIcon(msg.role)}</div>
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex items-center gap-2 text-[11px] text-brand-text/60 dark:text-gray-400">
                    <span className="font-semibold">{getRoleLabel(msg.role)}</span>
                    <span>•</span>
                    <span>{formatTime(msg.created_at)}</span>
                  </div>
                  <div className={getMessageClasses(msg.role)}>
                    <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <form onSubmit={handleSubmit} className="mt-4 space-y-2">
        <label className="block text-xs font-medium text-brand-text/70 dark:text-gray-300">
          Lägg till intern uppdatering
        </label>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={3}
          maxLength={4000}
          className="w-full rounded-lg border border-gray-300 bg-white p-2.5 text-sm text-brand-text shadow-sm focus:border-brand-green focus:outline-none focus:ring-2 focus:ring-brand-green/20 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
          placeholder="Skriv en intern uppdatering…"
          disabled={isSending}
        />
        {error && <p className="text-xs text-red-600">{error}</p>}
        <div className="flex items-center justify-between gap-3">
          <p className="text-[11px] text-brand-text/50 dark:text-gray-500">
            Max 4000 tecken. Sparas endast internt i LeadOS.
          </p>
          <button
            type="submit"
            disabled={isSending}
            className="inline-flex items-center justify-center rounded-lg bg-brand-green px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-brand-green/90 disabled:opacity-60"
          >
            {isSending ? 'Sparar…' : 'Spara meddelande'}
          </button>
        </div>
      </form>
    </section>
  )
}

