# Voice Minutes Metering & Preview Cap Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Meter live voice-call minutes (200/mo included, €0.20/min overage billed via Stripe), cap preview voice testing at 30 min/org/month, and surface both in the client subscription screen.

**Architecture:** The ElevenLabs post-call webhook (the one place every call — live or preview — already lands) becomes the metering point: it reads `call_duration_secs`, tags the call's source (`widget` vs `preview`, via a server-issued dynamic variable), and atomically increments a monthly `voice_usage` counter via a Postgres RPC. Overage minutes beyond the included 200 (calendar month, matching the existing conversation-pool semantics) are pushed to Stripe as Billing Meter events on a metered price attached alongside the flat €49 voice add-on item. Gates run at token-mint time: the preview route now requires the voice add-on and blocks past 30 preview minutes.

**Tech Stack:** Next.js App Router, Supabase (Postgres + RLS), Stripe SDK v22 (Billing Meters), ElevenLabs Conversational AI, Vitest.

## Global Constraints

- Included live minutes: **200/month** (calendar month UTC, same as conversation pool — NOT Stripe billing period).
- Overage: **€0.20/min**, billed via Stripe metered price; whole minutes only (floor — we never over-bill).
- Preview cap: **30 min/org/month**, free, requires active voice add-on (internal orgs bypass).
- Preview voice conversations are persisted (`source='preview'`) but must NOT count toward the org's conversation pool or appear in the client inbox.
- Existing behavior stays: widget voice-token keeps its conversation-pool hard block; `voice_addon` boolean sync from Stripe unchanged.
- Money paths fail loudly: if usage recording fails in the webhook, roll back the conversation insert and return 500 so ElevenLabs retries (idempotent via unique `external_id`).
- Tests: `npm test` (vitest). Commit per task, do NOT push (push = prod deploy; rollout has manual steps).

---

### Task 1: Database migration + types

**Files:**
- Create: `supabase/migrations/20260816120000_voice_minutes_metering.sql`
- Modify: `lib/types.ts:429` (Conversation interface)

**Interfaces:**
- Produces: `conversations.duration_secs int | null`, `conversations.source 'widget'|'preview'`, table `voice_usage(org_id, month, source, seconds)`, RPC `increment_voice_usage(p_org uuid, p_source text, p_secs int) → {before_secs, after_secs}`, `organizations.voice_usage_warned_at timestamptz`.

- [ ] **Step 1: Write the migration**

```sql
-- ---------------------------------------------------------------------------
-- Voice minutes metering
-- ---------------------------------------------------------------------------
-- `duration_secs` = ElevenLabs call length (voice conversations only).
-- `source` marks configurator test-playground calls ('preview') so they can be
-- excluded from the conversation pool, the inbox, and paid-minute metering.
alter table public.conversations
  add column if not exists duration_secs integer,
  add column if not exists source text not null default 'widget'
    check (source in ('widget', 'preview'));

-- Monthly voice-seconds counter per org+source. Written only by the service
-- role (post-call webhook) through increment_voice_usage; the atomic upsert
-- returns before/after so the caller can compute a race-safe overage delta.
create table if not exists public.voice_usage (
  org_id uuid not null references public.organizations(id) on delete cascade,
  month date not null,
  source text not null check (source in ('widget', 'preview')),
  seconds integer not null default 0,
  primary key (org_id, month, source)
);
alter table public.voice_usage enable row level security;
-- No policies: service-role only (server pages read via the service client).

create or replace function public.increment_voice_usage(
  p_org uuid,
  p_source text,
  p_secs integer
) returns table (before_secs integer, after_secs integer)
language sql
as $$
  insert into public.voice_usage (org_id, month, source, seconds)
  values (p_org, date_trunc('month', (now() at time zone 'utc'))::date, p_source, greatest(p_secs, 0))
  on conflict (org_id, month, source)
  do update set seconds = voice_usage.seconds + excluded.seconds
  returning seconds - greatest(p_secs, 0), seconds;
$$;
revoke execute on function public.increment_voice_usage(uuid, text, integer) from public, anon, authenticated;

-- One 80%-of-voice-minutes warning email per calendar month (same pattern as
-- usage_warned_at for conversations).
alter table public.organizations
  add column if not exists voice_usage_warned_at timestamptz;
```

