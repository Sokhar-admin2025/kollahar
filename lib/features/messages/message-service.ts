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

  if (existing) {
    // Om konversationen tidigare har dolts för köparen (soft delete),
    // återaktiverar vi den genom att ta bort raden i user_hidden_conversations.
    const existingId = (existing as { id: string }).id
    const { error: unhideError } = await supabase
      .from('user_hidden_conversations')
      .delete()
      .eq('user_id', buyerId)
      .eq('conversation_id', existingId)

    if (unhideError) {
      console.error(
        '[messages] Failed to unhide conversation for buyer',
        unhideError.message
      )
    }

    return existingId
  }

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

/** Hämta alla konversationer för användaren med listing-info och motpartens namn. Exkluderar dolda (soft delete). */
export async function getMyConversations(userId: string): Promise<Conversation[]> {
  const supabase = await createClient()

  const { data: hiddenRows } = await supabase
    .from('user_hidden_conversations')
    .select('conversation_id')
    .eq('user_id', userId)
  const hiddenIds = new Set((hiddenRows ?? []).map((r: { conversation_id: string }) => r.conversation_id))

  let query = supabase
    .from('conversations')
    .select(
      `
      *,
      listing:listings (title, images, price, bortskankes, status, deleted_at)
    `
    )
    .or(`buyer_id.eq.${userId},seller_id.eq.${userId}`)
    .order('updated_at', { ascending: false })

  if (hiddenIds.size > 0) {
    query = query.not('id', 'in', `(${Array.from(hiddenIds).join(',')})`)
  }

  const { data: convs, error } = await query
  if (error) throw error

  const convList = (convs ?? []) as (Conversation & { buyer_id: string; seller_id: string })[]
  const userIds = new Set<string>()
  convList.forEach((c) => {
    userIds.add(c.buyer_id)
    userIds.add(c.seller_id)
  })

  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, full_name, account_type')
    .in('id', Array.from(userIds))
  const profileMap = new Map<string, { full_name: string | null; account_type?: string }>()
  ;(profiles ?? []).forEach((p: { id: string; full_name: string | null; account_type?: string }) => {
    profileMap.set(p.id, { full_name: p.full_name?.trim() || null, account_type: p.account_type })
  })

  return convList.map((c) => {
    const otherId = c.buyer_id === userId ? c.seller_id : c.buyer_id
    const otherProfile = profileMap.get(otherId)
    const otherName = otherProfile?.full_name ?? 'Användare'
    const sellerProfile = profileMap.get(c.seller_id)
    const sellerAccountType = (sellerProfile?.account_type === 'company' ? 'company' : 'private') as 'private' | 'company'
    return {
      ...c,
      other_participant_name: otherName,
      seller_account_type: sellerAccountType,
    } as Conversation
  })
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

/** Hämta de senaste N meddelandena i en konversation (default 10). */
export async function getLatestMessagesForConversation(
  conversationId: string,
  limit = 10
): Promise<Message[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('[messages] getLatestMessagesForConversation failed', error.message)
    return []
  }

  const rows = (data ?? []) as Message[]
  // Returnera i fallande ordning (senaste först) – enklare för UI att visa
  return rows
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

/** Soft delete: dölj konversation för användaren (visas inte längre i inkorgen). */
export async function hideConversation(
  conversationId: string,
  userId: string
): Promise<void> {
  const supabase = await createClient()

  const { error } = await supabase.from('user_hidden_conversations').upsert(
    { user_id: userId, conversation_id: conversationId },
    { onConflict: 'user_id,conversation_id' }
  )

  if (error) throw error
}
