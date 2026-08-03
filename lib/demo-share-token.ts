import crypto from 'node:crypto'

export const DEMO_SHARE_TTL_MS = 24 * 60 * 60 * 1000
export const DEMO_SHARE_TOKEN_BYTES = 32

const TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/

/** 256-bit URL-safe bearer token. The raw value is returned once, never stored. */
export function generateDemoShareToken(): string {
  return crypto.randomBytes(DEMO_SHARE_TOKEN_BYTES).toString('base64url')
}

/** Stable database lookup key that does not reveal the bearer token. */
export function hashDemoShareToken(token: string): string {
  return crypto.createHash('sha256').update(token, 'utf8').digest('hex')
}

/** Reject malformed path input before making a privileged database query. */
export function isDemoShareToken(value: string): boolean {
  return TOKEN_PATTERN.test(value)
}

export function demoShareExpiresAt(now = new Date()): Date {
  return new Date(now.getTime() + DEMO_SHARE_TTL_MS)
}
