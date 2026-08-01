import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import { hasDbEnv, serviceClient, signedInClient, anonClient } from './db'

// Integration test against a real Supabase project. Skips entirely when no
// .env.local credentials are present, so the unit suite stays green offline.
const d = hasDbEnv ? describe : describe.skip

const PW = 'Test-Passw0rd!'
const stamp = Date.now()
const emails = {
  owner: `owner-${stamp}@cbz.test`,
  clientA: `clienta-${stamp}@cbz.test`,
  clientB: `clientb-${stamp}@cbz.test`,
}

d('RLS tenancy isolation', () => {
  const svc = hasDbEnv ? serviceClient() : (null as unknown as SupabaseClient)
  const ids: Record<string, string> = {}
  let botA = ''
  let botB = ''
  let planA = ''
  let planB = ''

  beforeAll(async () => {
    // Create three auth users (profiles auto-created by trigger).
    for (const key of ['owner', 'clientA', 'clientB'] as const) {
      const { data, error } = await svc.auth.admin.createUser({
        email: emails[key],
        password: PW,
        email_confirm: true,
      })
      if (error) throw error
      ids[key] = data.user.id
    }
    // Promote the owner.
    await svc.from('profiles').update({ role: 'owner' }).eq('id', ids.owner)

    // Two organizations + memberships.
    const { data: orgA } = await svc
      .from('organizations')
      .insert({ name: `OrgA-${stamp}`, created_by: ids.owner })
      .select('id')
      .single()
    const { data: orgB } = await svc
      .from('organizations')
      .insert({ name: `OrgB-${stamp}`, created_by: ids.owner })
      .select('id')
      .single()
    ids.orgA = orgA!.id
    ids.orgB = orgB!.id

    await svc.from('organization_members').insert([
      { org_id: ids.orgA, user_id: ids.clientA, role: 'admin' },
      { org_id: ids.orgB, user_id: ids.clientB, role: 'admin' },
    ])

    const { data: bA } = await svc
      .from('bots')
      .insert({ org_id: ids.orgA, name: 'BotA' })
      .select('id')
      .single()
    const { data: bB } = await svc
      .from('bots')
      .insert({ org_id: ids.orgB, name: 'BotB' })
      .select('id')
      .single()
    botA = bA!.id
    botB = bB!.id

    const { data: plans, error: planError } = await svc
      .from('demand_action_plans')
      .insert([
        {
          bot_id: botA,
          opportunity_key: `plan-a-${stamp}`,
          opportunity_title: 'Plan A',
          issue_type: 'product_gap',
          selected_actions: ['add_missing_synonym'],
        },
        {
          bot_id: botB,
          opportunity_key: `plan-b-${stamp}`,
          opportunity_title: 'Plan B',
          issue_type: 'product_gap',
          selected_actions: ['add_missing_synonym'],
        },
      ])
      .select('id, bot_id')
    if (planError) throw planError
    planA = plans!.find((plan) => plan.bot_id === botA)!.id
    planB = plans!.find((plan) => plan.bot_id === botB)!.id

    const { error: synonymError } = await svc.from('product_search_synonyms').insert([
      { bot_id: botA, phrase: `couch-a-${stamp}`, replacement: 'sofa', action_plan_id: planA },
      { bot_id: botB, phrase: `couch-b-${stamp}`, replacement: 'sofa', action_plan_id: planB },
    ])
    if (synonymError) throw synonymError
  }, 30000)

  afterAll(async () => {
    if (!hasDbEnv) return
    await svc.from('organizations').delete().in('id', [ids.orgA, ids.orgB])
    for (const key of ['owner', 'clientA', 'clientB'] as const) {
      if (ids[key]) await svc.auth.admin.deleteUser(ids[key])
    }
  }, 30000)

  it('client A sees only its own org bot', async () => {
    const a = await signedInClient(emails.clientA, PW)
    const { data } = await a.from('bots').select('id')
    const visible = (data ?? []).map((r) => r.id)
    expect(visible).toContain(botA)
    expect(visible).not.toContain(botB)
  })

  it('client B sees only its own org bot', async () => {
    const b = await signedInClient(emails.clientB, PW)
    const { data } = await b.from('bots').select('id')
    const visible = (data ?? []).map((r) => r.id)
    expect(visible).toContain(botB)
    expect(visible).not.toContain(botA)
  })

  it('owner sees both bots', async () => {
    const o = await signedInClient(emails.owner, PW)
    const { data } = await o.from('bots').select('id')
    const visible = (data ?? []).map((r) => r.id)
    expect(visible).toContain(botA)
    expect(visible).toContain(botB)
  })

  it('anonymous sees no bots', async () => {
    const anon = anonClient()
    const { data } = await anon.from('bots').select('id')
    expect(data ?? []).toHaveLength(0)
  })

  it('client A cannot insert a bot into org B', async () => {
    const a = await signedInClient(emails.clientA, PW)
    const { error } = await a.from('bots').insert({ org_id: ids.orgB, name: 'evil' })
    expect(error).not.toBeNull()
  })

  it('scopes Demand Radar plans and synonyms to the bot organization', async () => {
    const a = await signedInClient(emails.clientA, PW)
    const [{ data: plans }, { data: synonyms }] = await Promise.all([
      a.from('demand_action_plans').select('id'),
      a.from('product_search_synonyms').select('action_plan_id'),
    ])

    expect((plans ?? []).map((plan) => plan.id)).toContain(planA)
    expect((plans ?? []).map((plan) => plan.id)).not.toContain(planB)
    expect((synonyms ?? []).map((synonym) => synonym.action_plan_id)).toContain(planA)
    expect((synonyms ?? []).map((synonym) => synonym.action_plan_id)).not.toContain(planB)
  })

  it('rejects cross-organization Demand Radar writes', async () => {
    const a = await signedInClient(emails.clientA, PW)
    const { error } = await a.from('demand_action_plans').insert({
      bot_id: botB,
      opportunity_key: `evil-${stamp}`,
      opportunity_title: 'Cross-org plan',
      issue_type: 'product_gap',
      selected_actions: ['fix_product_attributes'],
    })
    expect(error).not.toBeNull()
  })

  it('keeps Demand Radar plans and synonyms hidden from anonymous users', async () => {
    const anon = anonClient()
    const [{ data: plans, error: planError }, { data: synonyms, error: synonymError }] = await Promise.all([
      anon.from('demand_action_plans').select('id'),
      anon.from('product_search_synonyms').select('id'),
    ])

    expect(plans ?? []).toHaveLength(0)
    expect(synonyms ?? []).toHaveLength(0)
    expect(planError).not.toBeNull()
    expect(synonymError).not.toBeNull()
  })
})
