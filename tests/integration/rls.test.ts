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
  let contentItem = ''
  let publicationItem = ''

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

    const { error: contentSettingsError } = await svc.from('content_studio_settings').insert({
      owner_id: ids.owner,
      proactive_suggestions: true,
      default_approval_mode: 'review',
    })
    if (contentSettingsError) throw contentSettingsError
    const { error: publicationTargetError } = await svc.from('content_publication_targets').insert({
      owner_id: ids.owner,
      provider: 'linkedin',
      slot_key: 'default',
      enabled: true,
      approval_mode: 'review',
      content_types: ['social_post'],
    })
    if (publicationTargetError) throw publicationTargetError

    const { data: item, error: itemError } = await svc
      .from('content_items')
      .insert({
        created_by: ids.owner,
        title: 'Content package transaction test',
        target_query: 'content package transaction test',
      })
      .select('id')
      .single()
    if (itemError) throw itemError
    contentItem = item!.id

    const { data: run, error: runError } = await svc
      .from('content_generation_runs')
      .insert({
        content_item_id: contentItem,
        operation: 'draft',
        status: 'in_progress',
      })
      .select('id')
      .single()
    if (runError) throw runError

    const { error: applyError } = await svc.rpc('apply_content_generation_result', {
      p_content_item_id: contentItem,
      p_expected_revision: 1,
      p_run_id: run!.id,
      p_result: {
        title: 'Generated package',
        description: 'A generated package used to verify atomic persistence and tenant isolation.',
        markdown: '## Verified\n\nThe package was persisted atomically.',
        related_slugs: ['how-ai-product-discovery-works'],
        cover_image_alt: 'Abstract product discovery illustration',
        cover_image_prompt: 'Text-free editorial illustration',
        cover_image_path: '',
      },
      p_sources: [{
        url: 'https://example.com/research',
        title: 'Research source',
        publisher: 'Example',
        excerpt: 'Evidence used by the generated package.',
        source_kind: 'web',
        fetched_at: new Date().toISOString(),
      }],
      p_variants: [{
        provider: 'linkedin',
        slot_key: 'default',
        content_type: 'social_post',
        status: 'draft',
        headline: 'Generated package',
        body: 'A review-gated LinkedIn draft.',
        hashtags: ['ContentOps', 'AI'],
        image_prompt: 'Text-free social illustration',
      }],
      p_run_output: { source_count: 1, variant_count: 1 },
    })
    if (applyError) throw applyError

    const { data: publishable, error: publishableError } = await svc
      .from('content_items')
      .insert({
        created_by: ids.owner,
        status: 'ready',
        title: 'Publication transaction test',
        target_query: 'publication transaction test',
      })
      .select('id')
      .single()
    if (publishableError) throw publishableError
    publicationItem = publishable!.id

    const { data: publicationRun, error: publicationRunError } = await svc
      .from('content_generation_runs')
      .insert({
        content_item_id: publicationItem,
        operation: 'publish',
        status: 'in_progress',
      })
      .select('id')
      .single()
    if (publicationRunError) throw publicationRunError

    const { error: publicationApplyError } = await svc.rpc('apply_content_publication_result', {
      p_content_item_id: publicationItem,
      p_expected_revision: 1,
      p_run_id: publicationRun!.id,
      p_pull_request_url: 'https://github.com/eimis1990/chatzone/pull/42',
      p_pull_request_number: 42,
      p_publication_branch: 'content/2026-08-07-publication-transaction-test',
      p_publication_commit_sha: 'a'.repeat(40),
      p_publication_base_sha: 'b'.repeat(40),
      p_run_output: { reused: false },
    })
    if (publicationApplyError) throw publicationApplyError
  }, 30000)

  afterAll(async () => {
    if (!hasDbEnv) return
    if (contentItem) await svc.from('content_items').delete().eq('id', contentItem)
    if (publicationItem) await svc.from('content_items').delete().eq('id', publicationItem)
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

  it('keeps Content Studio automation settings owner-only and server-managed', async () => {
    const [owner, client, anonymous] = await Promise.all([
      signedInClient(emails.owner, PW),
      signedInClient(emails.clientA, PW),
      Promise.resolve(anonClient()),
    ])
    const [ownerSettings, ownerTargets, clientSettings, anonTargets] = await Promise.all([
      owner.from('content_studio_settings').select('owner_id, default_approval_mode'),
      owner.from('content_publication_targets').select('provider, approval_mode'),
      client.from('content_studio_settings').select('owner_id'),
      anonymous.from('content_publication_targets').select('id'),
    ])

    expect(ownerSettings.error).toBeNull()
    expect(ownerSettings.data).toEqual([{ owner_id: ids.owner, default_approval_mode: 'review' }])
    expect(ownerTargets.data).toEqual([{ provider: 'linkedin', approval_mode: 'review' }])
    expect(clientSettings.data ?? []).toHaveLength(0)
    expect(anonTargets.error).not.toBeNull()

    const { error: directUpdateError } = await owner
      .from('content_studio_settings')
      .update({ default_approval_mode: 'auto_publish' })
      .eq('owner_id', ids.owner)
    expect(directUpdateError).not.toBeNull()
  })

  it('rejects content types that a publication provider cannot accept', async () => {
    const { error } = await svc.from('content_publication_targets').insert({
      owner_id: ids.owner,
      provider: 'youtube',
      slot_key: 'invalid-article-test',
      content_types: ['article'],
    })

    expect(error?.message).toContain('content_publication_targets_provider_content_types_check')
  })

  it('persists generated sources and destination drafts atomically and keeps them owner-only', async () => {
    const [owner, client, anonymous] = await Promise.all([
      signedInClient(emails.owner, PW),
      signedInClient(emails.clientA, PW),
      Promise.resolve(anonClient()),
    ])
    const [ownerItem, ownerSources, ownerVariants, clientVariants, anonVariants] = await Promise.all([
      owner.from('content_items').select('status, revision').eq('id', contentItem).single(),
      owner.from('content_sources').select('url').eq('content_item_id', contentItem),
      owner.from('content_variants').select('provider, status, hashtags').eq('content_item_id', contentItem),
      client.from('content_variants').select('id').eq('content_item_id', contentItem),
      anonymous.from('content_variants').select('id').eq('content_item_id', contentItem),
    ])

    expect(ownerItem.data).toEqual({ status: 'drafting', revision: 2 })
    expect(ownerSources.data).toEqual([{ url: 'https://example.com/research' }])
    expect(ownerVariants.data).toEqual([{
      provider: 'linkedin',
      status: 'draft',
      hashtags: ['ContentOps', 'AI'],
    }])
    expect(clientVariants.data ?? []).toHaveLength(0)
    expect(anonVariants.error).not.toBeNull()

    const { error: directInsertError } = await owner.from('content_variants').insert({
      content_item_id: contentItem,
      provider: 'facebook',
      body: 'Clients cannot bypass the server-managed generation transaction.',
    })
    expect(directInsertError).not.toBeNull()
  })

  it('persists the draft PR identifiers and publish run atomically', async () => {
    const owner = await signedInClient(emails.owner, PW)
    const [publishedItem, publishRun] = await Promise.all([
      owner
        .from('content_items')
        .select('status, revision, pull_request_number, publication_branch, publication_commit_sha')
        .eq('id', publicationItem)
        .single(),
      owner
        .from('content_generation_runs')
        .select('status, output')
        .eq('content_item_id', publicationItem)
        .eq('operation', 'publish')
        .single(),
    ])

    expect(publishedItem.data).toEqual({
      status: 'pr_open',
      revision: 2,
      pull_request_number: 42,
      publication_branch: 'content/2026-08-07-publication-transaction-test',
      publication_commit_sha: 'a'.repeat(40),
    })
    expect(publishRun.data).toEqual({ status: 'succeeded', output: { reused: false } })
  })
})
