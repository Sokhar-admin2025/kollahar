'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

import { DASHBOARD_TEXTS } from '@/app/lib/content'
import { messageService } from '@/app/services/messageService'
import type { Conversation, Message } from '@/app/types'
import Button from '@/app/components/atoms/Button'
import Header from '@/app/components/organisms/Header'
import { createClient } from '@/lib/supabase/client'
import { X } from 'lucide-react'

// Skapa Supabase-klient (delad med resten av appen)
const supabase = createClient()

export default function InboxPage() {
  const router = useRouter()
  const t = DASHBOARD_TEXTS.messages
  
  // State
  const [userId, setUserId] = useState<string | null>(null)
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  
  const [loadingInbox, setLoadingInbox] = useState(true)
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [sending, setSending] = useState(false)
  const [newMessage, setNewMessage] = useState('')
  const [showInboxMobile, setShowInboxMobile] = useState(true)

  // 1. Hämta användare och inkorg vid start
  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }
      setUserId(user.id)

      try {
        const convs = await messageService.getMyConversations(user.id)
        const unreadSet = await messageService.getUnreadConversationIds(user.id)

        const enriched = convs.map((c) => ({
          ...c,
          hasUnread: unreadSet.has(c.id),
        }))

        enriched.sort((a, b) => {
          if (a.hasUnread && !b.hasUnread) return -1
          if (!a.hasUnread && b.hasUnread) return 1
          return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
        })

        setConversations(enriched)
      } catch (error) {
        console.error('Kunde inte hämta inkorg:', error)
      } finally {
        setLoadingInbox(false)
      }
    }
    init()
  }, [router])

  // 2. När man klickar på en konversation -> Hämta meddelanden & markera som lästa
  useEffect(() => {
    if (!selectedConversation || !userId) return

    const fetchMessages = async () => {
      setLoadingMessages(true)
      try {
        const data = await messageService.getMessages(selectedConversation.id)
        setMessages(data)

        // Markera som lästa i backend
        await messageService.markConversationAsRead(selectedConversation.id, userId)

        // Uppdatera lokalt hasUnread-flaggan
        setConversations((prev) =>
          prev.map((conv) =>
            conv.id === selectedConversation.id ? { ...conv, hasUnread: false } : conv
          )
        )
      } catch (error) {
        console.error('Kunde inte hämta meddelanden:', error)
      } finally {
        setLoadingMessages(false)
      }
    }

    fetchMessages()
  }, [selectedConversation, userId])

  // 3. Skicka meddelande
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim() || !selectedConversation || !userId) return

    setSending(true)
    try {
      await messageService.sendMessage(selectedConversation.id, userId, newMessage)
      
      // Lägg till meddelandet lokalt direkt (för snabbare känsla)
      const tempMsg: Message = {
        id: 'temp-' + Date.now(),
        conversation_id: selectedConversation.id,
        sender_id: userId,
        content: newMessage,
        is_read: false,
        created_at: new Date().toISOString()
      }
      setMessages([...messages, tempMsg])
      setNewMessage('')
    } catch (error) {
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
    <div className="min-h-screen bg-brand-beige flex flex-col">
      <Header />
      
      {/* Page Title */}
      <div className="max-w-6xl mx-auto w-full px-4 md:px-6 pt-6">
        <h1 className="text-2xl font-display text-brand-green mb-4">{t.pageTitle}</h1>
      </div>

      <div className="max-w-6xl mx-auto w-full flex-grow p-4 md:p-6 h-[calc(100vh-100px)] flex flex-col gap-4">
        <div className="flex justify-start">
          <Link href="/dashboard" className="text-sm text-brand-text hover:text-brand-green antialiased">
            ← Tillbaka till Dashboard
          </Link>
        </div>

        <div className="relative flex-1 overflow-hidden md:grid md:grid-cols-3 md:gap-6">
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
              {loadingInbox ? (
                <div className="p-4 text-center text-brand-text antialiased">{t.inbox.loading}</div>
              ) : conversations.length === 0 ? (
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
                        selectedConversation?.id === conv.id ? 'bg-brand-green/10 border-l-4 border-l-brand-green' : ''
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {/* Liten bild på varan */}
                        <div className="w-12 h-12 bg-gray-200 rounded overflow-hidden flex-shrink-0">
                          {conv.listing?.images?.[0] && (
                            <img src={conv.listing.images[0]} alt="" className="w-full h-full object-cover" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-bold text-sm text-gray-900 truncate">
                            {conv.listing?.title || 'Okänd annons'}
                          </h4>
                          <p className="text-xs text-brand-text flex items-center gap-2 antialiased">
                            {new Date(conv.created_at).toLocaleDateString()}
                            {conv.hasUnread && (
                              <span className="inline-flex h-2 w-2 rounded-full bg-brand-green" aria-hidden="true" />
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

          {/* --- HÖGER: CHATT-FÖNSTER --- */}
          <div
            className={`
              absolute inset-0 w-full h-full md:static
              transition-transform duration-300 ease-in-out
              ${showInboxMobile ? 'translate-x-full' : 'translate-x-0'}
              md:translate-x-0 md:col-span-2
            `}
          >
            <div className="relative bg-white rounded-xl shadow-md border border-gray-200 flex flex-col h-full overflow-hidden">
              {!selectedConversation ? (
                // Om ingen chatt är vald
                <div className="flex-1 flex flex-col items-center justify-center text-brand-text p-8 text-center antialiased">
                  <div className="text-6xl mb-4">💬</div>
                  <p>{t.chat.noSelection}</p>
                </div>
              ) : (
                // Om chatt ÄR vald
                <>
                  {/* Chatt-header */}
                  <div className="p-4 border-b bg-brand-beige flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Liten bild på annonsen */}
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
                        {selectedConversation.listing?.price != null && (
                          <p className="text-xs text-brand-text mt-0.5 antialiased">
                            {selectedConversation.listing.price.toLocaleString('sv-SE')} kr
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Stäng-knapp (mobil/smal vy) */}
                    <button
                      type="button"
                      onClick={handleBackToInboxMobile}
                      className="md:hidden inline-flex items-center justify-center rounded-full p-1.5 text-brand-text hover:text-brand-green focus:outline-none focus:ring-2 focus:ring-brand-green"
                      aria-label="Stäng chatt och visa inkorg"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Meddelande-logg */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-brand-beige/50">
                    {loadingMessages ? (
                      <div className="text-center text-brand-text text-sm antialiased">Laddar meddelanden...</div>
                    ) : (
                      messages.map((msg) => {
                        const isMe = msg.sender_id === userId
                        return (
                          <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[70%] rounded-xl px-4 py-2 shadow-sm text-sm ${
                              isMe 
                                ? 'bg-brand-green text-white rounded-br-none' 
                                : 'bg-white text-brand-text border border-brand-green/10 rounded-bl-none'
                            }`}>
                              <p>{msg.content}</p>
                              <span className={`text-[10px] block mt-1 opacity-70 antialiased ${isMe ? 'text-white/80' : 'text-brand-text'}`}>
                                {new Date(msg.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                              </span>
                            </div>
                          </div>
                        )
                      })
                    )}
                  </div>

                  {/* Skrivfält */}
                  <div className="p-4 bg-white border-t">
                    <form onSubmit={handleSendMessage} className="flex gap-2">
                      <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder={t.chat.placeholder}
                        className="flex-1 p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-brand-green focus:border-brand-green outline-none"
                        disabled={sending}
                      />
                      <Button type="submit" disabled={sending || !newMessage.trim()}>
                        {sending ? t.chat.sending : t.chat.send}
                      </Button>
                    </form>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}