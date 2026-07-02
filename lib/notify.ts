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
  usageEmails?: boolean
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

export function usageWarningEmail(
  used: number,
  limit: number,
  link: string,
): { subject: string; html: string } {
  const pct = Math.round((100 * used) / limit)
  return {
    subject: `You've used ${pct}% of this month's conversations`,
    html: shell(
      `${used.toLocaleString()} of ${limit.toLocaleString()} conversations used`,
      `<p style="font-size:14px;margin:0">Your workspace has used <strong>${pct}%</strong> of its monthly conversation allowance. When the limit is reached, your chatbots show an offline message to new visitors until next month — upgrading keeps them answering.</p>`,
      'View plans',
      link,
    ),
  }
}

export function signupNotificationEmail(
  email: string,
  website: string | null,
  link: string,
  company?: string | null,
): { subject: string; html: string } {
  return {
    subject: `New Loqara signup: ${company || email}`,
    html: shell(
      'Someone wants to get started',
      `<table style="border-collapse:collapse">
        <tr><td style="padding:4px 12px 4px 0;color:#71717a;font-size:14px">Company</td><td style="padding:4px 0;font-size:14px">${esc(company || '—')}</td></tr>
        <tr><td style="padding:4px 12px 4px 0;color:#71717a;font-size:14px">Email</td><td style="padding:4px 0;font-size:14px">${esc(email)}</td></tr>
        <tr><td style="padding:4px 12px 4px 0;color:#71717a;font-size:14px">Website</td><td style="padding:4px 0;font-size:14px">${esc(website || '—')}</td></tr>
      </table>`,
      'Open signups',
      link,
    ),
  }
}

export function clientInviteEmail(
  companyName: string,
  inviteUrl: string,
): { subject: string; html: string } {
  return {
    subject: `Your Loqara workspace for ${companyName} is ready`,
    html: shell(
      `Welcome to Loqara`,
      `<p style="font-size:14px;margin:0 0 8px">We've set up a workspace for <strong>${esc(companyName)}</strong> — your AI chat &amp; voice assistant is a few steps away.</p>
       <p style="font-size:14px;margin:0">Create your account with the button below, and the guided setup will train your assistant on your website, match it to your brand, and give you the install snippet.</p>`,
      'Create your account',
      inviteUrl,
    ),
  }
}

/** Emails of PLATFORM owners (Loqara staff) — for new-prospect pings.
 *  OWNER_NOTIFY_EMAILS (comma-separated) overrides the owner login email(s). */
async function ownerEmails(svc: SupabaseClient): Promise<string[]> {
  const override = getEnv().OWNER_NOTIFY_EMAILS
  if (override) {
    return override
      .split(',')
      .map((e) => e.trim())
      .filter((e) => e.includes('@'))
  }
  const { data, error } = await svc.from('profiles').select('id').eq('role', 'owner')
  if (error) {
    console.error('[notify] owner lookup failed:', error.message)
    return []
  }
  const emails: string[] = []
  for (const row of (data ?? []) as { id: string }[]) {
    const { data: u } = await svc.auth.admin.getUserById(row.id)
    if (u?.user?.email) emails.push(u.user.email)
  }
  return emails
}

/** Ping the platform owner(s) about a new landing-page signup. */
export async function notifyNewSignup(
  svc: SupabaseClient,
  email: string,
  website: string | null,
  company?: string | null,
): Promise<void> {
  try {
    if (!emailEnabled()) return
    const to = await ownerEmails(svc)
    if (!to.length) return
    const link = `${getEnv().NEXT_PUBLIC_APP_URL}/owner/signups`
    await sendEmail({ to, ...signupNotificationEmail(email, website, link, company) })
  } catch (err) {
    console.error('[notify] signup email failed:', err)
  }
}

/**
 * Warn an org's admins once per calendar month when they cross 80% of the
 * conversation allowance. The caller checks + stamps `usage_warned_at`
 * (see maybeSendUsageWarning) — this just builds and sends.
 */
export async function notifyUsageWarning(
  svc: SupabaseClient,
  orgId: string,
  used: number,
  limit: number,
): Promise<void> {
  try {
    if (!emailEnabled()) return
    if (!prefEnabled(await orgPrefs(svc, orgId), 'usageEmails')) return
    const to = await adminEmails(svc, orgId)
    if (!to.length) return
    const link = `${getEnv().NEXT_PUBLIC_APP_URL}/app/subscription`
    await sendEmail({ to, ...usageWarningEmail(used, limit, link) })
  } catch (err) {
    console.error('[notify] usage warning failed:', err)
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