- [ ] **Step 2: Extend the Conversation type** — add to `interface Conversation` in `lib/types.ts`:

```ts
  /** Voice calls: ElevenLabs call length in seconds (null for chat). */
  duration_secs?: number | null
  /** 'preview' = configurator test-playground call; excluded from pools/inbox. */
  source?: 'widget' | 'preview'
```

- [ ] **Step 3: Apply migration to the local/linked dev DB** (`supabase db push` or the project's usual flow) and verify `select increment_voice_usage('<any-org-uuid>', 'preview', 90);` returns `(0, 90)` then `(90, 180)` on a second call.

- [ ] **Step 4: Commit** — `feat(voice): voice_usage schema + atomic increment RPC`

---

### Task 2: Catalog constants + pure overage math

**Files:**
- Modify: `lib/plans-catalog.ts:109-117` (VOICE_ADDON)
- Create: `lib/voice-usage.ts`
- Test: `tests/unit/voice-usage.test.ts`

**Interfaces:**
- Produces: `VOICE_ADDON.previewMinutes: 30`; `VOICE_INCLUDED_SECS`, `PREVIEW_VOICE_INCLUDED_SECS`, `overageMinutesDelta(beforeSecs, afterSecs, includedSecs): number`, `recordVoiceUsage(svc, orgId, source, secs): Promise<{beforeSecs, afterSecs}>`, `voiceUsageThisMonth(svc, orgId): Promise<{widgetSecs, previewSecs}>`, `maybeSendVoiceUsageWarning(svc, orgId, usedSecs): Promise<void>` (warning wired in Task 4).

- [ ] **Step 1: Catalog** — in `VOICE_ADDON` add `previewMinutes: 30,` after `perMinute: 0.2,` and append feature bullet `'30 test minutes in the configurator preview'`.

- [ ] **Step 2: Write failing tests** (`tests/unit/voice-usage.test.ts`):

```ts
import { describe, it, expect } from 'vitest'
import { overageMinutesDelta, VOICE_INCLUDED_SECS, PREVIEW_VOICE_INCLUDED_SECS } from '@/lib/voice-usage'

describe('overageMinutesDelta — billable whole minutes crossed by one call', () => {
  const INC = 200 * 60
  it('entirely inside the included pool → 0', () => {
    expect(overageMinutesDelta(0, 600, INC)).toBe(0)
    expect(overageMinutesDelta(INC - 60, INC, INC)).toBe(0)
  })
  it('call crossing the boundary bills only the excess whole minutes', () => {
    expect(overageMinutesDelta(INC - 30, INC + 90, INC)).toBe(1) // 90s over → 1 min
  })
  it('fully in overage bills the delta in whole minutes (floor)', () => {
    expect(overageMinutesDelta(INC + 60, INC + 250, INC)).toBe(3) // floor(250/60)=4 minus floor(60/60)=1
  })
  it('sub-minute progress bills nothing yet, then catches up', () => {
    expect(overageMinutesDelta(INC, INC + 59, INC)).toBe(0)
    expect(overageMinutesDelta(INC + 59, INC + 61, INC)).toBe(1)
  })
  it('never negative', () => {
    expect(overageMinutesDelta(INC + 120, INC + 120, INC)).toBe(0)
  })
})

describe('constants', () => {
  it('200 included live minutes, 30 preview minutes', () => {
    expect(VOICE_INCLUDED_SECS).toBe(12000)
    expect(PREVIEW_VOICE_INCLUDED_SECS).toBe(1800)
  })
})
```

- [ ] **Step 3: Run** `npm test -- voice-usage` → FAIL (module missing).

- [ ] **Step 4: Implement `lib/voice-usage.ts`:**

```ts
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
export function overageMinutesDelta(beforeSecs: number, afterSecs: number, includedSecs: number): number {
  const over = (s: number) => Math.floor(Math.max(0, s - includedSecs) / 60)
  return Math.max(0, over(afterSecs) - over(beforeSecs))
}

/** First day of the current UTC month as a `date` string (voice_usage.month). */
export function monthDateUTC(now: Date = new Date()): string {
  return monthStartISO(now).slice(0, 10)
}

/**
 * Atomically add a call's seconds to the org's monthly counter. Returns the
 * counter before/after so overage billing is race-safe under concurrent
 * webhooks. Throws on failure — callers must treat that as "not recorded".
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
  const row = Array.isArray(data) ? data[0] : data
  if (error || !row) throw new Error(`increment_voice_usage failed: ${error?.message ?? 'no row'}`)
  return { beforeSecs: row.before_secs as number, afterSecs: row.after_secs as number }
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
  const bySource = new Map((data ?? []).map((r) => [r.source as string, r.seconds as number]))
  return { widgetSecs: bySource.get('widget') ?? 0, previewSecs: bySource.get('preview') ?? 0 }
}

/**
 * Email the org's admins ONCE per calendar month at 80% of included live
 * minutes. Race-safe via a guarded voice_usage_warned_at claim (same pattern
 * as maybeSendUsageWarning). Fire-and-forget — never throws.
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
```

- [ ] **Step 5: Add `notifyVoiceUsageWarning` to `lib/notify.ts`** next to `notifyUsageWarning` (`lib/notify.ts:246`), reusing its structure — same `emailEnabled`/`prefEnabled(…, 'usageEmails')`/`adminEmails` guards, new email copy builder alongside `usageWarningEmail`:

```ts
/** Warn admins once per month at 80% of included voice minutes. */
export async function notifyVoiceUsageWarning(
  svc: SupabaseClient,
  orgId: string,
  usedMinutes: number,
  includedMinutes: number,
): Promise<void> {
  try {
    if (!emailEnabled()) return
    if (!prefEnabled(await orgPrefs(svc, orgId), 'usageEmails')) return
    const to = await adminEmails(svc, orgId)
    if (!to.length) return
    const link = `${getEnv().NEXT_PUBLIC_APP_URL}/app/subscription`
    await sendEmail({
      to,
      subject: `You've used ${usedMinutes} of ${includedMinutes} voice minutes this month`,
      // Follow usageWarningEmail's existing HTML/text shape; state that extra
      // minutes are billed at €0.20/min and link to the subscription page.
      ...voiceUsageWarningEmail(usedMinutes, includedMinutes, link),
    })
  } catch (err) {
    console.error('[notify] voice usage warning failed:', err)
  }
}
```
(Adapt to `usageWarningEmail`'s actual return shape — if it returns `{subject, html, text}`, mirror that and drop the separate `subject` line above.)

- [ ] **Step 6: Run** `npm test -- voice-usage` → PASS. Run full `npm test` → green.

- [ ] **Step 7: Commit** — `feat(voice): usage math, monthly counters, 80% warning`

---

### Task 3: Webhook — duration, source, atomic metering

**Files:**
- Modify: `lib/voice-webhook.ts` (add pure parsers)
- Modify: `app/api/widget/voice-webhook/route.ts`
- Test: `tests/unit/voice-webhook.test.ts` (extend)

**Interfaces:**
- Consumes: `recordVoiceUsage`, `overageMinutesDelta`, `VOICE_INCLUDED_SECS`, `maybeSendVoiceUsageWarning` (Task 2); `reportVoiceOverage` (Task 4 — wire behind a try/catch so Task 3 lands independently with a TODO-free noop import order: implement Task 4 first if executing sequentially, or wire the call in Task 4's final step).
- Produces: `callDurationSecs(data, turns): number`, `callSource(data): 'widget' | 'preview'` exported from `lib/voice-webhook.ts`.

- [ ] **Step 1: Write failing tests** — append to `tests/unit/voice-webhook.test.ts`:

```ts
import { callDurationSecs, callSource } from '@/lib/voice-webhook'

