import { getEnv } from '@/lib/env'

/**
 * Transactional email via Resend's HTTP API (no SDK dependency).
 *
 * Fail-safe by design: email is a side effect of chat/lead flows and must
 * NEVER break them — `sendEmail` catches everything and only logs. Until a
 * verified domain + EMAIL_FROM are configured, Resend's sandbox sender is
 * used (delivers only to the account owner's address — fine for testing).
 */

const SANDBOX_FROM = 'Loqara <onboarding@resend.dev>'

export function emailEnabled(): boolean {
  return Boolean(getEnv().RESEND_API_KEY)
}

export interface EmailMessage {
  to: string[]
  subject: string
  html: string
}

/** Send an email. Returns true when Resend accepted it; never throws. */
export async function sendEmail(msg: EmailMessage): Promise<boolean> {
  const env = getEnv()
  if (!env.RESEND_API_KEY || msg.to.length === 0) return false
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: env.EMAIL_FROM || SANDBOX_FROM,
        to: msg.to,
        subject: msg.subject,
        html: msg.html,
      }),
    })
    if (!res.ok) {
      console.error('[email] resend rejected:', res.status, (await res.text()).slice(0, 300))
      return false
    }
    return true
  } catch (err) {
    console.error('[email] send failed:', err)
    return false
  }
}
