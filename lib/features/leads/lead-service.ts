import { createClient } from '@/lib/supabase/server'

/** Kontrollera om det redan finns en lead för konversationen. */
export async function getLeadByConversationId(
  conversationId: string
): Promise<{ id: string } | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('leads')
    .select('id')
    .eq('conversation_id', conversationId)
    .maybeSingle()

  if (error) {
    console.error('getLeadByConversationId failed', error)
    return null
  }
  return data as { id: string } | null
}

/** Skapa lead (anropas från submitLeadCardAction efter auth-check). */
export async function createLead(params: {
  conversationId: string
  listingId: string
  sellerId: string
  buyerId: string
  buyerName: string
  buyerPhone: string
}): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()

  const { error } = await supabase.from('leads').insert({
    conversation_id: params.conversationId,
    listing_id: params.listingId,
    seller_id: params.sellerId,
    buyer_id: params.buyerId,
    buyer_name: params.buyerName.trim(),
    // GDPR: do not auto-collect buyer email for leads.
    buyer_email: null,
    buyer_phone: params.buyerPhone.trim(),
    status: 'new',
  })

  if (error) {
    if (error.code === '23505') {
      return { success: false, error: 'Lead finns redan för denna konversation.' }
    }
    console.error('createLead failed', error)
    return { success: false, error: error.message }
  }
  return { success: true }
}
