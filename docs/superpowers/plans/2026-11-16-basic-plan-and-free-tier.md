# Basic plan and Free tier implementation plan

Created 2026-11-16. Commercial scope approved by the owner. Implementation in progress on `codex/basic-plan-rollout`.

Introduce Basic for small businesses at €49/month or €490/year, with 400 conversations per month. Change Free to 50 conversations per month without live handoff. Keep existing paid tiers and their prices, and enforce the feature differences consistently across the website widget, Messenger, voice, previews, and client portal.

This is the execution checklist. Complete each phase's acceptance criteria before moving through its release gate. Record the implementation commit, test results, migration status, and deployment evidence here as work proceeds. Planning does not authorize customer charges, customer notifications, or live test purchases.

## Approved product scope

| Capability | Free after transition | Basic | Starter |
| --- | --- | --- | --- |
| Monthly price | €0 | €49 | €149 |
| Annual price | — | €490 | €1,490 |
| Conversations per calendar month | 50 | 400 | 1,500 |
| Active bots | 1 | 1 | 2 |
| Visitor languages | 1 chosen language | 1 chosen language | All supported |
| Live human handoff | No | Yes | Yes |
| Lead capture | No | Yes | Yes |
| Voice dictation in chat | No | Yes | Yes |
| Analytics | Basic usage statistics | Full analytics and CSAT | Full analytics and CSAT |
| Live product search and product cards | No | Yes | Yes |
| Live order lookup | No | No | Yes, where the connector supports it |
| Remove Loqara badge | No | No | Yes |
| Conversation top-up | Unavailable | €15 for 200 | Existing €15 for 1,000 |

Growth, Scale, and Enterprise retain their existing commercial terms and capabilities. All lower-tier features carry forward. Basic does not include team invitations or roles; the existing account user can handle chats through the Inbox. Account roles and organization access remain separate from plan permissions.

Basic uses the existing paid add-on model: Messenger €19/month, voice agent €49/month, and product visualizer €29/month remain separate purchases. Voice dictation is included in Basic and must not be confused with the voice-call add-on. Annual Basic includes 400 conversations each month, not a pooled annual allowance. Show €490/year and, if useful, €40.83/month billed annually. Preserve the existing tax treatment and currency.

Positioning: **Basic — For small businesses.** Starter adds order lookup, multiple languages, more volume, two bots, and badge removal. Do not describe Basic as “Most popular” without supporting customer data.

## Operating rules

- Included allowances and top-ups reset or expire by calendar month UTC, matching the existing usage model. Show the reset time clearly to clients; Stripe renewal dates can be different.
- Top-ups are deliberate one-time purchases, with no automatic recharge. Basic can buy repeated 200-conversation packs. Starter and higher retain their existing pack; a browser cannot select a cheaper or ineligible pack by submitting its price ID or quantity.
- Paid credits retain their purchased quantity and expiry after a plan change. Do not convert an existing 1,000-credit purchase into 200 credits. Credits increase volume only; they never grant handoff, commerce, or other paid features.
- New accounts receive the new Free policy when it launches. Existing Free accounts receive at least 30 days' notice before restrictions change. Apply that transition to every capability being withdrawn, including currently accessible detailed analytics and live commerce.
- Existing paid accounts keep their plan and price unless the customer chooses a change. Never automatically move Starter customers to Basic.
- Downgrades preserve saved configuration, credentials, transcripts, analytics history, and leads. Enforce the effective plan at runtime, pause excess active bots, and allow the customer to choose their retained bot and primary language. Re-upgrading restores eligible features without rebuilding the bot.
- Free users retain read access to their conversation history. If a visitor asks for a person, use verified business contact information where configured; do not promise that a person will join an unavailable handoff.
- Internal demo/platform organizations retain explicitly documented internal access. Being a platform owner while inspecting a real client does not silently give that client's deployed bot extra features.

## Resolved implementation decisions

The commercial choices above are settled. Phase 0 must settle these implementation details and record the outcome here:

