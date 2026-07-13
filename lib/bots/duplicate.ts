import 'server-only'
import { createServiceClient } from '@/lib/supabase/service'
import { entitlementsFor } from '@/lib/entitlements'
import type { Plan } from '@/lib/types'

/**
 * Duplicate a demo bot into a target org: config, knowledge sources + chunks
 * (embeddings included, source ids remapped), and the product index (copied
 * wholesale — skips the expensive first catalog sync). The source bot MUST
 * live in the `is_demo` org so client bots can never be duplicated this way.
 * Caller is responsible for authorization; the target plan's bot limit applies.
 */
export async function duplicateDemoBot(
  targetOrgId: string,
  demoBotId: string,
): Promise<{ id?: string; error?: string }> {
  const svc = createServiceClient()

  const { data: demoBot } = await svc
    .from('bots')
    .select('id, name, config, org_id, organizations!inner(is_demo)')
    .eq('id', demoBotId)
    .single<{ id: string; name: string; config: unknown; organizations: { is_demo: boolean } }>()
  if (!demoBot || !demoBot.organizations.is_demo) return { error: 'Demo bot not found.' }

  // Enforce the target plan's bot limit (same rule as createBotInOrg).
  const { data: org } = await svc
    .from('organizations')
    .select('plan')
    .eq('id', targetOrgId)
    .single<{ plan: Plan | null }>()
  const limit = entitlementsFor(org?.plan ?? 'free').maxBots
  const { count } = await svc
    .from('bots')
    .select('id', { count: 'exact', head: true })
    .eq('org_id', targetOrgId)
  if ((count ?? 0) >= limit) {
    return { error: `This plan includes ${limit} bot${limit === 1 ? '' : 's'}. Upgrade to add more.` }
  }

  const { data: bot, error } = await svc
    .from('bots')
    .insert({ org_id: targetOrgId, name: demoBot.name, config: demoBot.config })
    .select('id')
    .single<{ id: string }>()
  if (error || !bot) return { error: error?.message ?? 'Failed to create the bot.' }

  // Knowledge: copy sources, then chunks (embeddings included) with remapped ids.
  const { data: sources } = await svc
    .from('knowledge_sources')
    .select('id, type, name, status, error_message, metadata')
    .eq('bot_id', demoBotId)
  const sourceMap = new Map<string, string>()
  for (const src of sources ?? []) {
    const { data: copy } = await svc
      .from('knowledge_sources')
      .insert({
        bot_id: bot.id,
        type: src.type,
        name: src.name,
        status: src.status,
        error_message: src.error_message,
        metadata: src.metadata,
      })
      .select('id')
      .single<{ id: string }>()
    if (copy) sourceMap.set(src.id as string, copy.id)
  }
  for (let from = 0; ; from += 500) {
    const { data: chunks } = await svc
      .from('document_chunks')
      .select('source_id, content, embedding, token_count, chunk_index')
      .eq('bot_id', demoBotId)
      .range(from, from + 499)
    if (!chunks?.length) break
    const rows = chunks
      .filter((c) => sourceMap.has(c.source_id as string))
      .map((c) => ({ ...c, bot_id: bot.id, source_id: sourceMap.get(c.source_id as string) }))
    if (rows.length) {
      const { error: chunkErr } = await svc.from('document_chunks').insert(rows)
      if (chunkErr) return { error: `Knowledge copy failed: ${chunkErr.message}` }
    }
    if (chunks.length < 500) break
  }

  // Product index: copy rows wholesale — skips the expensive first sync.
  for (let from = 0; ; from += 200) {
    const { data: prods } = await svc
      .from('product_embeddings')
      .select('external_id, title, url, image_url, tags, audience, doc, embedding, raw_hash, synced_at')
      .eq('bot_id', demoBotId)
      .range(from, from + 199)
    if (!prods?.length) break
    const { error: prodErr } = await svc
      .from('product_embeddings')
      .insert(prods.map((p) => ({ ...p, bot_id: bot.id })))
    if (prodErr) return { error: `Product index copy failed: ${prodErr.message}` }
    if (prods.length < 200) break
  }

  return { id: bot.id }
}
