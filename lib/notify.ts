import type { SupabaseClient } from '@supabase/supabase-js'
import { sendEmail, emailEnabled } from '@/lib/email'
import { getEnv } from '@/lib/env'

/**
 * Org-admin email notifications for the two events that make or lose money
 * when nobody is watching the dashboard: a captured lead and a visitor asking
 * for a human. Callers fire-and-forget (`void notifyX(...)`) — everything here
 * is try/caught and only logs.
 *
 * De-duplication is structural: callers only invoke these on a real state
 * TRANSITION (lead inserted; handoff bot/resolved → requested), so a visitor
 * mashing the button can't flood anyone.
 */

export interface OrgNotificationPrefs {
  leadEmails?: boolean
  handoffEmails?: boolean
}

/** Per-org toggle; anything unset defaults to ON. */
export function prefEnabled(prefs: unknown, key: keyof OrgNotificationPrefs): boolean {
  if (!prefs || typeof prefs !== 'object') return true
  return (prefs as Record<string, unknown>)[key] !== false
}

/** Minimal bot shape the notifiers need. */
export interface NotifyBot {
  id: string
  org_id: string
  name: string
}

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function shell(title: string, bodyHtml: string, ctaLabel: string, ctaUrl: string): string {
  return `<div style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;max-width:520px;margin:0 auto;padding:24px;color:#18181b">
  <p style="font-size:13px;color:#71717a;margin:0 0 16px">Loqara</p>
  <h2 style="font-size:18px;margin:0 0 12px">${esc(title)}</h2>
  ${bodyHtml}
  <p style="margin:24px 0">
    <a href="${ctaUrl}" style="background:#18181b;color:#fff;text-decoration:none;padding:10px 18px;border-radius:8px;font-size:14px">${esc(ctaLabel)}</a>
  </p>
  <p style="font-size:12px;color:#a1a1aa;margin-top:24px">You receive these because you're an admin of this workspace. Turn them off in Settings → Notifications.</p>
</div>`
}

export function leadEmail(
  botName: string,
  fields: Record<string, string>,
  link: string,
): { subject: string; html: string } {
  const rows = Object.entries(fields)
    .map(
      ([k, v]) =>
        `<tr><td style="padding:4px 12px 4px 0;color:#71717a;font-size:14px">${esc(k)}</td><td style="padding:4px 0;font-size:14px">${esc(v)}</td></tr>`,
    )
    .join('')
  return {
    subject: `New lead from ${botName}`,
    html: shell(
      `New lead from ${botName}`,
      `<table style="border-collapse:collapse">${rows}</table>`,
      'Open leads',
      link,
    ),
  }
}

export function handoffEmail(
  botName: string,
  lastMessage: string,
  link: string,
): { subject: string; html: string } {
  return {
    subject: `A visitor is waiting for a human — ${botName}`,
    html: shell(
      'A visitor asked to talk to a person',
      `<p style="font-size:14px;margin:0 0 8px;color:#71717a">Their last message on <strong>${esc(botName)}</strong>:</p>
       <blockquote style="margin:0;padding:10px 14px;background:#f4f4f5;border-radius:8px;font-size:14px">${esc(lastMessage || '(no message)')}</blockquote>
       <p style="font-size:14px;margin:12px 0 0">They're waiting in the chat right now.</p>`,
      'Open inbox',
      link,
    ),
  }
}

/** Emails of the org's admins (they own the inbox + leads). Emails live in
 *  Supabase auth (profiles carries no email column), so resolve each admin
 *  via the service-role admin API — orgs have a handful of admins at most. */
async function adminEmails(svc: SupabaseClient, orgId: string): Promise<string[]> {
  const { data, error } = await svc
    .from('organization_members')
    .select('user_id')
    .eq('org_id', orgId)
    .eq('role', 'admin')
  if (error) {
    console.error('[notify] admin lookup failed:', error.message)
    return []
  }
  const emails: string[] = []
  for (const row of (data ?? []) as { user_id: string }[]) {
    const { data: u, error: uErr } = await svc.auth.admin.getUserById(row.user_id)
    if (uErr) {
      console.error('[notify] auth user lookup failed:', uErr.message)
      continue
    }
    if (u?.user?.email) emails.push(u.user.email)
  }
  return emails
}

async function orgPrefs(svc: SupabaseClient, orgId: string): Promise<unknown> {
  const { data } = await svc
    .from('organizations')
    .select('notifications')
    .eq('id', orgId)
    .single<{ notifications: unknown }>()
  return data?.notifications ?? null
}

export async function notifyLeadCaptured(
  svc: SupabaseClient,
  bot: NotifyBot,
  fields: Record<string, string>,
): Promise<void> {
  try {
    if (!emailEnabled()) return
    if (!prefEnabled(await orgPrefs(svc, bot.org_id), 'leadEmails')) return
    const to = await adminEmails(svc, bot.org_id)
    if (!to.length) return
    const link = `${getEnv().NEXT_PUBLIC_APP_URL}/app/bots/${bot.id}/leads`
    await sendEmail({ to, ...leadEmail(bot.name, fields, link) })
  } catch (err) {
    console.error('[notify] lead email failed:', err)
  }
}

export async function notifyHandoffRequested(
  svc: SupabaseClient,
  bot: NotifyBot,
  lastMessage: string,
): Promise<void> {
  try {
    if (!emailEnabled()) return
    if (!prefEnabled(await orgPrefs(svc, bot.org_id), 'handoffEmails')) return
    const to = await adminEmails(svc, bot.org_id)
    if (!to.length) return
    const link = `${getEnv().NEXT_PUBLIC_APP_URL}/app/bots/${bot.id}/inbox`
    await sendEmail({ to, ...handoffEmail(bot.name, lastMessage, link) })
  } catch (err) {
    console.error('[notify] handoff email failed:', err)
  }
}
