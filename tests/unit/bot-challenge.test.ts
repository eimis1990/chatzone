import { describe, it, expect } from 'vitest'
import { looksLikeBotChallenge, parseUrl } from '@/lib/ingestion/parse'

const CHALLENGE_HTML = `<html><body><h1>Performing security verification</h1>
<p>This website uses a security service to protect against malicious bots.</p>
<h2>Verification successful. Waiting for example.com to respond</h2>
<p>Ray ID: a1a6db55186f50b1</p><p>Performance and Security by Cloudflare</p></body></html>`

describe('bot-challenge detection', () => {
  it('flags Cloudflare interstitials', () => {
    expect(looksLikeBotChallenge('Performing security verification … Ray ID: abc123')).toBe(true)
    expect(looksLikeBotChallenge('Just a moment… Performance and Security by Cloudflare')).toBe(true)
  })

  it('does not flag real pages that merely mention Cloudflare', () => {
    expect(
      looksLikeBotChallenge('We migrated our CDN to Cloudflare last year. Performance improved.'),
    ).toBe(false)
    expect(looksLikeBotChallenge('Normal product page about candles and their burn time.')).toBe(false)
  })

  it('parseUrl throws a clear error instead of indexing a challenge page', async () => {
    const fetchImpl = (async () => new Response(CHALLENGE_HTML, { status: 200, headers: { 'content-type': 'text/html' } })) as unknown as typeof fetch
    await expect(parseUrl('https://example.com/page', fetchImpl)).rejects.toThrow(/bot protection/)
  })
})
