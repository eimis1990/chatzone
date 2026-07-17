import { getEnv } from '@/lib/env'

/** Cap uploads well below Whisper's 25MB limit — ~60s of webm speech is <1MB. */
export const MAX_AUDIO_BYTES = 5 * 1024 * 1024

/**
 * Speech-to-text via OpenAI Whisper. `language` is an ISO-639-1 hint (en/lt)
 * that improves accuracy; omit to autodetect.
 */
export async function transcribeAudio(audio: File, language?: string): Promise<string> {
  const form = new FormData()
  form.append('file', audio, audio.name || 'audio.webm')
  form.append('model', 'whisper-1')
  if (language) form.append('language', language)

  const res = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${getEnv().OPENAI_API_KEY}` },
    body: form,
  })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`Whisper HTTP ${res.status}: ${body.slice(0, 200)}`)
  }
  const data = (await res.json()) as { text?: string }
  return (data.text ?? '').trim()
}