| Detail | Proposed approach | Why it needs a decision |
| --- | --- | --- |
| What starts a new conversation allowance unit | **Approved:** a separate usage session after 24 hours of inactivity, or on the first eligible interaction in a new UTC month; preserve the existing chat thread | Messenger currently reuses a contact's thread indefinitely, so counting database conversation rows is inconsistent across channels |
| Which activity consumes an allowance unit | Reserve capacity before paid AI work; count a session once when it produces a successful automated response; exclude previews, webhook retries, empty opens, and human-only exchanges | Changing this is customer-visible metering behavior and must be specified before implementing counters |
| Voice conversation accounting | **Approved:** voice calls use the existing voice-minute allowance/overage only; no text conversation unit. Preserve current-month historical usage at cutover; future voice calls are excluded | Avoid accidentally granting unlimited calls or charging twice for a single agreed unit |
| Plan-change timing | Preserve the current immediate in-place change and Stripe proration behavior, with an explicit downgrade consequence summary | End-of-period downgrades would require subscription scheduling and must not be introduced implicitly |
| Free transition date | Set an actual UTC effective timestamp after notice delivery, with at least 30 days' notice and a visible local date | Starting a clock when code deploys could shorten the notice period if delivery fails |

The 24-hour proposal is a Loqara billing-session rule, not Meta's messaging permission window. Do not present the two as equivalent. If a different definition is selected, update the acceptance examples before coding. Do not reconstruct historical usage under a new definition or retrospectively charge customers.

## Phase 0 Inventory and impact assessment

**Outcome:** a complete change map, agreed usage definition, and identified migration cohort.

- [x] Read the wiki and applicable local Next.js guides before changing code; preserve unrelated working-tree changes.
- [x] Inventory plan unions, database constraints, validation schemas, plan-order arrays, environment schemas, catalog lists, revenue calculations, owner controls, upgrade messages, public pricing, and tests. Search for both plan IDs and assumptions such as “not Free means unlimited languages.”
- [x] Identify affected Free accounts: monthly usage, live handoffs, active bots, configured languages, live store connections, detailed analytics access, and purchased credits. Use aggregates in the plan; keep customer identifiers out of public documentation.
- [x] Record an explicit legacy-Free cohort. Free accounts created after launch, and paid accounts downgrading after launch, must not accidentally inherit legacy access based solely on organization age.
- [x] Agree the session-counting and voice rules above, with examples covering a returning Messenger contact, an old browser chat, a midnight/month boundary, retries, and an active human handoff.
- [x] Define analytics scope: Free sees allowance usage, conversation/message totals, and basic activity; Basic receives the current Starter dashboard, its 7/30/90-day views, CSAT, leads, handoff and product-performance metrics, and existing report export. Preserve data export/privacy rights independently of analytics tier.
- [x] Audit the existing “Advanced analytics” Growth claim. Do not invent a new dashboard as part of this launch; remove or clarify unsupported differentiators in current sales copy.
- [x] Audit annual Basic with every existing add-on. Messenger has matching monthly/yearly prices; Voice and Visualizer currently have monthly catalog prices. Prove supported mixed-interval billing or explicitly design compatible interval prices before offering those combinations.

**Gate:** usage semantics, annual add-on compatibility, analytics boundaries, and migration cohort are documented. No unresolved assumption may change what the customer pays for.

## Phase 1 Plan model and compatible database changes

**Depends on:** Phase 0.

- [x] Add `basic` to the TypeScript plan union and every exhaustive map. Add catalog entries, ordered plan lists, monthly/yearly price resolution, environment validation, owner plan displays, revenue breakdowns, and upgrade/downgrade comparisons.
- [x] Add explicit entitlements for live handoff, product search, order lookup, and analytics access. Use numeric limits for bots/languages and an analytics level rather than scattered plan-name comparisons.
- [x] Introduce a server-only organization policy resolver for plan, Free transition state, and documented internal exceptions. Keep `entitlementsFor(plan)` a pure base matrix; time-sensitive legacy rules belong in the organization resolver.
- [x] Create migrations through `supabase migration new`. Expand the organizations plan constraint to accept Basic. Inspect the actual production constraint name before writing the migration; do not replace the existing migration.
- [x] Store policy version/cohort and effective timestamps sufficient to reproduce legacy-Free access. Default legacy records to existing behavior until explicitly scheduled; default new accounts to the launched policy.
- [x] Add separate controls for Basic purchase availability and Free policy activation. Disabling purchases must not remove entitlements from customers who already bought Basic.
- [x] Deploy only compatible reader code before any database row or Stripe webhook can introduce Basic. Unknown plan values must not crash Home, Subscription, owner dashboards, or revenue reporting.

