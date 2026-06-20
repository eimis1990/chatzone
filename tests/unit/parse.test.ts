import { describe, it, expect } from 'vitest'
import { parseFile, parseUrl, extractReadableText } from '@/lib/ingestion/parse'

describe('parseFile', () => {
  it('reads plain text', async () => {
    const buf = Buffer.from('Hello plain text.', 'utf8')
    expect(await parseFile(buf, 'text/plain')).toBe('Hello plain text.')
  })

  it('reads markdown as text', async () => {
    const buf = Buffer.from('# Title\n\nBody.', 'utf8')
    expect(await parseFile(buf, 'text/markdown')).toContain('Title')
  })

  it('throws on an unsupported binary mime type', async () => {
    await expect(parseFile(Buffer.from('x'), 'image/png')).rejects.toThrow(/unsupported/i)
  })

  it('falls back to text for empty mime when bytes look textual', async () => {
    const buf = Buffer.from('# Markdown\n\nNo mime was sent.', 'utf8')
    expect(await parseFile(buf, '')).toContain('Markdown')
  })

  it('does not treat binary octet-stream with NUL bytes as text', async () => {
    const buf = Buffer.from([0x00, 0x01, 0x02])
    await expect(parseFile(buf, 'application/octet-stream')).rejects.toThrow(/unsupported/i)
  })
})

describe('extractReadableText', () => {
  it('strips HTML tags and returns body text', async () => {
    const html = `<html><head><title>T</title></head><body><article><h1>Heading</h1><p>First paragraph of content here that is reasonably long.</p><p>Second paragraph also has a fair amount of words.</p></article></body></html>`
    const text = await extractReadableText(html, 'https://example.com')
    expect(text).toContain('First paragraph')
    expect(text).not.toContain('<p>')
  })
})

describe('parseUrl', () => {
  it('fetches and extracts readable text', async () => {
    const fakeFetch = async () =>
      new Response(
        `<html><body><article><p>Fetched content paragraph with enough words to be extracted.</p></article></body></html>`,
        { status: 200, headers: { 'content-type': 'text/html' } },
      )
    const text = await parseUrl('https://example.com/page', fakeFetch as typeof fetch)
    expect(text).toContain('Fetched content paragraph')
  })

  it('throws on a non-ok response', async () => {
    const fakeFetch = async () => new Response('nope', { status: 404 })
    await expect(parseUrl('https://example.com/missing', fakeFetch as typeof fetch)).rejects.toThrow()
  })
})
