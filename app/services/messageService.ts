import { createClient } from '@/lib/supabase/client'
import type { Conversation, Message } from '@/app/types'

const supabase = createClient()

export const messageService = {

  // 1. Starta eller hämta befintlig konversation
  createConversation: async (listingId: string, buyerId: string, sellerId: string) => {
    // Först, kolla om den redan finns?
    const { data: existing } = await supabase
      .from('conversations')
      .select('id')
      .eq('listing_id', listingId)
      .eq('buyer_id', buyerId)
      .eq('seller_id', sellerId)
      .single();

    if (existing) return existing.id;

    // Annars, skapa ny
    const { data, error } = await supabase
      .from('conversations')
      .insert({
        listing_id: listingId,
        buyer_id: buyerId,
        seller_id: sellerId
      })
      .select()
      .single();

    if (error) throw error;
    return data.id;
  },

  // 2. Hämta alla mina konversationer (Inkorgen)
  getMyConversations: async (userId: string) => {
    // Vi hämtar konversationen OCH infon om annonsen (title, images) i samma veva
    const { data, error } = await supabase
      .from('conversations')
      .select(`
        *,
        listing:listings (title, images)
      `)
      .or(`buyer_id.eq.${userId},seller_id.eq.${userId}`)
      .order('updated_at', { ascending: false });

    if (error) throw error;
    return data as Conversation[];
  },

  // 2b. Hämta vilka konversationer som har olästa meddelanden för en användare
  getUnreadConversationIds: async (userId: string) => {
    const { data, error } = await supabase
      .from('messages')
      .select('conversation_id, sender_id, is_read')
      .eq('is_read', false)
      .neq('sender_id', userId);

    if (error) throw error;

    const unreadSet = new Set<string>();
    (data || []).forEach((row: { conversation_id: string }) => {
      unreadSet.add(row.conversation_id);
    });

    return unreadSet;
  },

  // 3. Hämta meddelanden i en specifik chatt
  getMessages: async (conversationId: string) => {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true }); // Äldst först (som i en SMS-tråd)

    if (error) throw error;
    return data as Message[];
  },

  // 3b. Markera meddelanden som lästa i en konversation för en användare
  markConversationAsRead: async (conversationId: string, userId: string) => {
    const { error } = await supabase
      .from('messages')
      .update({ is_read: true })
      .eq('conversation_id', conversationId)
      .neq('sender_id', userId)
      .eq('is_read', false);

    if (error) throw error;
  },

  // 4. Skicka meddelande
  sendMessage: async (conversationId: string, senderId: string, content: string) => {
    const { error } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        sender_id: senderId,
        content: content
      });

    if (error) throw error;

    // Uppdatera tidstämpeln på konversationen så den hamnar överst i listan
    await supabase
      .from('conversations')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', conversationId);
  }
};