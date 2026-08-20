import crypto from 'node:crypto'
import { getEnv } from '@/lib/env'

/**
 * AES-256-GCM encryption for channel access tokens at rest
 * (channel_connections.access_token_cipher) and the short-lived OAuth cookie.
 * Key: CHANNEL_TOKEN_KEY, base64-encoded 32 bytes. Fail closed when unset.
 */

function key(): Buffer {
  const b64 = getEnv().CHANNEL_TOKEN_KEY
  if (!b64) throw new Error('CHANNEL_TOKEN_KEY is not configured')
  const k = Buffer.from(b64, 'base64')
  if (k.length !== 32) throw new Error('CHANNEL_TOKEN_KEY must be 32 bytes (base64)')
  return k
}

/** Returns iv.ciphertext.tag, each base64url. */
export function encryptSecret(plaintext: string): string {
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv('aes-256-gcm', key(), iv)
  const enc = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  return [iv, enc, cipher.getAuthTag()].map((b) => b.toString('base64url')).join('.')
}

/** Inverse of encryptSecret. Throws on tampering or a wrong key. */
export function decryptSecret(token: string): string {
  const [iv, enc, tag] = token.split('.').map((p) => Buffer.from(p, 'base64url'))
  const decipher = crypto.createDecipheriv('aes-256-gcm', key(), iv)
  decipher.setAuthTag(tag)
  return Buffer.concat([decipher.update(enc), decipher.final()]).toString('utf8')
}
