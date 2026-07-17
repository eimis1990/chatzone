import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import { hasDbEnv, serviceClient } from './db'

const d = hasDbEnv ? describe : describe.skip
const stamp = Date.now()

function unitVec(): number[] {
  const vector = new Array(1536).fill(0)
  vector[0] = 1
  return vector
}

d('provider-specific product ranking RPCs', () => {
  const svc = hasDbEnv ? serviceClient() : (null as unknown as SupabaseClient)
  let orgId = ''
  let botId = ''

  beforeAll(async () => {
    const { data: org, error: orgError } = await svc
      .from('organizations')
      .insert({ name: `ProductRanking-${stamp}` })
      .select('id')
      .single()
    if (orgError) throw orgError
    orgId = org.id

    const { data: bot, error: botError } = await svc
      .from('bots')
      .insert({ org_id: orgId, name: 'Product ranking test' })
      .select('id')
      .single()
    if (botError) throw botError
    botId = bot.id

    const embedding = unitVec()
    const { error } = await svc.from('product_embeddings').insert([
      {
        bot_id: botId,
        external_id: 'white-chair',
        title: 'Kėdė WHITE',
        doc: 'Kėdė WHITE\nCategories: Valgomojo baldai, Kėdės\nAttributes: Spalva: Balta; Kojų spalva: Juoda',
        embedding,
      },
      {
        bot_id: botId,
        external_id: 'green-chair',
        title: 'Kėdė GREEN',
        doc: 'Kėdė GREEN\nCategories: Valgomojo baldai, Kėdės\nAttributes: Spalva: Žalia; Kojų spalva: Juoda',
        embedding,
      },
      {
        bot_id: botId,
        external_id: 'white-legs-chair',
        title: 'Kėdė LEGS',
        doc: 'Kėdė LEGS\nCategories: Valgomojo baldai, Kėdės\nAttributes: Spalva: Beige; Kojų spalva: Balta',
        embedding,
      },
      {
        bot_id: botId,
        external_id: 'white-table',
        title: 'Kavos staliukas',
        doc: 'Kavos staliukas\nCategories: Svetainės baldai\nAttributes: Spalva: Balta',
        embedding,
      },
    ])
    if (error) throw error
  }, 30_000)

  afterAll(async () => {
    if (orgId) await svc.from('organizations').delete().eq('id', orgId)
  }, 30_000)

  it('ranks the main-color match above component colors and unrelated furniture', async () => {
    const { data, error } = await svc.rpc('match_products_verskis', {
      p_bot_id: botId,
      p_embedding: unitVec(),
      p_query_text: 'virtuvinių kėdžių baltos spalvos',
      p_k: 4,
      p_audience: null,
    })

    expect(error).toBeNull()
    expect(data?.map((row: { external_id: string }) => row.external_id)).toEqual([
      'white-chair',
      'white-legs-chair',
      'green-chair',
      'white-table',
    ])
  })

  it('keeps the provider-neutral matcher independently callable', async () => {
    const { data, error } = await svc.rpc('match_products', {
      p_bot_id: botId,
      p_embedding: unitVec(),
      p_query_text: 'white chairs',
      p_k: 4,
      p_audience: null,
    })

    expect(error).toBeNull()
    expect(data).toHaveLength(4)
  })
})
