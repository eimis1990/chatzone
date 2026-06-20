// @vitest-environment node
// (jsdom's Blob/FormData polyfills break undici multipart uploads to Whisper)
import { describe, it, expect } from 'vitest'
import { synthesizeSpeech } from '@/lib/ai/tts'
import { transcribeAudio } from '@/lib/ai/stt'
import { listVoices } from '@/lib/ai/voices'

// Live voice check (real ElevenLabs + OpenAI). Gated behind RUN_LIVE_AI=1 and the
// presence of ELEVENLABS_API_KEY. Run:
//   RUN_LIVE_AI=1 npm run test -- tests/integration/voice.test.ts
const live = process.env.RUN_LIVE_AI === '1' && !!process.env.ELEVENLABS_API_KEY
const d = live ? describe : describe.skip

// Live network calls occasionally reset; retry transient failures a couple times.
async function withRetry<T>(fn: () => Promise<T>, attempts = 3): Promise<T> {
  let lastErr: unknown
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn()
    } catch (err) {
      lastErr = err
    }
  }
  throw lastErr
}

d('voice end-to-end (live)', () => {
  it('lists ElevenLabs voices', async () => {
    const voices = await listVoices()
    expect(voices.length).toBeGreaterThan(0)
    expect(voices[0]).toHaveProperty('id')
    expect(voices[0]).toHaveProperty('name')
  }, 30000)

  it('synthesizes speech then transcribes it back (TTS → STT round-trip)', async () => {
    const audio = await withRetry(() =>
      synthesizeSpeech('Hello world, this is a test.', '21m00Tcm4TlvDq8ikWAM'),
    )
    expect(audio.byteLength).toBeGreaterThan(1000)
    const text = await withRetry(() =>
      transcribeAudio(new Blob([audio], { type: 'audio/mpeg' })),
    )
    expect(text.toLowerCase()).toMatch(/hello|test/)
  }, 90000)
})
