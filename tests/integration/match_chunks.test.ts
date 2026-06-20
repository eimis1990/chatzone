import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import { hasDbEnv, serviceClient } from './db'

const d = hasDbEnv ? describe : describe.skip
const stamp = Date.now()

// Build a 1536-dim vector that is mostly zeros with a 1 at `slot`.
function unitVec(slot: number): number[] {
  const v = new Array(1536).fill(0)
  v[slot] = 1
  return v
}

d('match_chunks RPC', () => {
  const svc = hasDbEnv ? serviceClient() : (null as unknown as SupabaseClient)
  let orgId = ''
  let botId = ''
  let otherBotId = ''
  let sourceId = ''

  beforeAll(async () => {
    const { data: org } = await svc
      .from('organizations')
      .insert({ name: `OrgMC-${stamp}` })
      .select('id')
      .single()
    orgId = org!.id

    const { data: bot } = await svc
      .from('bots')
      .insert({ org_id: orgId, name: 'MCBot' })
      .select('id')
      .single()
    botId = bot!.id

    const { data: other } = await svc
      .from('bots')
      .insert({ org_id: orgId, name: 'OtherBot' })
      .select('id')
      .single()
    otherBotId = other!.id

    const { data: src } = await svc
      .from('knowledge_sources')
      .insert({ bot_id: botId, type: 'text', name: 'seed', status: 'ready' })
      .select('id')
      .single()
    sourceId = src!.id

    await svc.from('document_chunks').insert([
      { bot_id: botId, source_id: sourceId, content: 'alpha', chunk_index: 0, embedding: unitVec(0) },
      { bot_id: botId, source_id: sourceId, content: 'beta', chunk_index: 1, embedding: unitVec(1) },
      { bot_id: botId, source_id: sourceId, content: 'gamma', chunk_index: 2, embedding: unitVec(2) },
    ])

    // A chunk on a different bot that must never surface.
    const { data: otherSrc } = await svc
      .from('knowledge_sources')
      .insert({ bot_id: otherBotId, type: 'text', name: 'seed2', status: 'ready' })
      .select('id')
      .single()
    await svc.from('document_chunks').insert({
      bot_id: otherBotId,
      source_id: otherSrc!.id,
      content: 'foreign',
      chunk_index: 0,
      embedding: unitVec(0),
    })
  }, 30000)

  afterAll(async () => {
    if (!hasDbEnv) return
    await svc.from('organizations').delete().eq('id', orgId)
  }, 30000)

  it('returns the most similar chunk first', async () => {
    const { data, error } = await svc.rpc('match_chunks', {
      p_bot_id: botId,
      p_query_embedding: unitVec(0),
      p_match_count: 3,
      p_min_similarity: 0,
    })
    expect(error).toBeNull()
    expect(data![0].content).toBe('alpha')
    expect(data![0].similarity).toBeGreaterThan(0.99)
  })

  it('respects p_match_count', async () => {
    const { data } = await svc.rpc('match_chunks', {
      p_bot_id: botId,
      p_query_embedding: unitVec(1),
      p_match_count: 1,
      p_min_similarity: 0,
    })
    expect(data).toHaveLength(1)
    expect(data![0].content).toBe('beta')
  })

  it('never returns another bot’s chunks', async () => {
    const { data } = await svc.rpc('match_chunks', {
      p_bot_id: botId,
      p_query_embedding: unitVec(0),
      p_match_count: 10,
      p_min_similarity: 0,
    })
    expect((data ?? []).every((r: { content: string }) => r.content !== 'foreign')).toBe(true)
  })
})
