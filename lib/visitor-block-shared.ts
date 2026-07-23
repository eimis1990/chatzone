export const VISITOR_BLOCK_DURATION_MS = 24 * 60 * 60 * 1000
export const VISITOR_BLOCK_HEADER = 'x-visitor-blocked-until'

export interface VisitorBlockStatus {
  blocked: boolean
  blockedUntil?: string
}

export type VisitorBlockManagementAction = 'unblock' | 'extend'

export interface VisitorBlockManagementResult {
  blocked: boolean
  expiresAt: string | null
}

/** Adds a fresh 24 hours after whichever is later: the current expiry or now. */
export function extendVisitorBlockExpiry(currentExpiresAt: string, now = new Date()): string {
  const currentExpiryMs = new Date(currentExpiresAt).getTime()
  const baseMs = Math.max(currentExpiryMs, now.getTime())
  return new Date(baseMs + VISITOR_BLOCK_DURATION_MS).toISOString()
}

export class VisitorBlockedError extends Error {
  readonly blockedUntil: string

  constructor(blockedUntil: string) {
    super('Visitor blocked')
    this.name = 'VisitorBlockedError'
    this.blockedUntil = blockedUntil
  }
}
