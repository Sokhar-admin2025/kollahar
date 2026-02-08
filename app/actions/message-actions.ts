'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import {
  sendMessage as sendMessageService,
  markConversationAsRead,
  getMessages,
  createConversation as createConversationService,
} from '@/lib/features/messages/message-service'

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
    await sendMessageService(conversationId, user.id, content.trim())
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
