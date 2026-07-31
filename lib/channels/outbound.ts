import type { SupabaseClient } from '@supabase/supabase-js'
import { getEnv } from '@/lib/env'
import { sendTextMessage } from '@/lib/channels/meta'

/**
 * Shared human-agent reply delivery for the Inbox. Persists the message and,
 * for external-channel conversations (Messenger), sends it through the
 * provider FIRST — a reply Meta rejected must never appear locally as sent.
 */

export type AgentSendResult =
  | { ok: true; id: string; content: string; created_at: string }
  | { ok: false; error: string }

/** Maps a raw Meta Graph send error to agent-facing text. */
export function messengerSendErrorText(raw: string): string {
  if (/outside.{0,30}window|2018278/i.test(raw)) {
    return 'Outside Messenger’s 24-hour reply window — the visitor must message again before you can reply.'
  }
  if (/access token|oauth/i.test(raw)) {
    return 'Messenger connection needs attention: the Page access token is invalid.'
  }
  return `Messenger delivery failed: ${raw}`
}

export async function deliverAgentMessage(
  sb: SupabaseClient,
  conversationId: string,
  content: string,
  agentUserId: string,
): Promise<AgentSendResult> {
  const trimmed = content.trim()
  if (!trimmed) return { ok: false, error: 'Empty message' }

  // RLS-scoped read: only conversations in the agent's org resolve.
  const { data: conv } = await sb
    .from('conversations')
    .select('id, channel, visitor_id')
    .eq('id', conversationId)
    .maybeSingle<{ id: string; channel: string; visitor_id: string }>()
  if (!conv) return { ok: false, error: 'Conversation not found' }

  if (conv.channel === 'messenger') {
    // ponytail: spike-only env Page token — per-connection tokens with OAuth.
    const token = getEnv().META_PAGE_ACCESS_TOKEN
    if (!token) return { ok: false, error: 'Messenger sending is not configured' }
    try {
      await sendTextMessage(conv.visitor_id, trimmed, token)
    } catch (err) {
      const raw = err instanceof Error ? err.message : 'unknown error'
      return { ok: false, error: messengerSendErrorText(raw) }
    }
  }

  const { data: msg, error } = await sb
    .from('messages')
    .insert({
      conversation_id: conversationId,
      role: 'assistant',
      content: trimmed,
      from_human: true,
      citations: [],
    })
    .select('id, content, created_at')
    .single<{ id: string; content: string; created_at: string }>()
  if (error || !msg) return { ok: false, error: 'Could not save the message' }

  await sb
    .from('conversations')
    .update({
      handoff_status: 'live',
      assigned_to: agentUserId,
      last_message_at: new Date().toISOString(),
    })
    .eq('id', conversationId)
  return { ok: true, ...msg }
}
