'use server'

import { createServiceClient } from '@/lib/supabase/service'
import { sendEmail, emailEnabled } from '@/lib/email'
import { passwordResetEmail } from '@/lib/notify'
import { getEnv } from '@/lib/env'

/**
 * Send a password-reset email from hello@loqara.com. We mint the recovery
 * token ourselves (admin.generateLink) and link straight to /reset-password
 * with the token hash, so the flow never depends on Supabase's Site URL /
 * redirect allowlist or on PKCE state living in the requesting browser.
 *
 * Always resolves ok for a well-formed email — unknown addresses are not
 * revealed. Failures are logged server-side only.
 */
export async function requestPasswordReset(email: string): Promise<{ ok: boolean; error?: string }> {
  const address = email.trim().toLowerCase()
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address)) return { ok: false, error: 'Enter a valid email address.' }
  if (!emailEnabled()) return { ok: false, error: 'Email is not configured. Contact hello@loqara.com.' }

  // ponytail: no per-address cooldown — add a rate limit if the form gets abused.
  const svc = createServiceClient()
  const { data, error } = await svc.auth.admin.generateLink({ type: 'recovery', email: address })
  if (error || !data?.properties?.hashed_token) {
    if (error && !/not found/i.test(error.message)) console.error('[reset] generateLink failed:', error.message)
    return { ok: true }
  }

  const url = new URL('/reset-password', getEnv().NEXT_PUBLIC_APP_URL)
  url.searchParams.set('token_hash', data.properties.hashed_token)
  const sent = await sendEmail({ to: [address], ...passwordResetEmail(url.toString()) })
  if (!sent) console.error('[reset] email not accepted by SMTP for', address)
  return { ok: true }
}
