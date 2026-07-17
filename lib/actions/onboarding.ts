'use server'

import { revalidatePath } from 'next/cache'
import { requireRole } from '@/lib/auth/guards'
import { createServerClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { botConfigSchema } from '@/lib/validation/schemas'
import { createBot } from '@/lib/actions/createBot'
import { allowedDomainToHost } from '@/lib/widget-auth'
import {
  templateNameFor,
  normalizeWebsiteUrl,
  isBusinessTypeId,
  mergeVisualTheme,
} from '@/lib/onboarding'
import type { Bot, BotConfig } from '@/lib/types'

/**
 * Server actions for the client onboarding wizard (/app/onboarding).
 *
 * Bot creation reuses the entitlement-checked `createBot` path; the prompt
 * template lives in the owner-only `system_prompts` table, so it is read with
 * the service client — but only AFTER the bot has been created inside the
 * caller's own org (createBot verifies membership + plan limits), and every
 * config write goes through the user's RLS-scoped client.
 */

export interface StartOnboardingBotInput {
  name: string
  websiteUrl: string
  businessType: string
}

export interface StartOnboardingBotResult {
  id?: string
  publicKey?: string
  error?: string
}

export async function startOnboardingBot(
  input: StartOnboardingBotInput,
): Promise<StartOnboardingBotResult> {
  await requireRole('client')

  const name = input.name.trim()
  if (!name) return { error: 'Please enter your business or bot name.' }
  if (!normalizeWebsiteUrl(input.websiteUrl)) {
    return { error: 'Please enter a valid website URL.' }
  }
  if (!isBusinessTypeId(input.businessType)) {
    return { error: 'Please pick a business type.' }
  }

  // Entitlement-checked creation (org membership + plan bot limit).
  const created = await createBot(name)
  if (created.error || !created.id) {
    return { error: created.error ?? 'Failed to create bot. Please try again.' }
  }

  // The sidebar/layout rendered before this bot existed — bust the cache so
  // "My Bots" shows it on the next navigation.
  revalidatePath('/app', 'layout')

  // Re-read through the user's client — RLS confirms the row is theirs.
  const supabase = await createServerClient()
  const { data: bot } = await supabase
    .from('bots')
    .select('id, public_key, config')
    .eq('id', created.id)
    .single<Pick<Bot, 'id' | 'public_key' | 'config'>>()
  if (!bot) return { error: 'Bot not found after creation.' }

  // Build the config patch: default the widget's allowed domain to the client's
  // own site (so it can't be embedded elsewhere / rack up their quota), and copy
  // the chosen prompt template. Only set allowedDomains when the client hasn't
  // set one — never override an existing restriction.
  const config: BotConfig = { ...bot.config }
  let changed = false

  const host = allowedDomainToHost(normalizeWebsiteUrl(input.websiteUrl) ?? '')
  if (host && (bot.config.allowedDomains?.length ?? 0) === 0) {
    config.allowedDomains = [host]
    changed = true
  }

  // Prompt template: clients can't read system_prompts (owner-only RLS), so the
  // lookup uses the service client; the write still goes through the user's client.
  const templateName = templateNameFor(input.businessType)
  if (templateName) {
    const svc = createServiceClient()
    const { data: template } = await svc
      .from('system_prompts')
      .select('id, content')
      .eq('name', templateName)
      .maybeSingle<{ id: string; content: string }>()
    if (template?.content) {
      config.systemPrompt = template.content
      config.systemPromptId = template.id
      changed = true
    }
    // Missing template row is non-fatal — the bot keeps the default prompt.
  }

  if (changed) {
    const { error } = await supabase.from('bots').update({ config }).eq('id', bot.id)
    if (error) return { error: error.message }
  }

  return { id: bot.id, publicKey: bot.public_key }
}

// ---------------------------------------------------------------------------
// Step 3 — store connection
// ---------------------------------------------------------------------------

export interface OnboardingCommerceInput {
  provider: 'woocommerce' | 'shopify' | 'magento' | 'verskis' | 'feed'
  storeUrl?: string
  shopifyDomain?: string
  shopifyToken?: string
  magentoToken?: string
  feedUrl?: string
}

export interface OnboardingSaveResult {
  success: boolean
  error?: string
}

/** Load a bot's config through the user's client (RLS proves ownership). */
async function loadOwnBot(botId: string) {
  const supabase = await createServerClient()
  const { data: bot } = await supabase
    .from('bots')
    .select('id, config')
    .eq('id', botId)
    .single<Pick<Bot, 'id' | 'config'>>()
  return { supabase, bot }
}

/** Validate the merged config and write it back via the user's client. */
async function saveMergedConfig(
  supabase: Awaited<ReturnType<typeof createServerClient>>,
  botId: string,
  merged: unknown,
): Promise<OnboardingSaveResult> {
  const parsed = botConfigSchema.safeParse(merged)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues.map((i) => i.message).join(', ') }
  }
  const { error } = await supabase.from('bots').update({ config: parsed.data }).eq('id', botId)
  if (error) return { success: false, error: error.message }
  return { success: true }
}

/** Save a tested store connection into config.commerce (enabled = true). */
export async function saveOnboardingCommerce(
  botId: string,
  input: OnboardingCommerceInput,
): Promise<OnboardingSaveResult> {
  await requireRole('client')
  const { supabase, bot } = await loadOwnBot(botId)
  if (!bot) return { success: false, error: 'Bot not found.' }

  const merged = {
    ...bot.config,
    commerce: {
      ...bot.config.commerce,
      enabled: true,
      provider: input.provider,
      storeUrl: (input.storeUrl ?? '').trim(),
      shopifyDomain: (input.shopifyDomain ?? '').trim(),
      shopifyToken: (input.shopifyToken ?? '').trim(),
      magentoToken: (input.magentoToken ?? '').trim(),
      feedUrl: (input.feedUrl ?? '').trim(),
    },
  }
  return saveMergedConfig(supabase, botId, merged)
}

// ---------------------------------------------------------------------------
// Step 4 — look & feel
// ---------------------------------------------------------------------------

/**
 * Save the wizard's theme choices into config.theme. Preserved functional
 * keys (position, uploaded images, toggles…) are filtered server-side too,
 * and the merged config is re-validated before writing.
 */
export async function saveOnboardingTheme(
  botId: string,
  theme: Record<string, unknown>,
): Promise<OnboardingSaveResult> {
  await requireRole('client')
  const { supabase, bot } = await loadOwnBot(botId)
  if (!bot) return { success: false, error: 'Bot not found.' }

  const merged = {
    ...bot.config,
    theme: mergeVisualTheme(bot.config.theme as unknown as Record<string, unknown>, theme),
  }
  return saveMergedConfig(supabase, botId, merged)
}
