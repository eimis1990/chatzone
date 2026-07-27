import { describe, it, expect, vi } from 'vitest'

const rows: { id: string; prompt_id: string; content: string }[] = []
vi.mock('@/lib/supabase/service', () => ({
  createServiceClient: () => ({
    from: () => ({
      select: () => ({
        in: async (_col: string, ids: string[]) => ({
          data: rows.filter((r) => ids.includes(r.id)),
          error: null,
        }),
      }),
    }),
  }),
}))

import { resolvePromptVersionSnapshot } from '@/lib/prompt-versions'
import { botConfigSchema, defaultBotConfig } from '@/lib/validation/schemas'
import type { BotConfig } from '@/lib/types'

const FAMILY = '11111111-1111-4111-8111-111111111111'
const OTHER_FAMILY = '22222222-2222-4222-8222-222222222222'
const V1 = '33333333-3333-4333-8333-333333333333'
const V2 = '44444444-4444-4444-8444-444444444444'

function cfg(extra: Partial<BotConfig>): BotConfig {
  return { ...(defaultBotConfig('Bot') as BotConfig), ...extra }
}

describe('botConfigSchema version pointers', () => {
  it('accepts and keeps both version pointer fields', () => {
    const parsed = botConfigSchema.parse({
      displayName: 'Bot',
      greeting: 'Hi',
      systemPrompt: 'You are helpful.',
      systemPromptId: FAMILY,
      systemPromptVersionId: V1,
      previewSystemPromptVersionId: V2,
    })
    expect(parsed.systemPromptVersionId).toBe(V1)
    expect(parsed.previewSystemPromptVersionId).toBe(V2)
  })
})

describe('resolvePromptVersionSnapshot', () => {
  it('drops stray pointers when the bot has no library link', async () => {
    const config = cfg({ systemPromptVersionId: V1, previewSystemPromptVersionId: V2 })
    delete config.systemPromptId
    expect(await resolvePromptVersionSnapshot(config)).toBeNull()
    expect(config.systemPromptVersionId).toBeUndefined()
    expect(config.previewSystemPromptVersionId).toBeUndefined()
  })

  it('re-snapshots the live version content', async () => {
    rows.length = 0
    rows.push({ id: V1, prompt_id: FAMILY, content: 'v1 content' })
    const config = cfg({ systemPromptId: FAMILY, systemPromptVersionId: V1, systemPrompt: 'stale' })
    expect(await resolvePromptVersionSnapshot(config)).toBeNull()
    expect(config.systemPrompt).toBe('v1 content')
  })

  it('rejects a version from a different prompt family', async () => {
    rows.length = 0
    rows.push({ id: V1, prompt_id: OTHER_FAMILY, content: 'other family' })
    const config = cfg({ systemPromptId: FAMILY, systemPromptVersionId: V1 })
    expect(await resolvePromptVersionSnapshot(config)).toMatch(/does not belong/)
  })

  it('rejects an unknown preview version id', async () => {
    rows.length = 0
    const config = cfg({ systemPromptId: FAMILY, previewSystemPromptVersionId: V2 })
    expect(await resolvePromptVersionSnapshot(config)).toMatch(/does not belong/)
  })
})
