import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import {
  getMyConversations,
  getUnreadConversationIds,
} from '@/lib/features/messages/message-service'
import type { Conversation } from '@/app/types'
import InboxClient from '@/app/components/InboxClient'

export default async function MessagesPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const [convs, unreadSet] = await Promise.all([
    getMyConversations(user.id),
    getUnreadConversationIds(user.id),
  ])

  const enriched: Conversation[] = convs.map((c) => ({
    ...c,
    hasUnread: unreadSet.has(c.id),
  }))

  enriched.sort((a, b) => {
    if (a.hasUnread && !b.hasUnread) return -1
    if (!a.hasUnread && b.hasUnread) return 1
    return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
  })

  return (
    <InboxClient initialConversations={enriched} userId={user.id} />
  )
}
