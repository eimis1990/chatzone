import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import { hasDbEnv, serviceClient } from './db'
import { ingestSource, makeServiceRepo } from '@/lib/ingestion/pipeline'
import { retrieveContext, serviceRetrievalDeps } from '@/lib/ai/retrieval'
import type { KnowledgeSource } from '@/lib/types'

// Real OpenAI + DB end-to-end RAG check. Costs a few embedding calls, so it is
// gated behind RUN_LIVE_AI=1 in addition to DB env. Run once to verify:
//   RUN_LIVE_AI=1 npm run test -- tests/integration/rag.test.ts
const live = hasDbEnv && process.env.RUN_LIVE_AI === '1'
const d = live ? describe : describe.skip
const stamp = Date.now()

d('RAG end-to-end (live embeddings)', () => {
  const svc = live ? serviceClient() : (null as unknown as SupabaseClient)
  let orgId = ''
  let botId = ''
  let sourceId = ''

  beforeAll(async () => {
    const { data: org } = await svc
      .from('organizations')
      .insert({ name: `RAG-${stamp}` })
      .select('id')
      .single()
    orgId = org!.id
    const { data: bot } = await svc
      .from('bots')
      .insert({ org_id: orgId, name: 'RagBot' })
      .select('id')
      .single()
    botId = bot!.id
    const { data: src } = await svc
      .from('knowledge_sources')
      .insert({
        bot_id: botId,
        type: 'text',
        name: 'policy',
        metadata: {
          content:
            'Acme Corp offers free worldwide shipping on all orders over fifty dollars. ' +
            'Our customer support team is available Monday to Friday, 9am to 5pm Eastern Time. ' +
            'Returns are accepted within 30 days of purchase for a full refund.',
        },
      })
      .select('id')
      .single()
    sourceId = src!.id
  }, 30000)

  afterAll(async () => {
    if (live) await svc.from('organizations').delete().eq('id', orgId)
  }, 30000)

  it('ingests a text source into embedded chunks', async () => {
    await ingestSource(sourceId, { repo: makeServiceRepo(svc) })
    const { data: source } = await svc
      .from('knowledge_sources')
      .select('status')
      .eq('id', sourceId)
      .single<Pick<KnowledgeSource, 'status'>>()
    expect(source?.status).toBe('ready')
    const { count } = await svc
      .from('document_chunks')
      .select('*', { count: 'exact', head: true })
      .eq('source_id', sourceId)
    expect(count ?? 0).toBeGreaterThan(0)
  }, 60000)

  it('retrieves relevant context for a related question', async () => {
    const res = await retrieveContext(botId, 'When can I reach support?', {}, serviceRetrievalDeps(svc))
    expect(res.isWeak).toBe(false)
    expect(res.chunks.map((c) => c.content).join(' ')).toMatch(/support|9am|Friday/i)
  }, 60000)

  it('flags weak retrieval for an unrelated question', async () => {
    const res = await retrieveContext(
      botId,
      'What is the airspeed velocity of an unladen swallow?',
      { minSimilarity: 0.5 },
      serviceRetrievalDeps(svc),
    )
    expect(res.isWeak).toBe(true)
  }, 60000)
})
