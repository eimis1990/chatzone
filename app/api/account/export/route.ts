import { requireRole, getUserOrgIds } from '@/lib/auth/guards'
import { createServerClient } from '@/lib/supabase/server'

export const maxDuration = 60

/**
 * GDPR data export — bundles the signed-in client's org data (bots,
 * conversations + messages, leads) into a downloadable JSON file. Reads through
 * the authenticated client so RLS scopes everything to the user's org.
 */
export async function GET() {
  await requireRole('client')
  const orgIds = await getUserOrgIds()
  const orgId = orgIds[0] ?? null
  if (!orgId) return new Response(JSON.stringify({ error: 'No organization' }), { status: 404 })

  const sb = await createServerClient()

  const { data: bots } = await sb.from('bots').select('id, name, status').eq('org_id', orgId)
  const botIds = (bots ?? []).map((b) => (b as { id: string }).id)

  let conversations: unknown[] = []
  let messages: unknown[] = []
  let leads: unknown[] = []

  if (botIds.length) {
    const { data: convs } = await sb
      .from('conversations')
      .select('id, bot_id, visitor_id, started_at, last_message_at, summary, topics, had_fallback')
      .in('bot_id', botIds)
    conversations = convs ?? []
    const convIds = conversations.map((c) => (c as { id: string }).id)

    if (convIds.length) {
      const { data: msgs } = await sb
        .from('messages')
        .select('id, conversation_id, role, content, feedback, created_at')
        .in('conversation_id', convIds)
        .order('created_at', { ascending: true })
      messages = msgs ?? []
    }

    const { data: ld } = await sb
      .from('leads')
      .select('id, bot_id, conversation_id, fields, created_at')
      .in('bot_id', botIds)
    leads = ld ?? []
  }

  const payload = {
    exported_at: new Date().toISOString(),
    organization_id: orgId,
    bots: bots ?? [],
    conversations,
    messages,
    leads,
  }

  return new Response(JSON.stringify(payload, null, 2), {
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="loqara-export-${orgId}.json"`,
    },
  })
}