**Gate:** matrix tests cover every plan and legacy policy; old plans behave unchanged; migration accepts Basic; clients cannot edit their own plan or policy fields; Basic remains unavailable for purchase.

## Phase 2 Enforce capabilities across every channel

**Depends on:** Phase 1. UI gates supplement server checks.

- [x] Apply effective language, badge, lead-capture, and dictation rules on server reads and writes. A Basic customer cannot save or request a second visitor language, even through a direct API call. Preserve extra saved language content after downgrade.
- [x] Gate handoff buttons, quick actions, explicit requests, intent detection, AI/tool-triggered escalation, notifications, Inbox claim/reply actions, and external-channel human replies. Check existing `requested`/`live` chats when policy changes so Free visitors cannot become stuck waiting indefinitely.
- [x] Make disabled handoff effective in text and voice prompts. Treat prompts as behavior guidance; endpoints still enforce permissions.
- [x] Split product-search access from order-lookup access in effective commerce capabilities. Basic keeps product search, detail retrieval, supported product cards, and ordinary catalog navigation. Only Starter+ may register or execute order-status tools.
- [x] Enforce order restrictions in chat tools, direct widget endpoints, voice client/server tools, previews, and cached voice agents. Plan changes must invalidate any cached tool lists or agents carrying old capabilities.
- [x] Keep provider restrictions in addition to plan restrictions: an eligible plan cannot enable order lookup on a connector that does not support it. Existing order-number/email checks and rate limits remain required.
- [x] Keep Basic previews honest: unsupported operations show an upgrade explanation; real order data is not fetched as an ungated “preview.” Any marketing demo must use isolated demo data.
- [x] Gate detailed analytics queries, screens, and report generation before reading restricted aggregates. Keep transcripts and privacy/data-export routes accessible as designed.
- [x] Review the lead submission endpoint as well as the visible lead form, and review product-search endpoints as well as product buttons. Saved config cannot override a paid-feature check.
- [x] Preserve existing bot gender handling, knowledge refresh dates, large conversation-history pagination, Messenger entitlement checks, and abuse protections.

**Gate:** direct unauthorized calls fail without tool execution, external sends, order-data reads, or handoff notifications. Authorized Basic searches and Starter order lookups still work. Test website, Messenger, voice, and preview paths independently.

## Phase 3 Conversation usage and top-up policy

**Depends on:** Phases 0 and 1. Complete before public sale of a cross-channel allowance.

- [x] Separate usage sessions from persistent chat history if the agreed definition requires it. Introduce an idempotent, organization-scoped usage record and atomic capacity reservation; do not count by a read-then-write sequence that overspends under concurrent requests.
- [x] Use the same session resolution and quota service for website chat and Messenger. Include a defined voice adapter after the Phase 0 decision. Avoid double counting a retried message or resumed session.
- [x] Specify reservation expiry/recovery for crashed requests and release on failure before a billable response. Persist enough state to recover without both duplicate replies and duplicate allowance consumption.
- [x] Make database/read failures explicit. Do not interpret an unavailable usage count as zero and allow unlimited new sessions.
- [x] Keep existing human conversations finishable at quota exhaustion. A visitor at an otherwise exhausted paid plan may still use allowed human support; only creation of new metered AI sessions is blocked. Define handling of already-open AI sessions in the counting examples.
- [x] Implement Free 50 and Basic 400 limits, 80% warnings at 40 and 320 before top-ups, and a single displayed total allowance including purchased credits. Recalculate thresholds after purchases/upgrades without duplicate notices.
- [x] Resolve top-up offers on the server from the authoritative subscription: Basic 200/€15; Starter+ 1,000/€15; Free unavailable. Retain purchased credits and their original expiry across upgrades/downgrades.
- [x] Shadow the new counter against existing counts before activation. Explain differences caused by session rules rather than silently rewriting history. Use a cutover baseline or a month-boundary activation so current usage is neither reset nor counted twice.

