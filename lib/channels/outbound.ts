import type { SupabaseClient } from '@supabase/supabase-js'
import { getEnv } from '@/lib/env'
import { createServiceClient } from '@/lib/supabase/service'
import { sendTextMessage } from '@/lib/channels/meta'
import { decryptSecret } from '@/lib/channels/crypto'

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

/**
 * Page access token for a connection: the per-connection encrypted token from
 * the OAuth flow, falling back to the env token for the legacy spike
 * connection. Reads via the service client — channel_connections is
 * service-role-only; callers must have already authorized the caller's access
 * to the conversation/connection.
 */
export async function connectionPageToken(connectionId: string | null): Promise<string | null> {
  if (connectionId) {
    const svc = createServiceClient()
    const { data } = await svc
      .from('channel_connections')
      .select('access_token_cipher')
      .eq('id', connectionId)
      .maybeSingle<{ access_token_cipher: string | null }>()
    if (data?.access_token_cipher) {
      try {
        return decryptSecret(data.access_token_cipher)
      } catch (err) {
        console.error('[channels] token decrypt failed:', err instanceof Error ? err.message : err)
        return null
      }
    }
  }
  return getEnv().META_PAGE_ACCESS_TOKEN ?? null
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
    .select('id, channel, visitor_id, channel_connection_id')
    .eq('id', conversationId)
    .maybeSingle<{
      id: string
      channel: string
      visitor_id: string
      channel_connection_id: string | null
    }>()
  if (!conv) return { ok: false, error: 'Conversation not found' }

  // Instagram DMs send through the linked Page's token via the same API.
  if (conv.channel === 'messenger' || conv.channel === 'instagram') {
    const token = await connectionPageToken(conv.channel_connection_id)
    if (!token) return { ok: false, error: 'Channel sending is not configured' }
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