describe('callDurationSecs', () => {
  it('prefers metadata.call_duration_secs', () => {
    expect(callDurationSecs({ metadata: { call_duration_secs: 73 } }, [])).toBe(73)
  })
  it('falls back to the last transcript offset', () => {
    expect(callDurationSecs({}, [{ role: 'agent', message: 'x', time_in_call_secs: 41 }])).toBe(41)
  })
  it('never negative, rounds, tolerates garbage', () => {
    expect(callDurationSecs({ metadata: { call_duration_secs: -5 } }, [])).toBe(0)
    expect(callDurationSecs({ metadata: { call_duration_secs: 12.6 } }, [])).toBe(13)
    expect(callDurationSecs({ metadata: { call_duration_secs: 'zzz' } }, [])).toBe(0)
    expect(callDurationSecs({}, [])).toBe(0)
  })
})

describe('callSource', () => {
  it("reads the server-issued call_source dynamic variable", () => {
    expect(
      callSource({ conversation_initiation_client_data: { dynamic_variables: { call_source: 'preview' } } }),
    ).toBe('preview')
  })
  it('defaults to widget for anything else', () => {
    expect(callSource({})).toBe('widget')
    expect(callSource({ conversation_initiation_client_data: { dynamic_variables: { call_source: 'x' } } })).toBe('widget')
  })
})
```

- [ ] **Step 2: Run** `npm test -- voice-webhook` → FAIL.

- [ ] **Step 3: Implement parsers in `lib/voice-webhook.ts`:**

```ts
/** Call length in whole seconds: metadata.call_duration_secs, falling back to
 *  the last transcript offset. Defensive — webhook payloads are external. */
