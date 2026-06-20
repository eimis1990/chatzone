// @vitest-environment node
import { describe, it, expect, afterAll } from 'vitest'
import { serviceClient } from './db'
import {
  buildAgentConfig,
  ensureLlmAuth,
  getConversationToken,
} from '@/lib/ai/elevenlabs-agent'
import { defaultBotConfig } from '@/lib/validation/schemas'
import type { Bot } from '@/lib/types'

const live = process.env.RUN_LIVE_AI === '1' && !!process.env.ELEVENLABS_API_KEY
const d = live ? describe : describe.skip
const API = 'https://api.elevenlabs.io/v1'
const key = process.env.ELEVENLABS_API_KEY ?? ''

d('ElevenLabs Agents lifecycle (live)', () => {
  let agentId = ''
  let secretId = ''

  afterAll(async () => {
    if (agentId) {
      await fetch(`${API}/convai/agents/${agentId}`, {
        method: 'DELETE',
        headers: { 'xi-api-key': key },
      })
    }
    // Clear cached settings so other runs re-provision cleanly.
    const svc = serviceClient()
    await svc.from('platform_settings').delete().in('key', ['cbz_llm_token', 'elevenlabs_llm_secret_id'])
  }, 30000)

  it('provisions a workspace secret, creates an agent, and mints a token', async () => {
    const svc = serviceClient()
    await svc.from('platform_settings').delete().in('key', ['cbz_llm_token', 'elevenlabs_llm_secret_id'])

    const auth = await ensureLlmAuth(svc)
    secretId = auth.secretId
    expect(auth.token).toBeTruthy()
    expect(secretId).toBeTruthy()

    const bot = {
      id: 'test-bot',
      public_key: 'livetestkey',
      config: defaultBotConfig('Live Test Bot'),
    } as Bot
    const config = buildAgentConfig(bot, 'https://example.com', secretId)

    const res = await fetch(`${API}/convai/agents/create`, {
      method: 'POST',
      headers: { 'xi-api-key': key, 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    })
    expect(res.ok).toBe(true)
    const data = (await res.json()) as { agent_id: string }
    agentId = data.agent_id
    expect(agentId).toBeTruthy()

    const token = await getConversationToken(agentId)
    expect(token).toBeTruthy()
  }, 60000)
})
