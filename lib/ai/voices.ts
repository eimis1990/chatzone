import { MissingVoiceKeyError } from '@/lib/ai/tts'

export interface VoiceOption {
  id: string
  name: string
  previewUrl?: string
}

export interface VoicesDeps {
  apiKey?: string
  fetchImpl?: typeof fetch
}

const ELEVENLABS_VOICES_URL = 'https://api.elevenlabs.io/v1/voices'

/** Lists the available ElevenLabs voices for the configurator picker. */
export async function listVoices(deps: VoicesDeps = {}): Promise<VoiceOption[]> {
  const apiKey = deps.apiKey ?? process.env.ELEVENLABS_API_KEY
  if (!apiKey) throw new MissingVoiceKeyError()
  const fetchImpl = deps.fetchImpl ?? fetch

  const res = await fetchImpl(ELEVENLABS_VOICES_URL, {
    headers: { 'xi-api-key': apiKey },
  })
  if (!res.ok) throw new Error(`ElevenLabs voices failed: HTTP ${res.status}`)

  const data = (await res.json()) as {
    voices: Array<{ voice_id: string; name: string; preview_url?: string }>
  }
  return data.voices.map((v) => ({
    id: v.voice_id,
    name: v.name,
    ...(v.preview_url ? { previewUrl: v.preview_url } : {}),
  }))
}