export function callDurationSecs(
  data: { metadata?: { call_duration_secs?: unknown } },
  turns: TranscriptTurn[],
): number {
  const meta = Number(data.metadata?.call_duration_secs)
  const fallback = turns.length ? (turns[turns.length - 1].time_in_call_secs ?? 0) : 0
  const secs = Number.isFinite(meta) && meta > 0 ? meta : fallback
  return Math.max(0, Math.round(secs))
}

/** 'preview' only when the call carried our server-issued call_source dynamic
 *  variable (set by /api/preview/voice-token); everything else is a live call. */
export function callSource(data: {
  conversation_initiation_client_data?: { dynamic_variables?: Record<string, unknown> }
}): 'widget' | 'preview' {
  return data.conversation_initiation_client_data?.dynamic_variables?.call_source === 'preview'
    ? 'preview'
    : 'widget'
}
```

- [ ] **Step 4: Run** `npm test -- voice-webhook` → PASS.

- [ ] **Step 5: Wire the route** (`app/api/widget/voice-webhook/route.ts`):
  - Bot lookup: `select('id')` → `select('id, org_id')` (type `Pick<Bot, 'id' | 'org_id'>`).
  - Compute `const source = callSource(data)` and `const durationSecs = callDurationSecs(data, turns)`.
  - Conversation insert: add `source, duration_secs: durationSecs`.
  - After the messages insert succeeds (below the existing `msgErr` rollback), record usage and bill — any failure rolls back the conversation so the ElevenLabs retry re-runs the whole thing:

```ts
  // Metering: atomically add this call's seconds to the org's monthly counter.
  // If this fails we roll back the conversation and 500 — the ElevenLabs retry
  // recreates everything (external_id dedupe guarantees exactly-once).
  let usage: { beforeSecs: number; afterSecs: number }
  try {
    usage = await recordVoiceUsage(svc, bot.org_id, source, durationSecs)
  } catch (err) {
    console.error('[voice-webhook] usage recording failed:', err)
    await svc.from('messages').delete().eq('conversation_id', conv.id)
    await svc.from('conversations').delete().eq('id', conv.id)
    return NextResponse.json({ error: 'Failed to record usage' }, { status: 500 })
  }

  if (source === 'widget') {
    const overageMinutes = overageMinutesDelta(usage.beforeSecs, usage.afterSecs, VOICE_INCLUDED_SECS)
    // Billing report is best-effort: usage is safely in voice_usage, so a
    // Stripe hiccup must not make ElevenLabs re-deliver (which would dedupe
    // and skip billing anyway). Reconcile manually from voice_usage if ever needed.
    if (overageMinutes > 0) {
      await reportVoiceOverage(bot.org_id, overageMinutes).catch((err) =>
        console.error('[voice-webhook] overage report failed:', err),
      )
    }
    await maybeSendVoiceUsageWarning(svc, bot.org_id, usage.afterSecs)
  }
