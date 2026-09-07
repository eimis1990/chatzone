import type { SupabaseClient } from '@supabase/supabase-js'
import { assertPublicUrl } from '@/lib/net/ssrf'
import { emailEnabled, sendEmail } from '@/lib/email'
import { getEnv } from '@/lib/env'
import { leadEmail, notifyLeadCaptured } from '@/lib/notify'
import type { Bot } from '@/lib/types'

export interface LeadRecord {
  id: string
  conversationId: string | null
  fields: Record<string, string>
  createdAt: string
}

type DeliveryBot = Pick<Bot, 'id' | 'org_id' | 'name' | 'config'>

/**
 * Where a new lead goes: (1) org admins via the existing pref-gated email,
 * (2) explicitly configured extra addresses (never pref-gated — the client
 * asked for them), (3) an optional webhook. Never throws; each channel fails
 * independently so a dead webhook can't lose the email.
 */
export async function deliverLead(
  svc: SupabaseClient,
  bot: DeliveryBot,
  lead: LeadRecord,
  fetchImpl: typeof fetch = fetch,
): Promise<void> {
  const delivery = bot.config.leadCapture?.delivery
  await Promise.all([
    notifyLeadCaptured(svc, bot, lead.fields),
    sendExtraEmails(bot, lead, delivery?.emails ?? []),
    postWebhook(bot, lead, delivery?.webhookUrl, fetchImpl),
  ])
}

async function sendExtraEmails(bot: DeliveryBot, lead: LeadRecord, to: string[]): Promise<void> {
  if (!to.length || !emailEnabled()) return
  try {
    const link = `${getEnv().NEXT_PUBLIC_APP_URL}/app/bots/${bot.id}/leads`
    await sendEmail({ to, ...leadEmail(bot.name, lead.fields, link) })
  } catch (err) {
    console.error('[lead-delivery] extra email failed:', err)
  }
}

export function webhookPayload(bot: Pick<Bot, 'id' | 'name'>, lead: LeadRecord) {
  return {
    event: 'lead.created' as const,
    botId: bot.id,
    botName: bot.name,
    leadId: lead.id,
    conversationId: lead.conversationId,
    createdAt: lead.createdAt,
    fields: lead.fields,
  }
}

export async function postWebhook(
  bot: Pick<Bot, 'id' | 'name'>,
  lead: LeadRecord,
  url: string | undefined,
  fetchImpl: typeof fetch = fetch,
  /** SSRF guard (resolves DNS); injectable so unit tests stay offline. */
  guard: (u: string) => Promise<URL> = assertPublicUrl,
): Promise<boolean> {
  if (!url?.trim()) return false
  try {
    // Client-supplied URL fetched from our server → SSRF guard is mandatory.
    const target = await guard(url.trim())
    const res = await fetchImpl(target.toString(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'User-Agent': 'Loqara-Webhook/1' },
      body: JSON.stringify(webhookPayload(bot, lead)),
      signal: AbortSignal.timeout(5_000),
      redirect: 'manual',
    })
    if (!res.ok) console.error(`[lead-delivery] webhook ${res.status} for bot ${bot.id}`)
    return res.ok
  } catch (err) {
    console.error('[lead-delivery] webhook failed:', err)
    return false
  }
}
