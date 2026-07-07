import { requireRole, requireUser, getUserOrgIds } from '@/lib/auth/guards'
import { createServerClient } from '@/lib/supabase/server'
import { InboxView, type InboxItem } from '@/components/client/InboxView'
import { nextHandoffStatus, type HandoffAction } from '@/lib/handoff'
import type { HandoffStatus, Message } from '@/lib/types'

/** Conversations in handoff across ALL the org's bots, newest first, with a
 *  short last-message preview. RLS scopes reads to the caller's orgs. */
async function fetchOrgInbox(): Promise<InboxItem[]> {
  const sb = await createServerClient()
  const orgId = (await getUserOrgIds())[0] ?? null
  if (!orgId) return []
  const { data: bots } = await sb.from('bots').select('id').eq('org_id', orgId)
  const botIds = (bots ?? []).map((b) => (b as { id: string }).id)
  if (botIds.length === 0) return []

  const { data: convs } = await sb
    .from('conversations')
    .select('id, visitor_id, handoff_status, handoff_requested_at, last_message_at, assigned_to')
    .in('bot_id', botIds)
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

/** Mobile unified Inbox — take over any bot's live chat from one place. */
export default async function OrgInboxPage() {
  await requireRole('client')
  const initialList = await fetchOrgInbox()

  async function loadList(): Promise<InboxItem[]> {
    'use server'
    await requireUser()
    return fetchOrgInbox()
  }

  async function loadThread(conversationId: string): Promise<Message[]> {
    'use server'
    await requireUser()
    const sb = await createServerClient()
    const { data } = await sb
      .from('messages')
      .select('id, conversation_id, role, content, citations, token_count, created_at, feedback, from_human')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })
    return (data ?? []) as Message[]
  }

  async function sendAgentMessage(
    conversationId: string,
    content: string,
  ): Promise<{ id: string; content: string; created_at: string } | null> {
    'use server'
    const session = await requireUser()
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

  async function handoffAction(
    conversationId: string,
    action: HandoffAction,
  ): Promise<{ status: HandoffStatus }> {
    'use server'
    const session = await requireUser()
    const sb = await createServerClient()
    const status = nextHandoffStatus('bot', action)
    const patch: Record<string, unknown> = { handoff_status: status }
    if (action === 'take') patch.assigned_to = session.id
    await sb.from('conversations').update(patch).eq('id', conversationId)
    return { status }
  }

  return (
    <div className="flex h-full flex-col gap-0 overflow-hidden p-0 md:gap-4 md:p-5">
      {/* Header is desktop-only; on mobile the list runs full-bleed. */}
      <div className="hidden flex-shrink-0 md:block">
        <h1 className="text-lg font-semibold">Inbox</h1>
        <p className="text-sm text-muted-foreground">
          Take over live conversations across your bots. The bot pauses while you reply.
        </p>
      </div>
      <InboxView
        initialList={initialList}
        loadList={loadList}
        loadThread={loadThread}
        sendAgentMessage={sendAgentMessage}
        handoffAction={handoffAction}
      />
    </div>
  )
}
