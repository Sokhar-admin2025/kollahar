'use server'

import { supabaseAdmin } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { sendNewMessageNotification } from '@/lib/email/new-message-notification'

const FIFTEEN_MINUTES_MS = 15 * 60 * 1000

/**
 * Skicka e-postnotis till mottagare (privat säljare eller köpare) vid nytt meddelande.
 * Hoppar över om mottagaren varit aktiv i chatten inom 15 min (spam-skydd).
 */
export async function triggerNewMessageNotification(params: {
  conversationId: string
  senderId: string
  recipientId: string
  messageContent: string
}): Promise<void> {
  try {
    const supabase = await createClient()

    const { data: conv } = await supabase
      .from('conversations')
      .select('listing_id, buyer_id, seller_id')
      .eq('id', params.conversationId)
      .single()

    if (!conv) return

    const listingId = (conv as { listing_id: string }).listing_id

    const { data: recipientProfile } = await supabase
      .from('profiles')
      .select('account_type, email_notifications')
      .eq('id', params.recipientId)
      .maybeSingle()

    const accountType = (recipientProfile as { account_type?: string } | null)?.account_type
    const emailNotifications = (recipientProfile as { email_notifications?: boolean } | null)?.email_notifications

    // Skicka endast till privat säljare eller köpare (dealers får lead-notiser)
    const isPrivateSeller = accountType === 'private' && (conv as { seller_id: string }).seller_id === params.recipientId
    const isBuyer = (conv as { buyer_id: string }).buyer_id === params.recipientId

    if (!isPrivateSeller && !isBuyer) return
    if (emailNotifications === false) return

    // 15 min-check: har mottagaren skickat ett meddelande nyligen?
    const { data: messages } = await supabase
      .from('messages')
      .select('created_at, sender_id')
      .eq('conversation_id', params.conversationId)
      .order('created_at', { ascending: false })
      .limit(50)

    const recipientMessages = (messages ?? []).filter(
      (m: { sender_id: string }) => m.sender_id === params.recipientId
    )
    const lastFromRecipient = recipientMessages[0] as { created_at: string } | undefined
    if (lastFromRecipient) {
      const lastAt = new Date(lastFromRecipient.created_at).getTime()
      if (Date.now() - lastAt < FIFTEEN_MINUTES_MS) return // Aktiv – skicka inte
    }

    let recipientEmail: string | null = null
    if (supabaseAdmin) {
      const { data } = await supabaseAdmin.auth.admin.getUserById(params.recipientId)
      recipientEmail = data?.user?.email ?? null
    }
    if (!recipientEmail) {
      console.warn('[new-message-notification] Could not get recipient email:', params.recipientId)
      return
    }

    const { data: listing } = await supabase
      .from('listings')
      .select('title')
      .eq('id', listingId)
      .single()
    const listingTitle = (listing as { title?: string } | null)?.title ?? 'Annons'

    const { data: senderProfile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', params.senderId)
      .maybeSingle()
    const senderName = (senderProfile as { full_name?: string } | null)?.full_name?.trim() || 'Någon'

    const messagePreview =
      params.messageContent.slice(0, 150) + (params.messageContent.length > 150 ? '...' : '')

    await sendNewMessageNotification({
      to: recipientEmail,
      conversationId: params.conversationId,
      listingTitle,
      senderName,
      messagePreview,
    })
  } catch (err) {
    console.error('[new-message-notification] Exception:', err)
  }
}
