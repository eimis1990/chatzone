export interface SttDeps {
  apiKey?: string
  fetchImpl?: typeof fetch
  model?: string
}

const OPENAI_TRANSCRIPTION_URL = 'https://api.openai.com/v1/audio/transcriptions'

/**
 * Transcribes audio to text using OpenAI Whisper. Accepts a Blob (browser/route
 * upload). `deps` are injectable for testing.
 */
export async function transcribeAudio(audio: Blob, deps: SttDeps = {}): Promise<string> {
  const apiKey = deps.apiKey ?? process.env.OPENAI_API_KEY
  if (!apiKey) throw new Error('OPENAI_API_KEY is not configured')
  const fetchImpl = deps.fetchImpl ?? fetch
  const model = deps.model ?? 'whisper-1'

  const form = new FormData()
  form.append('file', audio, 'audio.webm')
  form.append('model', model)

  const res = await fetchImpl(OPENAI_TRANSCRIPTION_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form,
  })

  if (!res.ok) {
    throw new Error(`Whisper transcription failed: HTTP ${res.status}`)
  }
  const data = (await res.json()) as { text: string }
  return data.text
}