```

- [ ] **Step 6: Run full** `npm test` → green.

- [ ] **Step 7: Commit** — `feat(voice): meter call duration + source from the post-call webhook`

---

### Task 4: Stripe overage price + meter reporting

**Files:**
- Modify: `lib/stripe/plans.ts` (overage price id)
- Modify: `lib/stripe/manage.ts:74-119` (changeBasePlan exclusion + setVoiceAddon)
- Create: `lib/stripe/voice-overage.ts`
- Create: `scripts/setup-stripe-voice-overage.mjs`
- Modify: `.env.example`

**Interfaces:**
- Produces: `getVoiceOveragePriceId(): string | null`, `reportVoiceOverage(orgId: string, minutes: number): Promise<void>`, env `STRIPE_PRICE_VOICE_OVERAGE`, Stripe meter event name constant `VOICE_OVERAGE_METER_EVENT = 'voice_overage_minutes'`.

- [ ] **Step 1: `lib/stripe/plans.ts`** — next to `getVoicePriceId`:

```ts
/** Stripe Price ID for metered voice overage (€0.20/min), or null when not configured. */
export function getVoiceOveragePriceId(): string | null {
  return process.env.STRIPE_PRICE_VOICE_OVERAGE ?? null
}
```

- [ ] **Step 2: `lib/stripe/manage.ts`** —
  - `changeBasePlan`: extend the exclusion set so a base-plan swap can never mistake the metered item for the plan:
    `const addonPriceIds = new Set([getVoicePriceId(), getVoiceOveragePriceId(), getVisualizerPriceId()].filter(Boolean))`
  - `setVoiceAddon`: attach/detach the metered item alongside the flat item (metered items take no quantity — `setAddonItem` already passes none):

```ts
export async function setVoiceAddon(subscriptionId: string, enabled: boolean): Promise<void> {
  const priceId = getVoicePriceId()
  if (!priceId) throw new Error('Voice add-on price is not configured.')
  await setAddonItem(subscriptionId, priceId, enabled)
  // Metered overage rides along with the flat fee; optional so a missing env
  // degrades to flat-fee-only rather than blocking the add-on toggle.
  const overageId = getVoiceOveragePriceId()
  if (overageId) await setAddonItem(subscriptionId, overageId, enabled)
}
```

- [ ] **Step 3: `lib/stripe/voice-overage.ts`:**

```ts
import 'server-only'
import { getStripe } from './client'
import { createServiceClient } from '@/lib/supabase/service'
import { isInternalOrg } from '@/lib/entitlements'

export const VOICE_OVERAGE_METER_EVENT = 'voice_overage_minutes'

/**
 * Report billable overage minutes to Stripe's voice meter. No-ops when Stripe
 * is unconfigured, the org has no customer / no active add-on, or is internal.
 * Throws on Stripe API failure — the caller decides whether that's fatal.
 */
export async function reportVoiceOverage(orgId: string, minutes: number): Promise<void> {
  if (minutes <= 0) return
  const stripe = getStripe()
  if (!stripe) return
  const svc = createServiceClient()
  const { data: org } = await svc
    .from('organizations')
    .select('stripe_customer_id, voice_addon, is_demo, is_platform')
    .eq('id', orgId)
    .single<{ stripe_customer_id: string | null; voice_addon: boolean | null; is_demo: boolean | null; is_platform: boolean | null }>()
  if (!org?.stripe_customer_id || !org.voice_addon || isInternalOrg(org)) return
  await stripe.billing.meterEvents.create({
    event_name: VOICE_OVERAGE_METER_EVENT,
    payload: { stripe_customer_id: org.stripe_customer_id, value: String(minutes) },
  })
}
```

- [ ] **Step 4: Setup script `scripts/setup-stripe-voice-overage.mjs`** (run once per Stripe environment; idempotent):

```js
// Creates the voice-overage Billing Meter + metered price (€0.20/min).
// Usage: STRIPE_SECRET_KEY=sk_... node scripts/setup-stripe-voice-overage.mjs
// Prints the price id to put in STRIPE_PRICE_VOICE_OVERAGE.
import Stripe from 'stripe'

const key = process.env.STRIPE_SECRET_KEY
if (!key) { console.error('Set STRIPE_SECRET_KEY'); process.exit(1) }
const stripe = new Stripe(key)

