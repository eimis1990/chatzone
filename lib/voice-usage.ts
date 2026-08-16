import type { SupabaseClient } from '@supabase/supabase-js'
import { VOICE_ADDON } from '@/lib/plans-catalog'
import { notifyVoiceUsageWarning } from '@/lib/notify'
import { monthStartISO } from '@/lib/usage'

/** Included live-call seconds per calendar month (voice add-on). */
export const VOICE_INCLUDED_SECS = VOICE_ADDON.minutesIncluded * 60
/** Free configurator-preview seconds per calendar month. */
export const PREVIEW_VOICE_INCLUDED_SECS = VOICE_ADDON.previewMinutes * 60

/**
 * Whole overage minutes newly crossed by moving usage from `beforeSecs` to
 * `afterSecs` against an included pool. Floors — we never bill a partial
 * minute early; the next call catches it up.
 */
export function overageMinutesDelta(
  beforeSecs: number,
  afterSecs: number,
  includedSecs: number,
): number {
  const over = (s: number) => Math.floor(Math.max(0, s - includedSecs) / 60)
  return Math.max(0, over(afterSecs) - over(beforeSecs))
}

/** First day of the current UTC month as a `date` string (voice_usage.month). */
export function monthDateUTC(now: Date = new Date()): string {
  return monthStartISO(now).slice(0, 10)
}

/**
 * Atomically add a call's seconds to the org's monthly counter (RPC
 * increment_voice_usage). Returns the counter before/after so overage billing
 * is race-safe under concurrent webhooks. Throws on failure — callers must
 * treat that as "not recorded".
 */
export async function recordVoiceUsage(
  svc: SupabaseClient,
  orgId: string,
  source: 'widget' | 'preview',
  secs: number,
): Promise<{ beforeSecs: number; afterSecs: number }> {
  const { data, error } = await svc.rpc('increment_voice_usage', {
    p_org: orgId,
    p_source: source,
    p_secs: secs,
  })
  const row = (Array.isArray(data) ? data[0] : data) as
    | { before_secs: number; after_secs: number }
    | null
    | undefined
  if (error || !row) {
    throw new Error(`increment_voice_usage failed: ${error?.message ?? 'no row returned'}`)
  }
  return { beforeSecs: row.before_secs, afterSecs: row.after_secs }
}

/** This month's voice seconds for an org, split by source (0 when absent). */
export async function voiceUsageThisMonth(
  svc: SupabaseClient,
  orgId: string,
): Promise<{ widgetSecs: number; previewSecs: number }> {
  const { data } = await svc
    .from('voice_usage')
    .select('source, seconds')
    .eq('org_id', orgId)
    .eq('month', monthDateUTC())
  const bySource = new Map(
    ((data ?? []) as { source: string; seconds: number }[]).map((r) => [r.source, r.seconds]),
  )
  return { widgetSecs: bySource.get('widget') ?? 0, previewSecs: bySource.get('preview') ?? 0 }
}

/**
 * Email the org's admins ONCE per calendar month at 80% of included live
 * minutes. Race-safe via a guarded voice_usage_warned_at claim (same pattern
 * as maybeSendUsageWarning in lib/usage.ts). Fire-and-forget — never throws.
 */
export async function maybeSendVoiceUsageWarning(
  svc: SupabaseClient,
  orgId: string,
  usedSecs: number,
): Promise<void> {
  try {
    if (usedSecs < Math.ceil(VOICE_INCLUDED_SECS * 0.8)) return
    const monthStart = monthStartISO()
    const { data: org } = await svc
      .from('organizations')
      .select('voice_usage_warned_at')
      .eq('id', orgId)
      .single<{ voice_usage_warned_at: string | null }>()
    if (!org) return
    if (org.voice_usage_warned_at && org.voice_usage_warned_at >= monthStart) return

    // Claim the stamp; only the winner of a concurrent race gets a row back.
    const { data: claimed } = await svc
      .from('organizations')
      .update({ voice_usage_warned_at: new Date().toISOString() })
      .eq('id', orgId)
      .or(`voice_usage_warned_at.is.null,voice_usage_warned_at.lt.${monthStart}`)
      .select('id')
    if (!claimed?.length) return

    await notifyVoiceUsageWarning(svc, orgId, Math.floor(usedSecs / 60), VOICE_ADDON.minutesIncluded)
  } catch (err) {
    console.error('[voice-usage] warning check failed:', err)
  }
}
