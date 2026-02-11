import { createClient } from '@/lib/supabase/server'
import type { Conversation, Message } from '@/app/types'

/** Starta eller hämta befintlig konversation. Returnerar conversation id. */
export async function createConversation(
  listingId: string,
  buyerId: string,
  sellerId: string
): Promise<string> {
  const supabase = await createClient()

  const { data: existing } = await supabase
    .from('conversations')
    .select('id')
    .eq('listing_id', listingId)
    .eq('buyer_id', buyerId)
    .eq('seller_id', sellerId)
    .maybeSingle()

  if (existing) return existing.id

  const { data, error } = await supabase
    .from('conversations')
    .insert({
      listing_id: listingId,
      buyer_id: buyerId,
      seller_id: sellerId,
    })
    .select('id')
    .single()

  if (error) throw error
  return data.id
}

/** Hämta alla konversationer för användaren med listing-info (inkl. status för såld/borttagen). */
export async function getMyConversations(userId: string): Promise<Conversation[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('conversations')
    .select(`
      *,
      listing:listings (title, images, price, bortskankes, status, deleted_at)
    `)
    .or(`buyer_id.eq.${userId},seller_id.eq.${userId}`)
    .order('updated_at', { ascending: false })

  if (error) throw error
  return (data ?? []) as Conversation[]
}

/** Hämta konversations-IDs som har olästa meddelanden för användaren (meddelanden inte skickade av userId). */
export async function getUnreadConversationIds(userId: string): Promise<Set<string>> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('messages')
    .select('conversation_id')
    .eq('is_read', false)
    .neq('sender_id', userId)

  if (error) throw error

  const unreadSet = new Set<string>()
  ;(data ?? []).forEach((row: { conversation_id: string }) => {
    unreadSet.add(row.conversation_id)
  })
  return unreadSet
}

/** Hämta meddelanden i en konversation (äldst först). */
export async function getMessages(conversationId: string): Promise<Message[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true })

  if (error) throw error
  return (data ?? []) as Message[]
}

/** Markera meddelanden i konversationen som lästa (de som inte skickats av userId). */
export async function markConversationAsRead(
  conversationId: string,
  userId: string
): Promise<void> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('messages')
    .update({ is_read: true })
    .eq('conversation_id', conversationId)
    .neq('sender_id', userId)
    .eq('is_read', false)

  if (error) throw error
}

/** Kontrollera om konversationens annons är såld/borttagen (chatten ska då vara stängd). */
export async function isConversationListingClosed(
  supabase: Awaited<ReturnType<typeof createClient>>,
  conversationId: string
): Promise<boolean> {
  const { data: conv } = await supabase
    .from('conversations')
    .select('listing_id')
    .eq('id', conversationId)
    .single()
  if (!conv?.listing_id) return true

  const { data: listing } = await supabase
    .from('listings')
    .select('status, deleted_at')
    .eq('id', (conv as { listing_id: string }).listing_id)
    .single()
  if (!listing) return true
  const row = listing as { status: string; deleted_at: string | null }
  return row.status !== 'active' || !!row.deleted_at
}

/** Skicka meddelande och uppdatera konversationens updated_at. Kastar om annonsen är såld/borttagen. */
export async function sendMessage(
  conversationId: string,
  senderId: string,
  content: string
): Promise<void> {
  const supabase = await createClient()

  const closed = await isConversationListingClosed(supabase, conversationId)
  if (closed) {
    throw new Error('Chatten är stängd – varan är såld eller borttagen.')
  }

  const { error: insertError } = await supabase.from('messages').insert({
    conversation_id: conversationId,
    sender_id: senderId,
    content: content.trim(),
  })

  if (insertError) throw insertError

  await supabase
    .from('conversations')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', conversationId)
}
