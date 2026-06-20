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
})
