import { notFound } from 'next/navigation'
import { requireRole } from '@/lib/auth/guards'
import { createServerClient } from '@/lib/supabase/server'
import { InboxView, type InboxItem } from '@/components/client/InboxView'
import { nextHandoffStatus, type HandoffAction } from '@/lib/handoff'
import type { HandoffStatus, Message } from '@/lib/types'

/**
 * Builds the inbox list: conversations in handoff (anything but `bot`), newest
 * first, each with a short last-message preview. RLS scopes this to the caller's
 * org, so it is safe to call from both the page and the loadList action.
 */
async function fetchInboxList(botId: string): Promise<InboxItem[]> {
  const sb = await createServerClient()
  const { data: convs } = await sb
    .from('conversations')
    .select('id, visitor_id, handoff_status, handoff_requested_at, last_message_at, assigned_to')
    .eq('bot_id', botId)
    .neq('handoff_status', 'bot')
    .order('last_message_at', { ascending: false })
    .limit(100)

  const rows = (convs ?? []) as Omit<InboxItem, 'preview'>[]
  const ids = rows.map((r) => r.id)
  const previews: Record<string, string> = {}
  if (ids.length > 0) {
    const { data: msgs } = await sb
      .from('messages')
      .select('conversation_id, content, created_at')
      .in('conversation_id', ids)
      .order('created_at', { ascending: false })
    for (const m of msgs ?? []) {
      const cid = (m as { conversation_id: string }).conversation_id
      if (!(cid in previews)) previews[cid] = (m as { content: string }).content
    }
  }

  return rows.map((r) => ({ ...r, preview: previews[r.id] ?? '' }))
}

export default async function InboxPage({ params }: { params: Promise<{ botId: string }> }) {
  await requireRole('client')
  const { botId } = await params

  const supabase = await createServerClient()
  const { data: bot } = await supabase.from('bots').select('id, name').eq('id', botId).single()
  if (!bot) notFound()

  const initialList = await fetchInboxList(botId)

  /** Full transcript for a conversation. */
  async function loadThread(conversationId: string): Promise<Message[]> {
    'use server'
    await requireRole('client')
    const sb = await createServerClient()
    const { data } = await sb
      .from('messages')
      .select('id, conversation_id, role, content, citations, token_count, created_at, feedback, from_human')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })
    return (data ?? []) as Message[]
  }

  /** Refreshed inbox list (used after actions + as a Realtime fallback). */
  async function loadList(): Promise<InboxItem[]> {
    'use server'
    await requireRole('client')
    return fetchInboxList(botId)
  }

  /**
   * Posts a human-agent reply and takes the conversation live + assigned to the
   * acting agent. RLS (messages_member_insert / conversations_member_update)
   * enforces that the conversation belongs to the agent's org.
   */
  async function sendAgentMessage(
    conversationId: string,
    content: string,
  ): Promise<{ id: string; content: string; created_at: string } | null> {
    'use server'
    const session = await requireRole('client')
    const trimmed = content.trim()
    if (!trimmed) return null
    const sb = await createServerClient()
    const { data: msg, error } = await sb
      .from('messages')
      .insert({ conversation_id: conversationId, role: 'assistant', content: trimmed, from_human: true, citations: [] })
      .select('id, content, created_at')
      .single<{ id: string; content: string; created_at: string }>()
    if (error || !msg) return null
    await sb
      .from('conversations')
      .update({ handoff_status: 'live', assigned_to: session.id, last_message_at: new Date().toISOString() })
      .eq('id', conversationId)
    return msg
  }

  /** Transition a conversation's handoff state (take / resolve / return). */
  async function handoffAction(
    conversationId: string,
    action: HandoffAction,
  ): Promise<{ status: HandoffStatus }> {
    'use server'
    const session = await requireRole('client')
    const sb = await createServerClient()
    const status = nextHandoffStatus('bot', action)
    const patch: Record<string, unknown> = { handoff_status: status }
    if (action === 'take') patch.assigned_to = session.id
    await sb.from('conversations').update(patch).eq('id', conversationId)
    return { status }
  }

  return (
    <div className="space-y-4 p-6">
      <div>
        <h2 className="text-lg font-semibold">Inbox</h2>
        <p className="text-sm text-muted-foreground">
          Take over live conversations and reply as a human. The bot pauses while you handle a chat.
        </p>
      </div>

      <InboxView
        botId={botId}
        initialList={initialList}
        loadList={loadList}
        loadThread={loadThread}
        sendAgentMessage={sendAgentMessage}
        handoffAction={handoffAction}
      />
    </div>
  )
}
