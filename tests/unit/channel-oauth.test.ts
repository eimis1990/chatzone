import { beforeAll, describe, expect, it, vi } from 'vitest'
import crypto from 'node:crypto'

beforeAll(() => {
  vi.stubEnv('CHANNEL_TOKEN_KEY', crypto.randomBytes(32).toString('base64'))
})

describe('encryptSecret / decryptSecret', () => {
  it('round-trips and produces distinct ciphertexts per call', async () => {
    const { encryptSecret, decryptSecret } = await import('@/lib/channels/crypto')
    const a = encryptSecret('page-token-123')
    const b = encryptSecret('page-token-123')
    expect(a).not.toBe(b) // fresh IV each time
    expect(decryptSecret(a)).toBe('page-token-123')
    expect(decryptSecret(b)).toBe('page-token-123')
  })

  it('rejects tampered ciphertext', async () => {
    const { encryptSecret, decryptSecret } = await import('@/lib/channels/crypto')
    const token = encryptSecret('secret')
    const [iv, enc, tag] = token.split('.')
    const flipped = Buffer.from(enc, 'base64url')
    flipped[0] ^= 0xff
    expect(() => decryptSecret([iv, flipped.toString('base64url'), tag].join('.'))).toThrow()
  })
})

describe('signState / verifyState', () => {
  const base = { orgId: 'org1', userId: 'user1', botId: null }

  it('round-trips a valid state', async () => {
    const { signState, verifyState } = await import('@/lib/channels/oauth')
    const state = verifyState(signState(base, 's3cret'), 's3cret')
    expect(state).toMatchObject(base)
    expect(state!.exp).toBeGreaterThan(Date.now() / 1000)
    expect(state!.nonce).toBeTruthy()
  })

  it('rejects a tampered payload and a wrong secret', async () => {
    const { signState, verifyState } = await import('@/lib/channels/oauth')
    const token = signState(base, 's3cret')
    const [payload, sig] = token.split('.')
    const evil = Buffer.from(JSON.stringify({ ...base, orgId: 'attacker' })).toString('base64url')
    expect(verifyState(`${evil}.${sig}`, 's3cret')).toBeNull()
    expect(verifyState(token, 'other')).toBeNull()
    expect(verifyState(`${payload}`, 's3cret')).toBeNull()
  })

  it('rejects an expired state', async () => {
    const { verifyState } = await import('@/lib/channels/oauth')
    const expired = { orgId: 'o', userId: 'u', botId: null, nonce: 'n', exp: 1 }
    const payload = Buffer.from(JSON.stringify(expired)).toString('base64url')
    const sig = crypto.createHmac('sha256', 's3cret').update(payload).digest('base64url')
    expect(verifyState(`${payload}.${sig}`, 's3cret')).toBeNull()
  })
})