**Gate:** deterministic tests cover the 49/50 and 399/400 boundaries, top-ups, concurrency at the final available slot, retries, return visits, UTC month rollover, deletion/retention of transcripts, outages, and historical-cutover behavior. Deleting transcripts must not replenish usage.

## Phase 4 Stripe catalog and payment fulfillment

**Depends on:** Phases 1 and 3. Develop and exercise money flows in the sandbox first.

- [x] Provision new prices without editing existing products/prices: Basic monthly 4,900 euro cents, Basic yearly 49,000 euro cents, and the Basic 200-conversation pack at 1,500 euro cents. Use stable metadata/lookup keys and repeatable provisioning.
- [x] Add `STRIPE_PRICE_BASIC_MONTH`, `STRIPE_PRICE_BASIC_YEAR`, and a clearly named Basic top-up price environment variable. Keep the existing larger top-up price separate. Verify amount, EUR currency, recurrence, product, tax behavior, and account/mode before marking billing ready.
- [x] Extend Checkout, subscription reconciliation, and webhook price mapping. Existing subscriptions change their base item in place; no second subscription or duplicate base-plan item.
- [x] Test both billing intervals and transitions Basic ↔ Starter/Growth/Scale. Preserve eligible add-ons and quantities. Reconcile the actual Stripe state after errors rather than displaying success from a request alone.
- [x] Keep the existing proration policy explicit. When a change requires payment or authentication, do not grant benefits merely because a pending change was requested. If payment-confirmed immediate upgrades are adopted, implement Stripe pending-update handling and its supported-payment-method constraints deliberately.
- [x] Make top-up fulfillment payment-aware and idempotent. Verify the Checkout Session's customer/org, purchased price and quantity, and payment state; derive credit quantity from an approved SKU mapping, not an arbitrary numeric metadata value alone.
- [x] Handle immediate and delayed payments, including `checkout.session.async_payment_succeeded`; an unpaid completion grants no credits. Configure the new events on the actual sandbox and production webhook destinations, not just in application code. Database failures return retryable errors.
- [x] Freeze the offer in a purchase record. A Basic customer cannot reuse an unexpired Starter top-up session to bypass eligibility: invalidate stale unpaid sessions where possible on plan changes; honor or explicitly reconcile payments that already succeeded during a race.
- [x] Record the credit month from the agreed payment/fulfillment policy. Recommended: the UTC month payment succeeds, with the expiry shown before purchase; a webhook retry in a later month must not move the credits. Resolve delayed payments near month end transparently.
- [x] Preserve the purchased quantity on replay and after a later plan change. Add reconciliation for refund/dispute handling; never silently delete spent usage or grant a second pack from repeated events.
- [x] Preserve existing tax and Managed Payments behavior. Regression-test setup-package purchases because they share the webhook handler. Do not change HomeByNB's existing subscription or merchant-of-record arrangement in this release.
- [x] Verify Basic monthly MRR €49 and annual normalized MRR €490/12. Exclude sandbox subscriptions and one-time top-ups from MRR; ensure Messenger and the other recurring add-ons are represented correctly.

**Gate:** sandbox Checkout and webhook integration tests pass for success, cancellation, failure, authentication, delayed payment, duplicate/out-of-order events, DB failure/retry, month boundaries, add-ons, and upgrades/downgrades. No real customer is charged to test the feature.

## Phase 5 Client experience and public information

**Depends on:** Phases 1–4 contracts.

