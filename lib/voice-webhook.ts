import { createHmac, timingSafeEqual } from 'node:crypto'

/**
 * Pure helpers for the ElevenLabs post-call webhook (see
 * app/api/widget/voice-webhook/route.ts). Kept framework-free so they can be
 * unit-tested without a server or a live call.
 */

export const SIG_TOLERANCE_SECS = 30 * 60 // 30 min, matching ElevenLabs' window

/**
 * Verify the `ElevenLabs-Signature: t=<unix>,v0=<hex>` header: HMAC-SHA256 of
 * `${t}.${rawBody}` with the shared secret, plus a timestamp freshness check
 * (replay protection). `nowMs` is injectable for tests.
 */
export function verifyElevenLabsSignature(
  rawBody: string,
  header: string | null | undefined,
  secret: string,
  nowMs: number = Date.now(),
): boolean {
  if (!header) return false
  const parts: Record<string, string> = {}
  for (const kv of header.split(',')) {
    const i = kv.indexOf('=')
    if (i === -1) continue
    parts[kv.slice(0, i).trim()] = kv.slice(i + 1).trim()
  }
  const ts = parts.t
  const provided = parts.v0
  if (!ts || !provided) return false

  const tsNum = Number(ts)
  if (!Number.isFinite(tsNum)) return false
  if (Math.abs(nowMs / 1000 - tsNum) > SIG_TOLERANCE_SECS) return false

  const expected = createHmac('sha256', secret).update(`${ts}.${rawBody}`).digest('hex')
  const a = Buffer.from(expected)
  const b = Buffer.from(provided)
  return a.length === b.length && timingSafeEqual(a, b)
}

/** Test/util helper: produce a valid signature header for a body. */
export function signElevenLabsBody(rawBody: string, secret: string, tsSecs: number): string {
  const v0 = createHmac('sha256', secret).update(`${tsSecs}.${rawBody}`).digest('hex')
  return `t=${tsSecs},v0=${v0}`
}

export interface TranscriptTurn {
  role?: string
  message?: string | null
  time_in_call_secs?: number
}

export interface VoiceMessageRow {
  role: 'user' | 'assistant'
  content: string
  created_at: string
}

/**
 * Map an ElevenLabs transcript into message rows with wall-clock timestamps.
 * `eventTsSecs` is the webhook's event_timestamp (call end); we back-date the
 * start by the last turn's offset so each turn lands at start + its offset.
 * Empty turns are dropped. Returns rows + the derived started/last timestamps.
 */
export function transcriptToRows(
  turns: TranscriptTurn[],
  eventTsSecs: number | undefined,
): { rows: VoiceMessageRow[]; startedAt: string; lastAt: string } {
  const endMs = eventTsSecs ? eventTsSecs * 1000 : Date.now()
  const lastOffset = turns.length ? (turns[turns.length - 1].time_in_call_secs ?? 0) : 0
  const startMs = endMs - lastOffset * 1000

  const rows: VoiceMessageRow[] = turns
    .map((t) => ({
      role: (t.role === 'user' ? 'user' : 'assistant') as 'user' | 'assistant',
      content: (t.message ?? '').trim(),
      created_at: new Date(startMs + (t.time_in_call_secs ?? 0) * 1000).toISOString(),
    }))
    .filter((m) => m.content.length > 0)

  const startedAt = new Date(startMs).toISOString()
  const lastAt = rows.length ? rows[rows.length - 1].created_at : startedAt
  return { rows, startedAt, lastAt }
}
