'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import {
  sendMessage as sendMessageService,
  markConversationAsRead,
  getMessages,
  createConversation as createConversationService,
  hideConversation as hideConversationService,
} from '@/lib/features/messages/message-service'
import { triggerLeadNotification } from '@/app/actions/lead-notification-action'
import { triggerNewMessageNotification } from '@/app/actions/new-message-notification-action'

export type SendMessageResult = { success: true } | { success: false; error: string }

export async function sendMessageAction(
  conversationId: string,
  content: string
): Promise<SendMessageResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: 'Du måste vara inloggad för att skicka meddelanden.' }
  }

  try {
    const messagesBefore = await getMessages(conversationId)
    const isFirstMessage = messagesBefore.length === 0

    await sendMessageService(conversationId, user.id, content.trim())

    const { data: conv } = await supabase
      .from('conversations')
      .select('buyer_id, seller_id, listing_id')
      .eq('id', conversationId)
      .single()

    const recipientId =
      conv && (conv as { buyer_id: string }).buyer_id === user.id
        ? (conv as { seller_id: string }).seller_id
        : conv
          ? (conv as { buyer_id: string }).buyer_id
          : null

    if (recipientId) {
      triggerNewMessageNotification({
        conversationId,
        senderId: user.id,
        recipientId,
        messageContent: content.trim(),
      }).catch(() => {})
    }

    if (isFirstMessage && conv) {
      const { data: sellerProfile } = await supabase
        .from('profiles')
        .select('account_type')
        .eq('id', (conv as { seller_id: string }).seller_id)
        .maybeSingle()

      if ((sellerProfile as { account_type?: string } | null)?.account_type === 'company') {
        const { data: buyerProfile } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', user.id)
          .maybeSingle()
        const buyerName = (buyerProfile as { full_name?: string } | null)?.full_name?.trim() || 'Kund'

        await triggerLeadNotification({
          type: 'first_message',
          conversationId,
          listingId: (conv as { listing_id: string }).listing_id,
          buyerName,
          messageContent: content.trim(),
        })
      }
    }

    revalidatePath('/dashboard/messages')
    return { success: true }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Kunde inte skicka meddelande.'
    if (message.includes('stängd')) {
      return { success: false, error: message }
    }
    console.error('sendMessageAction error', err)
    return { success: false, error: 'Kunde inte skicka meddelande.' }
  }
}

export type MarkAsReadResult = { success: true } | { success: false; error: string }

export async function markAsReadAction(conversationId: string): Promise<MarkAsReadResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: 'Du måste vara inloggad.' }
  }

  try {
    await markConversationAsRead(conversationId, user.id)
    revalidatePath('/dashboard/messages')
    return { success: true }
  } catch (err) {
    console.error('markAsReadAction error', err)
    return { success: false, error: 'Kunde inte markera som läst.' }
  }
}

export type GetMessagesResult =
  | { success: true; data: Awaited<ReturnType<typeof getMessages>> }
  | { success: false; error: string }

export async function getMessagesAction(conversationId: string): Promise<GetMessagesResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: 'Du måste vara inloggad.' }
  }

  try {
    const data = await getMessages(conversationId)
    return { success: true, data }
  } catch (err) {
    console.error('getMessagesAction error', err)
    return { success: false, error: 'Kunde inte hämta meddelanden.' }
  }
}

export type CreateConversationResult =
  | { success: true; conversationId: string }
  | { success: false; error: string }

export async function createConversationAction(
  listingId: string,
  sellerId: string
): Promise<CreateConversationResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: 'Du måste vara inloggad för att kontakta säljaren.' }
  }

  try {
    const conversationId = await createConversationService(listingId, user.id, sellerId)
    revalidatePath('/dashboard/messages')
    return { success: true, conversationId }
  } catch (err) {
    console.error('createConversationAction error', err)
    return { success: false, error: 'Kunde inte starta chatten just nu.' }
  }
}

export type HideConversationResult = { success: true } | { success: false; error: string }

export async function hideConversationAction(
  conversationId: string
): Promise<HideConversationResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: 'Du måste vara inloggad.' }
  }

  try {
    await hideConversationService(conversationId, user.id)
    revalidatePath('/dashboard/messages')
    return { success: true }
  } catch (err) {
    console.error('hideConversationAction error', err)
    return { success: false, error: 'Kunde inte radera chatten.' }
  }
}