const EVENT_NAME = 'voice_overage_minutes'
const meters = await stripe.billing.meters.list({ status: 'active', limit: 100 })
let meter = meters.data.find((m) => m.event_name === EVENT_NAME)
if (!meter) {
  meter = await stripe.billing.meters.create({
    display_name: 'Voice overage minutes',
    event_name: EVENT_NAME,
    default_aggregation: { formula: 'sum' },
    customer_mapping: { event_payload_key: 'stripe_customer_id', type: 'by_id' },
    value_settings: { event_payload_key: 'value' },
  })
  console.log('Created meter:', meter.id)
} else {
  console.log('Meter exists:', meter.id)
}

const prices = await stripe.prices.list({ limit: 100, active: true, recurring: { usage_type: 'metered' } })
let price = prices.data.find((p) => p.recurring?.meter === meter.id)
if (!price) {
  price = await stripe.prices.create({
    currency: 'eur',
    unit_amount: 20, // €0.20 per minute
    billing_scheme: 'per_unit',
    recurring: { interval: 'month', usage_type: 'metered', meter: meter.id },
    product_data: { name: 'Voice agent — extra minutes' },
  })
  console.log('Created price:', price.id)
} else {
  console.log('Price exists:', price.id)
}
console.log(`\nSTRIPE_PRICE_VOICE_OVERAGE=${price.id}`)
```

- [ ] **Step 5: `.env.example`** — add under the existing Stripe price ids: `STRIPE_PRICE_VOICE_OVERAGE=` with a one-line comment pointing at the script.

- [ ] **Step 6:** Ensure Task 3's route imports `reportVoiceOverage` from `@/lib/stripe/voice-overage` (wire now if Task 3 landed with the import pending). Run `npm test` → green. Run the script against the **sandbox** key from `.env.local` and put the printed id in `.env.local`. (LIVE mode: user runs it with the live key + sets the Vercel env var — see Rollout.)

- [ ] **Step 7: Commit** — `feat(billing): Stripe metered voice overage (€0.20/min)`

---

### Task 5: Preview gating + call tagging

**Files:**
- Modify: `app/api/preview/voice-token/route.ts`
- Modify: `components/voice/VoiceCallButton.tsx:32,78,216-289` (getToken type + startSession)
- Modify: `components/client/TestChat.tsx:485-497` (getVoiceToken passthrough)

**Interfaces:**
- Consumes: `voiceUsageThisMonth`, `PREVIEW_VOICE_INCLUDED_SECS` (Task 2), `isInternalOrg` (`lib/entitlements.ts:92`).
- Produces: preview token response `{ token, agentId, voiceId, dynamicVariables: { call_source: 'preview' } }`; `getToken` return type gains optional `dynamicVariables?: Record<string, string>` which `startSession` forwards.

- [ ] **Step 1: Preview route** — after the auth/ownership checks in `app/api/preview/voice-token/route.ts` (auth at line 22, bot fetch at 29), add rate limiting + add-on gate + cap. Full shape:

```ts
// top of file
import { createRateLimiter } from '@/lib/ratelimit'
import { isInternalOrg } from '@/lib/entitlements'
import { voiceUsageThisMonth, PREVIEW_VOICE_INCLUDED_SECS } from '@/lib/voice-usage'

const limiter = createRateLimiter({ capacity: 5, refillPerSec: 0.2 }) // matches widget route

// after `if (!user) …`:
if (!limiter.check(user.id)) return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 })

// after the `voice.enabled` check (line 31-33), replacing nothing else:
const { data: org } = await svc
  .from('organizations')
  .select('voice_addon, is_demo, is_platform')
  .eq('id', bot.org_id)
  .single<{ voice_addon: boolean | null; is_demo: boolean | null; is_platform: boolean | null }>()