- [x] Add Basic to the public pricing comparison, Subscription cards, Home upgrade prompts, owner client views, onboarding, plan descriptions, and billing dialogs. Check five-card layouts on desktop and mobile.
- [x] Show the correct top-up quantity everywhere, including the button, confirmation, Checkout line item, receipt context, and post-payment allowance. Present pending payments as pending, not credited.
- [x] Give Basic a clear description and appropriate existing or newly designed plan artwork. Keep Starter's benefits explicit; avoid “Everything in Free” copy that accidentally claims a withdrawn feature.
- [x] Show locked capabilities with a specific upgrade explanation in configuration and analytics. Product search remains configurable on Basic while order lookup controls are locked.
- [x] Before a downgrade, summarize the bots, languages, badge, order lookup, handoff, and other features affected. Keep the current month's used allowance visible; plan switching must not reset it.
- [x] Show legacy Free users their actual allowance and exact transition date. New Free users must see 50 from signup through usage warnings. Do not advertise 50 while enforcing 100 without explaining the transition.
- [x] Audit FAQ data, SEO metadata/structured pricing, `public/llms.txt`, current help pages, comparison content, and Loqara's own chatbot knowledge. Replace current offers claiming Free handoff, 100 Free conversations, or a €149 starting price. Review historical articles selectively rather than bulk-rewriting dated history.
- [x] Update wiki pages for entitlements, languages, billing, channels, commerce, analytics, and usage semantics. Keep examples and screenshots aligned with the new catalog.

**Gate:** one feature/price matrix agrees with rendered pricing, configured Stripe prices, server entitlements, and bot answers. Browser checks pass at mobile and desktop sizes with keyboard-accessible controls and no horizontal overflow.

## Phase 6 Existing customer transition and release rehearsal

**Depends on:** Phases 2–5.

- [x] Rehearse the full rollout on isolated test organizations. Local/preview Stripe tests currently can write to the production database: isolate test data and customer IDs, and do not reconcile real client subscriptions with sandbox prices.
- [x] Generate an impact report for the legacy-Free cohort, including accounts already above 50 conversations, open handoffs, and enabled commerce. Preview the policy changes without applying them.
- [x] Prepare customer notice and in-app copy describing 50 conversations, removed handoff, any other newly enforced restrictions, the effective date, retained data, and Basic as an option. The owner reviews and sends/authorizes notices; this planning task sends nothing.
- [x] Start each applicable notice window from recorded notification availability/delivery, with at least 30 days before enforcement. Failed notice delivery must not silently shorten the window.
- [x] Define a bounded handoff wind-down: stop new requests at the effective date, preserve existing active handoffs briefly for resolution, and close stale waiting states with honest visitor messaging. Record the selected duration in the runbook; no permanent Free handoff exception.
- [x] Verify already-used conversations are retained. Users above the new limit can finish permitted existing activity but cannot create new metered sessions until reset, upgrade, or an eligible credit purchase.
- [x] Ensure paid-to-Free downgrades use the new Free policy once effective and do not revive the legacy cohort. Internal demos remain separately classified.
- [x] Exercise the rollback controls before launch: disable new purchases, pause policy activation, and retain service for existing Basic subscribers.

**Gate:** no deleted data, accidental customer charges, immediate unannounced withdrawal, stuck handoffs, or reset usage. The notice cohort and rollback procedure are reproducible.

## Phase 7 Production release and verification

**Depends on:** all prior acceptance gates. Push to `main` auto-deploys production in this repository.

