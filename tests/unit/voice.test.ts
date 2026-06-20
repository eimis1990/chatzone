import { describe, it, expect, vi } from 'vitest'
import { synthesizeSpeech, MissingVoiceKeyError } from '@/lib/ai/tts'
import { transcribeAudio } from '@/lib/ai/stt'
import { listVoices } from '@/lib/ai/voices'

describe('synthesizeSpeech (ElevenLabs TTS)', () => {
  it('posts to the voice endpoint and returns audio bytes', async () => {
    const audio = new Uint8Array([1, 2, 3]).buffer
    const fetchImpl = vi.fn(async () => new Response(audio, { status: 200 }))
    const out = await synthesizeSpeech('hello', 'voice-123', {
      apiKey: 'k',
      fetchImpl: fetchImpl as unknown as typeof fetch,
    })
    expect(new Uint8Array(out)).toEqual(new Uint8Array([1, 2, 3]))
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit]
    expect(String(url)).toContain('voice-123')
    expect(init.method).toBe('POST')
    expect(JSON.parse(init.body as string).text).toBe('hello')
  })

  it('throws MissingVoiceKeyError when no API key is configured', async () => {
    await expect(synthesizeSpeech('hi', 'v', { apiKey: undefined })).rejects.toBeInstanceOf(
      MissingVoiceKeyError,
    )
  })

  it('throws on a non-ok response', async () => {
    const fetchImpl = vi.fn(async () => new Response('err', { status: 500 }))
    await expect(
      synthesizeSpeech('hi', 'v', { apiKey: 'k', fetchImpl: fetchImpl as unknown as typeof fetch }),
    ).rejects.toThrow()
  })
})

describe('transcribeAudio (Whisper STT)', () => {
  it('returns the transcribed text', async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({ text: 'spoken words' }), { status: 200 }))
    const blob = new Blob([new Uint8Array([1, 2])], { type: 'audio/webm' })
    const text = await transcribeAudio(blob, { apiKey: 'k', fetchImpl: fetchImpl as unknown as typeof fetch })
    expect(text).toBe('spoken words')
  })

  it('throws on a non-ok response', async () => {
    const fetchImpl = vi.fn(async () => new Response('nope', { status: 400 }))
    const blob = new Blob([new Uint8Array([1])], { type: 'audio/webm' })
    await expect(
      transcribeAudio(blob, { apiKey: 'k', fetchImpl: fetchImpl as unknown as typeof fetch }),
    ).rejects.toThrow()
  })
})

describe('listVoices (ElevenLabs)', () => {
  it('maps the voices response', async () => {
    const body = {
      voices: [{ voice_id: 'v1', name: 'Rachel', preview_url: 'http://x/p.mp3' }],
    }
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify(body), { status: 200 }))
    const out = await listVoices({ apiKey: 'k', fetchImpl: fetchImpl as unknown as typeof fetch })
    expect(out).toEqual([{ id: 'v1', name: 'Rachel', previewUrl: 'http://x/p.mp3' }])
  })

  it('throws MissingVoiceKeyError without an API key', async () => {
    await expect(listVoices({ apiKey: undefined })).rejects.toBeInstanceOf(MissingVoiceKeyError)
  })
})
