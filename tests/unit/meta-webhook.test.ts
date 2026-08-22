import { describe, expect, it } from 'vitest'
import crypto from 'node:crypto'
import { verifyHandshake, isValidSignature, extractTextMessages } from '@/lib/channels/meta'

const sign = (body: string, secret: string) =>
  `sha256=${crypto.createHmac('sha256', secret).update(body).digest('hex')}`

describe('verifyHandshake', () => {
  const params = (token: string) =>
    new URLSearchParams({ 'hub.mode': 'subscribe', 'hub.verify_token': token, 'hub.challenge': 'c123' })

  it('returns the challenge for a valid handshake', () => {
    expect(verifyHandshake(params('secret-token'), 'secret-token')).toBe('c123')
  })

  it('rejects a wrong token, wrong mode, and missing challenge', () => {
    expect(verifyHandshake(params('nope'), 'secret-token')).toBeNull()
    const badMode = params('secret-token')
    badMode.set('hub.mode', 'unsubscribe')
    expect(verifyHandshake(badMode, 'secret-token')).toBeNull()
    const noChallenge = params('secret-token')
    noChallenge.delete('hub.challenge')
    expect(verifyHandshake(noChallenge, 'secret-token')).toBeNull()
  })

  it('fails closed when no verify token is configured', () => {
    expect(verifyHandshake(params('anything'), undefined)).toBeNull()
  })
})

describe('isValidSignature', () => {
  const body = '{"object":"page"}'

  it('accepts a correct signature and rejects a tampered body', () => {
    expect(isValidSignature(body, sign(body, 's3cret'), 's3cret')).toBe(true)
    expect(isValidSignature(body + ' ', sign(body, 's3cret'), 's3cret')).toBe(false)
  })

  it('rejects missing/malformed headers and fails closed without a secret', () => {
    expect(isValidSignature(body, null, 's3cret')).toBe(false)
    expect(isValidSignature(body, 'sha1=abc', 's3cret')).toBe(false)
    expect(isValidSignature(body, 'sha256=zz', 's3cret')).toBe(false)
    expect(isValidSignature(body, sign(body, 's3cret'), undefined)).toBe(false)
  })
})

describe('extractTextMessages', () => {
  const event = (message: Record<string, unknown>, object = 'page') => ({
    object,
    entry: [{ id: 'ACC1', messaging: [{ sender: { id: 'USER1' }, timestamp: 42, message }] }],
  })

  it('extracts inbound Messenger text messages', () => {
    expect(extractTextMessages(event({ mid: 'm1', text: 'hello' }))).toEqual([
      {
        provider: 'messenger',
        accountId: 'ACC1',
        senderId: 'USER1',
        messageId: 'm1',
        text: 'hello',
        timestamp: 42,
      },
    ])
  })

  it('extracts inbound Instagram DMs with the instagram provider', () => {
    expect(extractTextMessages(event({ mid: 'ig1', text: 'labas' }, 'instagram'))).toEqual([
      {
        provider: 'instagram',
        accountId: 'ACC1',
        senderId: 'USER1',
        messageId: 'ig1',
        text: 'labas',
        timestamp: 42,
      },
    ])
  })

  it('skips echoes, non-text messages, and unknown payloads', () => {
    expect(extractTextMessages(event({ mid: 'm1', text: 'hi', is_echo: true }))).toEqual([])
    expect(extractTextMessages(event({ mid: 'ig1', text: 'hi', is_echo: true }, 'instagram'))).toEqual([])
    expect(extractTextMessages(event({ mid: 'm1', attachments: [] }))).toEqual([])
    expect(extractTextMessages({ object: 'whatsapp_business_account', entry: [] })).toEqual([])
    expect(extractTextMessages(null)).toEqual([])
  })
})
