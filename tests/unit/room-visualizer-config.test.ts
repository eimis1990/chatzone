import { describe, it, expect } from 'vitest'
import { botConfigSchema } from '@/lib/validation/schemas'
import { publicBotConfig } from '@/lib/widget-config'

// Minimal valid config, mirroring tests/unit/quick-actions.test.ts baseConfig.
function baseConfig(overrides: Record<string, unknown> = {}) {
  return botConfigSchema.parse({
    displayName: 'Bot',
    greeting: 'Hi',
    systemPrompt: 'You are helpful.',
    ...overrides,
  })
}

describe('roomVisualizer config flag', () => {
  it('defaults to false', () => {
    expect(baseConfig().roomVisualizer).toBe(false)
    expect(publicBotConfig(baseConfig()).roomVisualizer).toBe(false)
  })

  it('is exposed publicly when enabled', () => {
    const cfg = baseConfig({ roomVisualizer: true })
    expect(publicBotConfig(cfg).roomVisualizer).toBe(true)
  })
})
