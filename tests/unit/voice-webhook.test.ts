import { describe, it, expect } from 'vitest'
import {
  verifyElevenLabsSignature,
  signElevenLabsBody,
  transcriptToRows,
} from '@/lib/voice-webhook'

const SECRET = 'whsec_test_shared_secret'
const BODY = JSON.stringify({ type: 'post_call_transcription', data: { agent_id: 'a' } })

describe('verifyElevenLabsSignature', () => {
  const now = 1_760_000_000_000 // fixed "now" in ms
  const ts = Math.floor(now / 1000)

  it('accepts a correctly signed, fresh request', () => {
    const header = signElevenLabsBody(BODY, SECRET, ts)
    expect(verifyElevenLabsSignature(BODY, header, SECRET, now)).toBe(true)
  })

  it('rejects a tampered body', () => {
    const header = signElevenLabsBody(BODY, SECRET, ts)
    expect(verifyElevenLabsSignature(BODY + ' ', header, SECRET, now)).toBe(false)
  })

  it('rejects a wrong secret', () => {
    const header = signElevenLabsBody(BODY, SECRET, ts)
    expect(verifyElevenLabsSignature(BODY, header, 'nope', now)).toBe(false)
  })

  it('rejects a stale timestamp (replay)', () => {
    const header = signElevenLabsBody(BODY, SECRET, ts - 60 * 60) // 1h old
    expect(verifyElevenLabsSignature(BODY, header, SECRET, now)).toBe(false)
  })

  it('rejects missing / malformed headers', () => {
    expect(verifyElevenLabsSignature(BODY, null, SECRET, now)).toBe(false)
    expect(verifyElevenLabsSignature(BODY, '', SECRET, now)).toBe(false)
    expect(verifyElevenLabsSignature(BODY, `t=${ts}`, SECRET, now)).toBe(false)
    expect(verifyElevenLabsSignature(BODY, `v0=abc`, SECRET, now)).toBe(false)
  })
})

describe('transcriptToRows', () => {
  const eventTs = 1_760_000_100 // call end (secs)

  it('maps agent→assistant / user→user and drops empty turns', () => {
    const { rows } = transcriptToRows(
      [
        { role: 'agent', message: 'Hi there!', time_in_call_secs: 0 },
        { role: 'user', message: '  ', time_in_call_secs: 2 }, // empty → dropped
        { role: 'user', message: 'What are your hours?', time_in_call_secs: 4 },
        { role: 'agent', message: 'We are open 9–5.', time_in_call_secs: 6 },
      ],
      eventTs,
    )
    expect(rows.map((r) => r.role)).toEqual(['assistant', 'user', 'assistant'])
    expect(rows.map((r) => r.content)).toEqual([
      'Hi there!',
      'What are your hours?',
      'We are open 9–5.',
    ])
  })

  it('back-dates start so turns are chronological and end near the event time', () => {
    const { rows, startedAt, lastAt } = transcriptToRows(
      [
        { role: 'agent', message: 'a', time_in_call_secs: 0 },
        { role: 'user', message: 'b', time_in_call_secs: 10 },
      ],
      eventTs,
    )
    // last turn lands at the event timestamp; start is 10s earlier
    expect(new Date(lastAt).getTime()).toBe(eventTs * 1000)
    expect(new Date(startedAt).getTime()).toBe((eventTs - 10) * 1000)
    expect(new Date(rows[0].created_at).getTime()).toBeLessThan(new Date(rows[1].created_at).getTime())
  })

  it('handles an empty transcript', () => {
    const { rows, startedAt, lastAt } = transcriptToRows([], eventTs)
    expect(rows).toEqual([])
    expect(startedAt).toBe(lastAt)
  })
})
