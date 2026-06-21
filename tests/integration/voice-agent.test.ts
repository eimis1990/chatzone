// @vitest-environment node
import { describe, it, expect, afterAll } from 'vitest'
import { buildAgentConfig, getConversationToken } from '@/lib/ai/elevenlabs-agent'
import { defaultBotConfig } from '@/lib/validation/schemas'
import type { Bot } from '@/lib/types'

const live = process.env.RUN_LIVE_AI === '1' && !!process.env.ELEVENLABS_API_KEY
const d = live ? describe : describe.skip
const API = 'https://api.elevenlabs.io/v1'
const key = process.env.ELEVENLABS_API_KEY ?? ''

d('ElevenLabs Agents lifecycle (live)', () => {
  let agentId = ''

  afterAll(async () => {
    if (agentId) {
      await fetch(`${API}/convai/agents/${agentId}`, {
        method: 'DELETE',
        headers: { 'xi-api-key': key },
      })
    }
  }, 30000)

  it('creates a built-in-LLM agent and mints a conversation token', async () => {
    const bot = {
      id: 'test-bot',
      public_key: 'livetestkey',
      config: defaultBotConfig('Live Test Bot'),
    } as Bot
    const config = buildAgentConfig(bot)
    expect(config.conversation_config.agent.prompt.llm).toBe('gpt-4o-mini')

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
