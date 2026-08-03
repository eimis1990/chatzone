'use server'

import { revalidatePath } from 'next/cache'
import { requireRole } from '@/lib/auth/guards'
import { createServiceClient } from '@/lib/supabase/service'
import { getOrCreateDemoOrg } from '@/lib/demo-org'
import { defaultBotConfig } from '@/lib/validation/schemas'
import { entitlementsFor } from '@/lib/entitlements'
import {
  demoShareExpiresAt,
  generateDemoShareToken,
  hashDemoShareToken,
} from '@/lib/demo-share-token'
import { SITE_URL } from '@/lib/site'
import type { Bot, Plan } from '@/lib/types'

type ShareActionResult =
  | { ok: true; url: string; expiresAt: string }
  | { ok: false; error: string }

async function isDemoBot(botId: string): Promise<boolean> {
  const svc = createServiceClient()
  const { data } = await svc
    .from('bots')
    .select('id, organizations!inner(is_demo)')
    .eq('id', botId)
    .eq('organizations.is_demo', true)
    .maybeSingle<{ id: string }>()
  return Boolean(data)
}

/**
 * Create a prospect demo bot in the Loqara Demos org. Returns the id so the
 * shared CreateBotDialog can route to /owner/demos/[id]/configure.
 */
export async function createDemoBot(name: string): Promise<{ id?: string; error?: string }> {
  await requireRole('owner')
  const trimmed = name.trim().slice(0, 60)
  if (!trimmed) return { error: 'Please enter a name.' }

  const org = await getOrCreateDemoOrg()
  const svc = createServiceClient()
  const { data: bot, error } = await svc
    .from('bots')
    .insert({ org_id: org.id, name: trimmed, config: defaultBotConfig(trimmed) as Bot['config'] })
    .select('id')
    .single<{ id: string }>()
  if (error || !bot) return { error: error?.message ?? 'Failed to create the demo bot.' }
  return { id: bot.id }
}

/**
 * Create a fresh 24-hour bearer link. The raw 256-bit token is returned once;
 * only its SHA-256 digest is persisted. Replacing a link revokes every prior
 * active link for this bot before the new one is inserted.
 */
export async function createDemoPresentationShare(botId: string): Promise<ShareActionResult> {
  const owner = await requireRole('owner')
  if (!(await isDemoBot(botId))) {
    return { ok: false, error: 'Only bots in the Demos org can be shared.' }
  }

  const svc = createServiceClient()
  const now = new Date().toISOString()
  const { error: revokeError } = await svc
    .from('demo_presentation_shares')
    .update({ revoked_at: now })
    .eq('bot_id', botId)
    .is('revoked_at', null)
  if (revokeError) return { ok: false, error: 'Could not replace the previous share link.' }

  const token = generateDemoShareToken()
  const expiresAt = demoShareExpiresAt()
  const { error } = await svc.from('demo_presentation_shares').insert({
    bot_id: botId,
    token_hash: hashDemoShareToken(token),
    created_by: owner.id,
    expires_at: expiresAt.toISOString(),
  })
  if (error) return { ok: false, error: 'Could not create the share link.' }

  revalidatePath('/owner/demos')
  return {
    ok: true,
    url: `${SITE_URL}/present/share/${token}`,
    expiresAt: expiresAt.toISOString(),
  }
}

/** Revoke every currently valid public presentation link for one demo bot. */
export async function revokeDemoPresentationShares(
  botId: string,
): Promise<{ ok: boolean; error?: string }> {
  await requireRole('owner')
  if (!(await isDemoBot(botId))) {
    return { ok: false, error: 'Only bots in the Demos org can be managed here.' }
  }

  const svc = createServiceClient()
  const { error } = await svc
    .from('demo_presentation_shares')
    .update({ revoked_at: new Date().toISOString() })
    .eq('bot_id', botId)
    .is('revoked_at', null)
  if (error) return { ok: false, error: 'Could not revoke the share link.' }

  revalidatePath('/owner/demos')
  return { ok: true }
}

/**
 * Transfer a demo bot to a client org. Everything prepared on the demo —
 * synced catalog, knowledge, prompt, theme, component picks, voice agent —
 * hangs off bot_id, so moving the bot row moves it all; RLS grants the client
 * access immediately and the public_key (embed snippet) keeps working.
 * Demo chat history is purged by default (pitch transcripts would pollute the
 * client's inbox and analytics). A tombstone row keeps the demo visible on the
 * Demos screen with a link into the client's org.
 */
export async function transferDemoBot(
  botId: string,
  toOrgId: string,
  opts: { keepHistory?: boolean } = {},
): Promise<{ success: boolean; error?: string }> {
  await requireRole('owner')
  const demoOrg = await getOrCreateDemoOrg()
  const svc = createServiceClient()

  const { data: bot } = await svc
    .from('bots')
    .select('id, name, org_id')
    .eq('id', botId)
    .single<{ id: string; name: string; org_id: string }>()
  if (!bot || bot.org_id !== demoOrg.id) {
    return { success: false, error: 'Only bots in the Demos org can be transferred.' }
  }

  const { data: org } = await svc
    .from('organizations')
    .select('id, name, plan, is_demo')
    .eq('id', toOrgId)
    .single<{ id: string; name: string; plan: Plan | null; is_demo: boolean }>()
  if (!org || org.is_demo) return { success: false, error: 'Pick a client organization.' }

  // Same bot-limit rule as bot creation — a transfer is a bot arriving.
  const { count } = await svc
    .from('bots')
    .select('id', { count: 'exact', head: true })
    .eq('org_id', toOrgId)
  const limit = entitlementsFor(org.plan ?? 'free').maxBots
  if ((count ?? 0) >= limit) {
    return {
      success: false,
      error: `${org.name} is already at its plan's bot limit (${count}/${limit}).`,
    }
  }

  if (!opts.keepHistory) {
    // widget_events first (they reference conversations), then conversations
    // (messages cascade), then demo leads — all pitch-time noise.
    for (const table of ['widget_events', 'conversations', 'leads'] as const) {
      const { error } = await svc.from(table).delete().eq('bot_id', botId)
      if (error) return { success: false, error: `Purging ${table} failed: ${error.message}` }
    }
  }

  // Defense in depth: the public route also requires current demo membership,
  // but explicitly revoke stale links as the bot crosses into a client org.
  const { error: revokeShareError } = await svc
    .from('demo_presentation_shares')
    .update({ revoked_at: new Date().toISOString() })
    .eq('bot_id', botId)
    .is('revoked_at', null)
  if (revokeShareError) {
    console.error('[demos] share-link revocation failed:', revokeShareError.message)
  }

  const { error: moveError } = await svc.from('bots').update({ org_id: toOrgId }).eq('id', botId)
  if (moveError) return { success: false, error: moveError.message }

  // The bot has already moved — a failed tombstone must not fail the transfer.
  const { error: tombError } = await svc
    .from('demo_transfers')
    .insert({ bot_id: botId, name: bot.name, to_org_id: toOrgId })
  if (tombError) console.error('[demos] transfer tombstone insert failed:', tombError.message)

  revalidatePath('/owner/demos')
  return { success: true }
}