1. [x] Record the release commit, schema changes, environment changes, affected cohorts, validation output, and the compatible rollback deployment. Exclude unrelated workspace edits.
2. [x] Apply backward-compatible schema changes and verify constraints, RLS/grants, indexes, and migrations. Do not populate Basic plan rows before compatible application readers are deployed.
3. [x] Provision/verify live prices and webhook event configuration. Deploy the complete compatible application with Basic sales disabled and legacy-Free enforcement unchanged.
4. [x] Verify production health and allowed/denied feature calls. Confirm HomeByNB remains on its existing plan with functioning history and its previously configured female bot persona.
5. [x] Enable Basic sales only after catalog/environment checks pass. Verify the real client flow through a correctly priced Checkout page without making an unauthorized live purchase. The first actual customer purchase remains a follow-up in step 9.
6. [x] Verify an actual Basic bot: one language, badge visible, lead capture/dictation/analytics available, product search works, order lookup denied. Verify Free restrictions and Starter order lookup separately.
7. [ ] Verify Basic + Messenger with a consenting test account: connection, inbound message, AI reply, human takeover, monthly quota, and removed-add-on behavior. Include a new non-role Facebook account's connection flow when available; record that limitation if it cannot be tested.
8. [x] Release the reviewed notices and start the legacy-Free transition clock. New Free signups use the new policy immediately; enforce legacy changes only at the recorded effective date.
9. [ ] Review errors, webhook retries, unfulfilled payments, quota mismatches, and support reports during the first day and week. After the notice window, audit actual Free enforcement and stale handoffs.
10. [ ] Review Basic conversion, upgrades/downgrades, cost per conversation, top-up purchases, and support effort after the first month. Do not change the approved prices automatically based on early results.

**Rollback:** stop new Basic purchases and pause the pending Free transition first. Existing Basic customers must retain access and paid credits. After the first Basic subscription exists, never roll back to an application that does not recognize `basic`, or remove `basic` from the database constraint. Use the prepared compatible deployment or a forward fix. If metering is disabled, reconcile its records before reactivation; do not reset allowances. Catalog prices already used by customers remain intact.

## Required regression scenarios

| Area | Required evidence |
| --- | --- |
| Plan identity | Every page, action, webhook, and owner view handles Basic; unknown IDs do not crash |
| Free and legacy Free | New 50-limit behavior; 100-limit legacy grace; effective-date boundary; no inherited grace after downgrade |
| Permissions | Direct HTTP/tool calls cannot bypass handoff, language, lead, analytics, product, or order restrictions |
| Basic commerce | Each supported provider still searches/displays products; no real order lookup through text, voice, preview, or direct endpoint |
| Subscription lifecycle | Monthly/yearly signup, renewal, failed payment, pending changes, upgrade, downgrade, cancellation, and reconciliation |
| Add-ons | Messenger, voice, visualizer, annual compatibility, and no duplicate/lost items after plan changes |
| Credits | 200 vs 1,000 eligibility, paid-state checks, retries, duplicates, changed plan, refunds, and month-boundary delivery |
| Usage | One atomic final slot, concurrent bots/channels, returning contacts, previews excluded, human-only activity, transcript deletion, and DB failure |
| Downgrade | Saved settings/data preserved, extra bots paused, primary language retained, badge restored, stale voice capabilities invalidated |
| Existing fixes | HomeByNB history pagination, bot grammatical gender, knowledge refresh dates, and Messenger reply access |
| Presentation | Public and client pricing agreement, €490 annual total, correct top-up text, mobile layout, keyboard operation, and upgrade explanations |

Run focused unit tests throughout implementation, integration tests against controlled billing/database fixtures, then `npm run typecheck`, `npm run lint`, `npm test`, and `npm run build` for release. Record pre-existing failures separately with reproducible evidence; do not describe a partially failing suite as fully passing. Any new failure affecting money, access, usage, or customer history blocks launch.

## Implementation map and verified starting points

Starting code revision: `d44637d`. Paths and line numbers are navigation aids and will move during implementation.