if (!isInternalOrg(org)) {
  // Preview minutes are free but only for orgs actually paying for voice.
  if (!org?.voice_addon) {
    return NextResponse.json(
      { error: 'Voice is a paid add-on — activate it on the Subscription page to test calls.', code: 'voice_addon_required' },
      { status: 403 },
    )
  }
  const { previewSecs } = await voiceUsageThisMonth(svc, bot.org_id)
  if (previewSecs >= PREVIEW_VOICE_INCLUDED_SECS) {
    return NextResponse.json(
      { error: 'Monthly preview call minutes are used up — minutes reset on the 1st.', code: 'preview_voice_limit' },
      { status: 403 },
    )
  }
}
```
  and extend the success response: `return NextResponse.json({ token, agentId, voiceId, dynamicVariables: { call_source: 'preview' } })`.

- [ ] **Step 2: `VoiceCallButton.tsx`** — widen `getToken` in BOTH `VoiceCallButtonProps` (line 32) and `InnerProps` (line 78) to `() => Promise<{ token: string; voiceId?: string; dynamicVariables?: Record<string, string> }>`. In `handleStart`, capture and forward: destructure `dynamicVariables` from the `getToken()` result and add `...(dynamicVariables ? { dynamicVariables } : {})` to the `startSession({ conversationToken: token, … })` call at line 274.

- [ ] **Step 3: `TestChat.tsx` `getVoiceToken`** — pass the tag through:

```ts
const data = (await res.json()) as { token: string; voiceId?: string; dynamicVariables?: Record<string, string> }
return { token: data.token, voiceId: data.voiceId, dynamicVariables: data.dynamicVariables }
```
  Verify the widget transport's `getVoiceToken` (`lib/widget-transport.ts`) still type-checks (it returns no `dynamicVariables` — field is optional).

- [ ] **Step 4: Manual check** — `npm run build` or `npx tsc --noEmit` passes; existing `elevenlabs-agent`/`voice` unit tests still green via `npm test`.

- [ ] **Step 5: Commit** — `feat(voice): gate preview calls (add-on + 30 min/mo) and tag their source`

---

### Task 6: Exclude preview calls from pools, inbox, and counts

**Files:**
- Modify: `lib/usage.ts:28-33` (`conversationsThisMonth`)
- Modify: `app/(client)/app/subscription/page.tsx:74-78` (`loadUsage`)
- Modify: `app/(client)/app/inbox/page.tsx` (conversation list query)
- Modify: `app/(client)/app/layout.tsx`, `app/(client)/app/settings/page.tsx` (inspect each `from('conversations')` — apply the filter to client-facing counts/lists only)

**Interfaces:**
- Consumes: `conversations.source` (Task 1).

- [ ] **Step 1:** In `conversationsThisMonth` add `.neq('source', 'preview')` to the count query. (Voice **live** calls keep counting as conversations — unchanged behavior; only preview is excluded.)

- [ ] **Step 2:** Same `.neq('source', 'preview')` in the subscription page `loadUsage` count.

- [ ] **Step 3:** Inspect the `from('conversations')` queries in `inbox/page.tsx`, `layout.tsx`, `settings/page.tsx`: add `.neq('source', 'preview')` to any client-facing list/count (inbox list, unread badges). Leave per-conversation reads (by id) and the retention cron untouched — retention SHOULD still delete preview conversations.

- [ ] **Step 4:** `npm test` → green (usage tests unaffected — the filter is inside the query builder).

- [ ] **Step 5: Commit** — `fix(usage): preview voice calls don't consume the conversation pool or clutter the inbox`

---

### Task 7: Subscription screen — voice minutes visible

**Files:**
- Modify: `app/(client)/app/subscription/page.tsx:66-118,311-324` (load + pass usage)
- Modify: `components/client/BillingPanel.tsx:56-66,395-455` (usage prop + rows)

**Interfaces:**
- Consumes: `voiceUsageThisMonth` (service client — voice_usage has no client RLS policy), `VOICE_ADDON.minutesIncluded/previewMinutes/perMinute`.

- [ ] **Step 1: Page** — extend `loadUsage` (or a parallel loader beside it) to fetch voice usage via `createServiceClient()`:

```ts
const { widgetSecs, previewSecs } = orgId
  ? await voiceUsageThisMonth(createServiceClient(), orgId)
  : { widgetSecs: 0, previewSecs: 0 }
```
  and pass to `BillingPanel`:

