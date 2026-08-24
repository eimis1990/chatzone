import nodemailer from 'nodemailer'
import { getEnv } from '@/lib/env'
import { SALES_EMAIL_SENDER } from '@/lib/sales-email-send'

/**
 * Transactional email via the real hello@loqara.com Hostinger mailbox — the
 * same one the sales flow sends from, so all outbound mail lives in one place.
 *
 * Fail-safe by design: email is a side effect of chat/lead flows and must
 * NEVER break them — `sendEmail` catches everything and only logs.
 */

export function emailEnabled(): boolean {
  return Boolean(getEnv().HOSTINGER_EMAIL_PASSWORD)
}

export interface EmailMessage {
  to: string[]
  subject: string
  html: string
}

/** Send an email. Returns true when the SMTP server accepted it; never throws. */
export async function sendEmail(msg: EmailMessage): Promise<boolean> {
  const password = getEnv().HOSTINGER_EMAIL_PASSWORD
  if (!password || msg.to.length === 0) return false
  try {
    const smtp = nodemailer.createTransport({
      host: 'smtp.hostinger.com',
      port: 465,
      secure: true,
      auth: { user: SALES_EMAIL_SENDER, pass: password },
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 20_000,
    })
    const sent = await smtp.sendMail({
      from: { name: 'Loqara', address: SALES_EMAIL_SENDER },
      to: msg.to,
      subject: msg.subject,
      html: msg.html,
      // Plain-text alternative helps spam filters; naive strip is enough here.
      text: msg.html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim(),
    })
    if (sent.accepted.length === 0) {
      console.error('[email] smtp accepted no recipients:', sent.rejected)
      return false
    }
    return true
  } catch (err) {
    console.error('[email] send failed:', err)
    return false
  }
}