| Area | Starting files and findings |
| --- | --- |
| Plan definitions | `lib/types.ts:15`, `lib/entitlements.ts:27`, `lib/plans-catalog.ts:26`; no Basic today |
| Database plan allowlist | `supabase/migrations/0014_billing.sql:8`; a CHECK constraint enumerates the existing plans |
| Billing | `lib/stripe/plans.ts:47`, `lib/stripe/manage.ts:79`, `lib/stripe/sync.ts:42`, `lib/env.ts`, `scripts/stripe-setup.mjs` |
| Top-up creation | `app/(client)/app/subscription/page.tsx:257`, `lib/plans-catalog.ts:137`; current single offer is 1,000 conversations |
| Top-up fulfillment | `app/api/stripe/webhook/route.ts:35`; current completion handler credits numeric metadata without a payment-status branch and chooses the processing month |
| Usage | `lib/usage.ts:38`, `app/api/chat/route.ts`, `app/api/channels/meta/webhook/route.ts:127`; current totals count conversation rows, and Messenger reuses the existing thread |
| Handoff | `app/api/widget/request-handoff/route.ts:33`, `app/api/chat/route.ts:234`, `lib/channels/processor.ts:35`, `app/(client)/app/inbox/page.tsx:76`, `lib/channels/outbound.ts`; no shared plan-level handoff gate |
| Commerce and voice | `lib/commerce/capabilities.ts`, `lib/ai/commerce-tool.ts:36`, `lib/ai/prompt.ts`, `lib/ai/elevenlabs-agent.ts`, widget/preview `search`, `details`, `order`, and voice-token routes |
| Bot configuration | `lib/widget-config.ts`, `components/client/ConfigForm.tsx`, client/owner configure routes, `lib/bots/enforce-limit.ts` |
| Analytics | `app/(client)/app/bots/[botId]/analytics/page.tsx:18`, `app/(client)/app/page.tsx:142`, `components/bot-views/AnalyticsSection.tsx:74`; currently no tier boundary on the detailed route |
| Pricing and owner reporting | `components/client/BillingPanel.tsx`, `components/landing/Pricing.tsx`, `components/landing/faq-data.ts`, `lib/billing/mrr.ts:44`, owner client pages, `public/llms.txt` |
| Existing tests | `tests/unit/entitlements.test.ts`, `usage.test.ts`, `usage-warning.test.ts`, `widget-config.test.ts`, `handoff*.test.ts`, `order*.test.*`, `stripe-*.test.ts`, `messenger-*.test.*`, `mrr.test.ts`, and language tests |

Stripe's fulfillment guidance requires payment-state checks, safe repeat fulfillment, and delayed-payment handling. Use it when replacing the shared credit handler: [Checkout fulfillment](https://docs.stripe.com/checkout/fulfillment?ui=full-page). Existing subscription changes must replace the base item instead of adding a second plan: [Change subscription prices](https://docs.stripe.com/billing/subscriptions/change-price). Payment-confirmed changes require deliberate pending-update support: [Pending updates](https://docs.stripe.com/billing/subscriptions/pending-updates).

## Completion record

- Product decisions approved 2026-11-16, including **voice minutes only**.
- Phases 0–3 implemented. Legacy cohort: eight real Free organizations, three
  with commerce, none above 50 current-month sessions, zero open handoffs.
  The 371-record current-month cutover baseline preserves prior usage.
- Five backward-compatible migrations applied and grants checked: Basic policy,
  session ledger, top-up purchases/review queue, handoff guards, channel delivery
  journal. Existing paid customer subscriptions were not changed.
- Basic catalog verified in live and sandbox accounts; live IDs are in
  [billing wiki](../../wiki/stripe-billing.md). Production Basic sales and new in-app notice windows are now enabled.
- Real sandbox API rehearsal passed monthly/annual Basic, in-place Starter
  changes, annual Basic with all mixed-interval add-ons, Checkout totals and
  declined-payment preservation. Test customers/subscriptions cleaned up.
- Hosted Postgres race: 12 requests at 399/400 admitted exactly one. Anonymous
  quota RPC rejected, failure releases capacity, same-session reuse counts once.
- Final unit + SQL suite: **148 files / 909 tests passed**. Full offline run before
  the final pause assertion: 908 tests passed; three network suites could not connect
  inside the sandbox. Network-enabled rerun: 16 passed, one **pre-existing**
  provider-neutral product-color ranking expectation failed. That test and the
  shared matcher are unchanged by this release; see wiki provider-isolation
  convention. Seven opt-in live suites remain skipped. No new billing/access/
  usage regression failed. Typecheck, lint (zero errors), and production build
  passed. Desktop and 390px mobile public pricing checked in Chrome.
- Compatible deployment `5940923`, `dpl_2sHaf6zNXG8GisiyuQakpQun8XBD`, is READY
  with Basic sales and notice windows disabled. Live webhook now subscribes to
  all ten supported events, retaining snapshot API `2026-07-29.dahlia`.