```tsx
usage={{
  conversationsUsed: usage.conversationsUsed,
  conversationsLimit: ent.conversations,
  botsUsed: usage.botsUsed,
  botsLimit: ent.maxBots,
  voiceMinutesUsed: Math.floor(widgetSecs / 60),
  voiceMinutesIncluded: VOICE_ADDON.minutesIncluded,
  voiceOverageRate: VOICE_ADDON.perMinute,
  previewMinutesUsed: Math.floor(previewSecs / 60),
  previewMinutesIncluded: VOICE_ADDON.previewMinutes,
}}
```

- [ ] **Step 2: BillingPanel** — extend the `usage` prop type with those five optional numbers. After the Bots row (line ~455), when `voiceActive` render two more rows in the same pattern (divider + row):
  - **Voice minutes**: label "Voice minutes", sub-copy "Live customer calls this month — extra minutes are €0.20/min.", `{voiceMinutesUsed} used` / `{voiceMinutesIncluded} included`, `UsageProgress`. When `voiceMinutesUsed > voiceMinutesIncluded`, replace the sub-copy line with: `+{voiceMinutesUsed - voiceMinutesIncluded} extra min · €{((voiceMinutesUsed - voiceMinutesIncluded) * voiceOverageRate).toFixed(2)} so far this month`.
  - **Preview minutes**: label "Test call minutes", sub-copy "Free preview calls in the bot configurator.", `{previewMinutesUsed} used` / `{previewMinutesIncluded} included`, `UsageProgress`.
  Guard both rows with `voiceActive && usage.voiceMinutesIncluded != null`.

- [ ] **Step 3:** Visual check via dev server preview (subscription page renders; rows only for voice-active orgs). `npm test` green.

- [ ] **Step 4: Commit** — `feat(billing): show voice + preview minutes on the subscription screen`

---

### Task 8: Wiki + rollout notes

**Files:**
- Modify: `docs/wiki/voice.md` (Billing section — replace the "no metering exists" paragraph + resolve the ⚠️ verify)
- Modify: `docs/wiki/plans-and-entitlements.md` (voice metering pointer)
- Modify: `docs/wiki/log.md` (entry)

- [ ] **Step 1:** Rewrite `voice.md` Billing: duration/source captured in webhook → `voice_usage` counters via `increment_voice_usage` → overage meter events (`lib/stripe/voice-overage.ts`) on `STRIPE_PRICE_VOICE_OVERAGE`; preview = 30 min/mo gated at `app/api/preview/voice-token`; known limitation: the `call_source` dynamic variable is client-sent at session start — a tampered embed could tag live calls as preview, bounded to 30 min/mo and detectable (preview-tagged conversations without a matching authenticated preview mint).
- [ ] **Step 2:** log.md entry + plans-and-entitlements pointer.
- [ ] **Step 3:** Full `npm test` + `npx tsc --noEmit`. Commit — `docs(wiki): voice metering + preview cap`.

---

## Rollout (manual, user-facing — do NOT push to main until done)

1. Apply the migration to production Supabase.
2. Run `node scripts/setup-stripe-voice-overage.mjs` with the **live** `STRIPE_SECRET_KEY`; set `STRIPE_PRICE_VOICE_OVERAGE` in Vercel (and sandbox id in `.env.local`).
3. For any org that ALREADY has the voice add-on: toggling isn't needed for the flat fee, but the metered item must be attached — re-run `setVoiceAddon(subId, true)` per active subscriber (one-off script or via the subscription UI toggle off/on… better: one-off script calling `setAddonItem` semantics — safe because `setAddonItem` no-ops when the item exists).
4. Push to main (auto-deploys).
5. Make a short test call on a voice-enabled bot; confirm `voice_usage` row appears and the subscription screen shows minutes.

## Known limitations (accepted)

- Mint-time gating only: a single preview call can run past the remaining budget (bounded by one call's length); the next mint blocks.
- `call_source` tag is client-sent (see wiki note) — worst-case abuse is 30 min/mo of mis-tagged live minutes.
- Annual-interval subscriptions can't carry the monthly metered item (Stripe same-interval rule) — voice add-on is monthly-only today, so this matches the status quo.
- Included-200 resets on the calendar month while Stripe invoices on the billing period; overage events land on whichever invoice period they occur in. Consistent with how conversations already work.
