'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

import { DASHBOARD_TEXTS } from '@/app/lib/content'
import type { Conversation, Message } from '@/app/types'
import Button from '@/app/components/atoms/Button'
import { sendMessageAction, markAsReadAction, getMessagesAction } from '@/app/actions/message-actions'
import { createClient } from '@/lib/supabase/client'
import { X } from 'lucide-react'

const t = DASHBOARD_TEXTS.messages

/** Konversationen är kopplad till en annons som är såld eller borttagen – chatten ska vara read-only. */
function isListingClosed(conv: Conversation | null): boolean {
  if (!conv) return false
  if (conv.listing_id && !conv.listing) return true
  const l = conv.listing
  return !!(l && (l.status === 'sold' || l.status === 'deleted' || l.deleted_at))
}

export interface InboxClientProps {
  initialConversations: Conversation[]
  userId: string
}

export default function InboxClient({
  initialConversations,
  userId,
}: InboxClientProps) {
  const [conversations, setConversations] = useState<Conversation[]>(initialConversations)
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [sending, setSending] = useState(false)
  const [newMessage, setNewMessage] = useState('')
  const [showInboxMobile, setShowInboxMobile] = useState(true)

  // När användaren väljer en konversation: hämta meddelanden + markera som lästa
  useEffect(() => {
    if (!selectedConversation) return

    setMessages([])
    const load = async () => {
      setLoadingMessages(true)
      try {
        const result = await getMessagesAction(selectedConversation.id)
        if (result.success && result.data) {
          setMessages(result.data)
        }
        await markAsReadAction(selectedConversation.id)
        setConversations((prev) =>
          prev.map((conv) =>
            conv.id === selectedConversation.id ? { ...conv, hasUnread: false } : conv
          )
        )
      } catch (err) {
        console.error('Kunde inte hämta meddelanden:', err)
      } finally {
        setLoadingMessages(false)
      }
    }

    load()
  }, [selectedConversation?.id])

  // Realtime: lyssna på nya meddelanden i vald konversation
  useEffect(() => {
    if (!selectedConversation?.id) return

    const supabase = createClient()
    const channelName = `messages:${selectedConversation.id}`

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${selectedConversation.id}`,
        },
        (payload) => {
          const row = payload.new as Record<string, unknown>
          const id = row?.id as string | undefined
          if (!id) return
          setMessages((prev) => {
            if (prev.some((m) => m.id === id)) return prev
            const msg: Message = {
              id,
              conversation_id: (row.conversation_id as string) ?? selectedConversation.id,
              sender_id: (row.sender_id as string) ?? '',
              content: (row.content as string) ?? '',
              is_read: (row.is_read as boolean) ?? false,
              created_at: (row.created_at as string) ?? new Date().toISOString(),
            }
            return [...prev, msg]
          })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [selectedConversation?.id])

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim() || !selectedConversation) return
    if (isListingClosed(selectedConversation)) return

    setSending(true)
    const contentToSend = newMessage.trim()
    setNewMessage('')
    try {
      const result = await sendMessageAction(selectedConversation.id, contentToSend)
      if (!result.success) {
        setNewMessage(contentToSend)
        alert(result.error ?? 'Kunde inte skicka meddelande')
      }
    } catch {
      setNewMessage(contentToSend)
      alert('Kunde inte skicka meddelande')
    } finally {
      setSending(false)
    }
  }

  const handleSelectConversation = (conv: Conversation) => {
    setSelectedConversation(conv)
    setShowInboxMobile(false)
  }

  const handleBackToInboxMobile = () => {
    setShowInboxMobile(true)
  }

  return (
    <div className="h-full min-h-0 flex flex-col overflow-hidden bg-brand-beige">
      {/* Fyll tillgängligt utrymme (layout har Footer under) – flex-1 så Chrome inte trycker ner skrivfältet */}
      <div className="flex-1 min-h-0 flex flex-col overflow-hidden max-w-6xl mx-auto w-full">
        <div className="flex-shrink-0 px-4 md:px-6 pt-6">
          <h1 className="text-2xl font-display text-brand-green mb-4">{t.pageTitle}</h1>
        </div>
        <div className="flex-shrink-0 px-4 md:px-6">
          <Link
            href="/dashboard"
            className="text-sm text-brand-text hover:text-brand-green antialiased"
          >
            ← Tillbaka till Dashboard
          </Link>
        </div>
        <div className="flex-1 min-h-0 overflow-hidden px-4 md:px-6 pt-2 pb-4">
          <div className="relative h-full min-h-0 overflow-hidden md:grid md:grid-cols-3 md:gap-6">
          {/* --- VÄNSTER: LISTA (Inkorg) --- */}
          <div
            className={`
              absolute inset-0 w-full h-full md:static
              transition-transform duration-300 ease-in-out
              ${showInboxMobile ? 'translate-x-0' : '-translate-x-full'}
              md:translate-x-0
            `}
          >
            <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden flex flex-col h-full">
              <div className="p-4 border-b bg-brand-beige font-medium text-brand-text">
                {t.navLabel}
              </div>

              <div className="overflow-y-auto flex-1">
                {conversations.length === 0 ? (
                  <div className="p-8 text-center text-brand-text antialiased">
                    <p>{t.inbox.empty}</p>
                  </div>
                ) : (
                  <ul>
                    {conversations.map((conv) => (
                      <li
                        key={conv.id}
                        onClick={() => handleSelectConversation(conv)}
                        className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-brand-green/10 transition ${
                          selectedConversation?.id === conv.id
                            ? 'bg-brand-green/10 border-l-4 border-l-brand-green'
                            : ''
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 bg-gray-200 rounded overflow-hidden flex-shrink-0">
                            {conv.listing?.images?.[0] && (
                              <img
                                src={conv.listing.images[0]}
                                alt=""
                                className="w-full h-full object-cover"
                              />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-bold text-sm text-brand-text truncate antialiased">
                              {conv.listing?.title || 'Okänd annons'}
                            </h4>
                            <p className="text-xs text-brand-text flex items-center gap-2 antialiased">
                              {new Date(conv.created_at).toLocaleDateString('sv-SE', { year: 'numeric', month: '2-digit', day: '2-digit' })}
                              {conv.hasUnread && (
                                <span
                                  className="inline-flex h-2 w-2 rounded-full bg-brand-green"
                                  aria-hidden="true"
                                />
                              )}
                              {isListingClosed(conv) && (
                                <span className="text-[10px] font-semibold uppercase text-amber-600 bg-amber-100 px-1.5 py-0.5 rounded">
                                  Såld
                                </span>
                              )}
                            </p>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>

          {/* --- HÖGER: Chatt-vyn — flex flex-col h-full relative overflow-hidden (sticky footer) --- */}
          <div
            className={`
              absolute inset-0 w-full h-full md:static min-h-0 flex flex-col h-full relative overflow-hidden
              transition-transform duration-300 ease-in-out
              ${showInboxMobile ? 'translate-x-full' : 'translate-x-0'}
              md:translate-x-0 md:col-span-2
            `}
          >
            <div className="flex flex-col h-full overflow-hidden bg-white rounded-xl shadow-md border border-gray-200">
              {!selectedConversation ? (
                <div className="flex-1 flex flex-col items-center justify-center text-brand-text p-8 text-center antialiased min-h-0">
                  <div className="text-6xl mb-4">💬</div>
                  <p>{t.chat.noSelection}</p>
                </div>
              ) : (
                <>
                  {/* Notis när varan är såld/borttagen */}
                  {isListingClosed(selectedConversation) && (
                    <div className="flex-shrink-0 px-4 py-3 bg-amber-500/90 text-white text-center text-sm border-b border-amber-600/80" role="alert">
                      <p className="font-semibold">Varan är såld/borttagen</p>
                      <p className="mt-0.5 opacity-95">Chatten är stängd – du kan läsa föregående meddelanden men inte skicka nya.</p>
                    </div>
                  )}

                  {/* Zon 1: Header — får aldrig krympa */}
                  <div className="flex-shrink-0 p-4 border-b border-gray-200 bg-brand-beige flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-12 h-12 bg-gray-200 rounded-lg overflow-hidden flex-shrink-0">
                        {selectedConversation.listing?.images?.[0] && (
                          <img
                            src={selectedConversation.listing.images[0]}
                            alt={selectedConversation.listing.title || 'Annonsbild'}
                            className="w-full h-full object-cover"
                          />
                        )}
                      </div>
                      <div className="min-w-0">
                        <span className="text-xs text-brand-text uppercase tracking-wide antialiased">
                          Angående
                        </span>
                        <h3 className="font-display font-semibold text-brand-green text-sm truncate">
                          <Link
                            href={`/annons/${selectedConversation.listing_id}`}
                            className="hover:text-brand-green/80 transition"
                          >
                            {selectedConversation.listing?.title || 'Okänd annons'}
                          </Link>
                        </h3>
                        {(selectedConversation.listing?.bortskankes || selectedConversation.listing?.price != null) && (
                          <p className="text-xs text-brand-text mt-0.5 antialiased">
                            {selectedConversation.listing.bortskankes ? 'Bortskänkes' : `${selectedConversation.listing.price!.toLocaleString('sv-SE')} kr`}
                          </p>
                        )}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleBackToInboxMobile}
                      className="md:hidden inline-flex items-center justify-center rounded-full p-1.5 text-brand-text hover:text-brand-green focus:outline-none focus:ring-2 focus:ring-brand-green"
                      aria-label="Stäng chatt och visa inkorg"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Zon 2: Meddelandelista — ENDA stället som scrollar */}
                  <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden overscroll-contain p-4 space-y-4 bg-brand-beige/50">
                    {loadingMessages ? (
                      <div className="text-center text-brand-text text-sm antialiased">
                        Laddar meddelanden...
                      </div>
                    ) : (
                      messages.map((msg) => {
                        const isMe = msg.sender_id === userId
                        return (
                          <div
                            key={msg.id}
                            className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
                          >
                            <div
                              className={`max-w-[70%] rounded-xl px-4 py-2 shadow-sm text-sm ${
                                isMe
                                  ? 'bg-brand-green text-white rounded-br-none'
                                  : 'bg-white text-brand-text border border-brand-green/10 rounded-bl-none'
                              }`}
                            >
                              <p>{msg.content}</p>
                              <span
                                className={`text-[10px] block mt-1 opacity-70 antialiased ${
                                  isMe ? 'text-white/80' : 'text-brand-text'
                                }`}
                              >
                                {new Date(msg.created_at).toLocaleTimeString('sv-SE', {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </span>
                            </div>
                          </div>
                        )
                      })
                    )}
                  </div>

                  {/* Zon 3: Input (döljs när chatten är stängd) eller meddelande om stängd chat */}
                  <div className="flex-shrink-0 z-20 border-t border-gray-200 bg-white p-4 shadow-[0_-4px_20px_-8px_rgba(0,0,0,0.12)] pb-[max(0.5rem,env(safe-area-inset-bottom))]">
                    {isListingClosed(selectedConversation) ? (
                      <p className="text-center text-brand-text/70 text-sm py-2 antialiased">
                        Du kan inte skicka nya meddelanden – chatten är stängd.
                      </p>
                    ) : (
                      <form onSubmit={handleSendMessage} className="flex gap-2 items-center">
                        <input
                          type="text"
                          value={newMessage}
                          onChange={(e) => setNewMessage(e.target.value)}
                          placeholder={t.chat.placeholder}
                          className="flex-1 min-w-0 p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-brand-green focus:border-brand-green outline-none transition text-brand-text antialiased bg-white"
                          disabled={sending}
                          aria-label="Skriv meddelande"
                        />
                        <Button type="submit" disabled={sending || !newMessage.trim()} className="shrink-0">
                          {sending ? t.chat.sending : t.chat.send}
                        </Button>
                      </form>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
        </div>
      </div>
    </div>
  )
}