- Real sandbox **browser** checkout paid €49 and activated Basic through signed
  `invoice.paid`, `checkout.session.completed` and subscription-created events,
  all HTTP 200. A real sandbox €15 top-up credited exactly 200 once; UI showed
  600 total, its invoice was paid with Managed Payments disabled, and two signed
  replays after cancellation kept one grant and the original expiry. Delayed-payment/replay/error handling also has focused unit tests.
- Browser testing found a pre-existing Next render-fetch memoization bug:
  post-payment billing rereads could show Free while usage showed Basic. Fixed
  using a fresh AbortSignal, then verified by deliberately making the test
  billing mirror stale and observing automatic recovery on the first render.
- Production isolated-bot checks: Basic one language, badge retained, leads,
  handoff/dictation enabled; order lookup HTTP 403; known HomeByNB public-catalog
  query returned 12 products. Free lead/order/handoff HTTP 403. Basic full
  analytics/CSAT/export and Free activity-only screen verified while retaining
  data. Magento demo returned no products, so the known live WooCommerce
  catalog was used for the successful search test.
- HomeByNB remains Starter/female; 1,012 conversations retained. Final activation deployment `1891b33` /
  `dpl_7FvaQjkyRELXr8rqpQhftsRmvGtR` is READY on www.loqara.com.
- Live authenticated Checkout showed **€49/month**, the correct Basic product
  description and merchant-of-record opt-out. No payment information was entered
  and no live charge/subscription was created; the session was expired afterward.
- The isolated legacy-Free fixture recorded an effective date exactly 30 days
  after mounting its in-app notice. Two actual production chat turns delivered
  text/product output and committed exactly one usage session, with no pending
  reservation. Basic remains usable when sales are disabled; policy-pause tests
  preserve deadlines and Basic access.
- Temporary sandbox subscriptions/customers, live unpaid test Checkout/customer,
  bot, organization and login cleaned up. Local email setting restored and
  temporary Stripe forwarding stopped. Activation deployment error-log query
  returned no error entries during verification. Monthly/yearly catalog and
  ten webhook events remain configured; existing real paid accounts unchanged.
- Loqara platform chatbot override and homepage re-indexed after activation:
  70 chunks, Basic present, no stale Free/100-conversation claim. No client
  knowledge sources were changed.
- Existing Free transition audit, first real customer purchase, first-day/week
  monitoring and first-month commercial review remain future follow-up work.

### Operational boundaries

The in-app notice is authorized by the rollout request; no customer email is
sent. A deadline is set only when the notice mounts. The 24-hour handoff
wind-down applies only to already-live conversations. Controls can pause policy
per organization without deleting deadlines, and disabling Basic sales never
revokes purchased access.

Messenger has a delivery journal and duplicate-event suppression. If Meta accepts
an answer but the accounting write fails, inspect the saved delivery receipt and
reservation before repairing; never automatically resend an uncertain delivery.
This release does not introduce an automatic message outbox.

The existing real Messenger connection/inbound/reply and takeover checks passed
at the prior launch. Basic uses the same access layer; a fresh non-role customer
OAuth connection cannot be claimed without a consenting external account.

The full customer transition is complete only after the notice window and
post-transition audit; deploying the code cannot establish that future result.

### Follow-up verification still required

- Observe the first customer-authorized live payment and monitor day/week-one
  payment errors or support reports. Sandbox paid fulfillment has passed; a
  live payment has deliberately not been fabricated.
- Fresh Basic + Messenger external/non-role OAuth requires a consenting account;
  prior Loqara Page inbound/AI reply/takeover checks and shared channel unit tests
  passed. No new customer Facebook account was connected in this rollout.
- Audit each legacy Free policy after its individual 30-day notice window, then
  review first-month conversion and costs. No scheduled automation was created.
- The unrelated existing shared-matcher color-ranking integration assertion
  still fails; the provider-specific test and all new billing/access/usage tests
  pass. Do not describe the entire repository integration suite as green.
