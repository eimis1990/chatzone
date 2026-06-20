/** Thrown when a voice operation needs ELEVENLABS_API_KEY but it isn't configured. */
export class MissingVoiceKeyError extends Error {
  constructor() {
    super('ELEVENLABS_API_KEY is not configured')
    this.name = 'MissingVoiceKeyError'
  }
}

export interface TtsDeps {
  apiKey?: string
  fetchImpl?: typeof fetch
  model?: string
}

const ELEVENLABS_TTS_URL = 'https://api.elevenlabs.io/v1/text-to-speech'

/**
 * Synthesizes speech from text using ElevenLabs, returning MP3 audio bytes.
 * `deps` are injectable for testing.
 */
export async function synthesizeSpeech(
  text: string,
  voiceId: string,
  deps: TtsDeps = {},
): Promise<ArrayBuffer> {
  const apiKey = deps.apiKey ?? process.env.ELEVENLABS_API_KEY
  if (!apiKey) throw new MissingVoiceKeyError()
  const fetchImpl = deps.fetchImpl ?? fetch
  const model = deps.model ?? 'eleven_turbo_v2_5'

  const res = await fetchImpl(`${ELEVENLABS_TTS_URL}/${voiceId}`, {
    method: 'POST',
    headers: {
      'xi-api-key': apiKey,
      'Content-Type': 'application/json',
      Accept: 'audio/mpeg',
    },
    body: JSON.stringify({ text, model_id: model }),
  })

  if (!res.ok) {
    throw new Error(`ElevenLabs TTS failed: HTTP ${res.status}`)
  }
  return res.arrayBuffer()
}
