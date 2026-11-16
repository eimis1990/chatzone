# Stripe billing

Loqara uses Stripe-hosted Checkout for self-serve plans and one-time setup
packages, the Customer Portal for billing self-service, and a signed webhook to
mirror subscription state into `organizations`.

## Runtime flow

- Paid plans use Checkout `mode=subscription`; setup packages use
  `mode=payment` with `invoice_creation.enabled`, so both paths create customer
  invoices (`app/(client)/app/subscription/page.tsx:153`,
  `app/(client)/app/subscription/page.tsx:192`).
- Existing subscriptions are changed in place instead of starting a second
  Checkout. The portal is used for payment details, invoice history, and
  cancellation (`app/(client)/app/subscription/page.tsx:166`,
  `app/(client)/app/subscription/page.tsx:268`).
- The webhook verifies the raw body and handles Checkout completion plus
  subscription create/update/delete events (`app/api/stripe/webhook/route.ts:8`).
- Stripe customer ids are account-specific. If an organization points at a
  customer from a different Stripe account, the customer helper resets the
  stale billing cache and creates a customer in the configured account on the
  next Checkout (`lib/stripe/customer.ts:7`, `lib/stripe/customer.ts:41`).

## Catalog

The self-serve catalog is EUR, tax-exclusive:

| Item | Monthly | Annual / one-time |
|---|---:|---:|
| Basic | €49 | €490/year |
| Starter | €149 | €1,490/year |
| Growth | €249 | €2,490/year |
| Scale | €449 | €4,490/year |
| Voice agent | €49 | — |
| Product visualizer | €29 | — |
| Messenger (one Facebook Page) | €19 | €228/year |
| Voice overage | €0.20/min | metered monthly |
| Setup — Essential | — | €749 once |
| Setup — E-commerce | — | €995 once |

Stable product metadata and price lookup keys make catalog provisioning
idempotent (`scripts/stripe-setup.mjs:79`, `scripts/stripe-setup.mjs:97`). Voice
overage uses the `voice_overage_minutes` Billing Meter
(`scripts/setup-stripe-voice-overage.mjs:17`).

## Messenger launch — 2026-11-16

Live product `prod_VdbmUXby8wFy3E`; monthly price
`price_1UcKYnBPga6Qu0zHDwnqwPu6`, yearly `price_1UcKYnBPga6Qu0zHX6th7ny6`.
Lookup keys: `loqara_messenger_month` / `loqara_messenger_year`. Both preserve
existing SaaS tax code and exclusive tax behavior. Production env names are
`STRIPE_PRICE_MESSENGER_MONTH` / `STRIPE_PRICE_MESSENGER_YEAR`; provision separate
sandbox prices before testing real Stripe calls locally (`lib/stripe/plans.ts:17`).

`setMessengerAddon` adds/removes only the Messenger item, prorates through the
existing subscription, and synchronizes immediately; webhooks reconcile later.
No-op calls also heal missed syncs. Database sync errors throw so Stripe can retry.
An active recognized base plan is required, and annual plan changes swap both
items together (`lib/stripe/manage.ts:79`, `lib/stripe/manage.ts:151`,
`lib/stripe/sync.ts:84`). Removing the item stops both bot and human Messenger
replies while keeping conversation history. See [channels](messaging-channels.md).

## Environment separation

The app uses only canonical `STRIPE_*` names. Local and preview environments
hold sandbox values; Vercel Production holds live values. Keys, products,
prices, customers, portal configurations, and webhook signing secrets are all
environment-specific and must never be mixed (`lib/stripe/client.ts:16`,
`lib/stripe/plans.ts:17`, `app/api/stripe/webhook/route.ts:12`).

## 2026-08-18 sandbox state (historical)

- Destination: `acct_1U5pvKBtWM4Edzrx` (`MB Lokara sandbox`, Lithuania, EUR).
- Complete catalog: 8 active products, 11 active prices, including the voice
  Billing Meter.
- Webhook `we_1U5q7OBtWM4EdzrxM3DzWUei` targets
  `https://www.loqara.com/api/stripe/webhook` with exactly the four events the
  handler consumes.
- Default Customer Portal `bpc_1U5qB6BtWM4EdzrxtphePlaA` exposes customer
  details, payment methods, invoice history, and end-of-period cancellation.
- The legacy test account still has one active test subscription (Growth +
  Voice). It was deliberately not cancelled as part of catalog migration.
- The Codex Stripe connection and local keys point to the sandbox. Live mode is
  configured separately through Vercel Production and a live webhook endpoint.

## 2026-08-18 live state (historical)

- Destination: `acct_1U5pvCBPga6Qu0zH` (`MB Lokara`).
- The copied live catalog contains 8 active products, including the metered
  voice-overage product. Live price ids still need to be collected and verified
  before the Production environment is populated.
- Live webhook `we_1U5sH6BPga6Qu0zHCUsOMuZl` targets
  `https://www.loqara.com/api/stripe/webhook`, enabled, with exactly the four
  events the handler consumes (verified 2026-08-31 via API).
- The live Customer Portal has invoice history, customer information, payment
  methods, and end-of-period cancellation enabled. Plan switching remains off,
  as required by the application-managed subscription flow.
- Account verification is complete: `charges_enabled` and `payouts_enabled`
  are both true, no requirements due (verified 2026-08-31).

## Managed Payments (Stripe as merchant of record) is ON by default — we opt out

Both the live account and its sandbox have Stripe **Managed Payments** enabled
by default (verified 2026-09-30 by creating and expiring Checkout Sessions on
both). Every Checkout Session that doesn't pass `managed_payments[enabled]=false`
inherits it: Stripe becomes the merchant of record, the invoice is issued by
Stripe (`invoice.issuer.type = "stripe"`, `account_name = "Link"`, US), Stripe
handles VAT, and products **must** carry a `tax_code` — the two setup packages
and the conversations top-up have none, so their Checkout creation failed with
"Invalid line_items[0]: the product tax code is missing". Plan products have
`txcd_10103001` and therefore succeeded *silently under MoR*.

Fix: `checkoutTaxParams()` now always returns `managed_payments: { enabled: false }`
and every `checkout.sessions.create` call spreads it (`lib/stripe/client.ts:56`,
`app/(client)/app/subscription/page.tsx:214`, `:247`, `:284`). Unit check:
`tests/unit/stripe-checkout-params.test.ts`. The account-level default can also
be switched off in the Dashboard (Settings → Managed Payments); the code opt-out
stays regardless, so a future default flip can't re-enable it.

⚠️ The 2026-08-31 HomeByNB subscription `sub_1UAUsKBPga6Qu0zHF8wL3qv2` was
created *with* Managed Payments (`subscription.managed_payments.enabled = true`);
its first invoice `0SPFYCSI-0001` is Stripe-issued (reverse charge, €0 VAT), not
an MB Lokara invoice. The SDK has no `managed_payments` on subscription update,
so the only way off is cancel + re-subscribe through the (fixed) Checkout.
Decision pending with the owner.

If we ever *want* MoR instead: drop the opt-out and set `tax_code` on the three
products that lack it (`prod_V62AXMOq5xdHZa`, `prod_V62ATaWCESs5H4`,
`prod_V6p5xQJ6pziCde`).

## 2026-08-31 first live subscription — verified end to end

HomeByNB (customer `cus_VAq7C7kSkLsg9B`, UAB POP Diva, info@homebynb.lt)
subscribed to Starter monthly (€149, `loqara_starter_month`) on 2026-08-31.
Cross-checked live Stripe ↔ prod `organizations` row: sub id, customer id,
status `active`, interval `month`, and `current_period_end`
(2026-09-30T13:03:45Z) all match, so Checkout → webhook → `syncSubscriptionToOrg`
works in production — but see the Managed Payments section above: this
subscription runs under Stripe-as-MoR. Live `/api/widget-config` serves the bot from
`homebynb.lt` and 403s foreign origins.

## Sandbox subs vs revenue metrics

Local/preview environments use sandbox Stripe keys but share the prod DB, so a
sandbox checkout (e.g. the owner's 3IMIS test org) writes a real-looking
paid-plan row. `syncSubscriptionToOrg` now persists `organizations.stripe_livemode`
from the subscription, and `computeMrr` skips rows where it is `false` — sandbox
subs keep their entitlements for testing but never count toward MRR/ARR/paying
clients on the owner dashboard (`lib/stripe/sync.ts`, `lib/billing/mrr.ts:44`,
migration `20260831154220`). `NULL` (legacy, pre-column) is treated as live.

Note: **no subscription ≠ dead widget.** A lapsed/absent subscription drops the
org to the `free` plan (`lib/stripe/sync.ts:64`): extras beyond 1 bot are
paused, but the oldest bot keeps serving with free entitlements until the
100-conversations/month hard block in `/api/chat` (`lib/usage.ts:101`). This is
by design (grace degradation), not a bug.

## Accounting and go-live

Stripe is the payment/invoice source, not the Lithuanian general ledger. The
Dashboard can export invoice PDFs, payout reconciliation, and itemized Balance
summary CSVs for the accountant. Live invoices must first be checked for the
legal seller name, company code, registered address, and the correct VAT wording.
See `STRIPE_GO_LIVE.md` and Stripe's [Balance summary
report](https://docs.stripe.com/reports/balance).

## Basic rollout — 2026-11-16

Basic prices use lookup keys `loqara_basic_month`, `loqara_basic_year` and
`loqara_basic_conversations_200`; `scripts/provision-basic.mjs` verifies account,
EUR amounts, recurrence and tax treatment without editing older prices.
Production IDs: month `price_1UcLoNBPga6Qu0zH6ioKc2o5`, year
`price_1UcLoNBPga6Qu0zHzO3MDcVa`, 200-pack `price_1UcLoOBPga6Qu0zHcoNASE6L`.
Env: `STRIPE_PRICE_BASIC_MONTH`, `STRIPE_PRICE_BASIC_YEAR`,
`STRIPE_PRICE_BASIC_CONVERSATIONS`. Existing Starter+ pack remains €15/1,000.

SDK requests pin `2026-10-28.endive` (`lib/stripe/client.ts:24`). New Checkout
subscriptions use flexible billing. Existing subscriptions migrate only when a
customer requests a combination needing mixed intervals. Sandbox API testing
proved annual Basic + annual Messenger + monthly Voice/Visualizer/voice meter.
The base item's period defines the displayed renewal. Base item replacement
preserves one subscription, uses `create_prorations` and
`error_if_incomplete`; failed payment does not grant the requested upgrade.

Subscription events re-read current customer subscriptions, preventing an old
cancellation from removing a newer plan (`lib/stripe/reconcile-event.ts:8`).
Top-up offers are frozen in `conversation_topup_purchases`, checked against the
current Stripe subscription, then fulfilled from a paid session's verified SKU,
customer, quantity and amount (`lib/stripe/topups.ts:15`). Unpaid completion grants
nothing; async success and replay are supported. Credits expire in the UTC
payment month, not webhook retry month. Database failures return HTTP 500.
Setup-package paid-order writes retain idempotency and now also require payment.

Additional webhook events: `checkout.session.async_payment_succeeded`,
`invoice.paid`, `invoice.payment_failed`, `charge.refunded`,
`charge.dispute.created`, `radar.early_fraud_warning.created`. The live endpoint's
existing snapshot version is retained; subscription state is freshly retrieved.
The old sandbox endpoint above **no longer existed** on 2026-11-16: local
rehearsal uses a temporary Stripe CLI signed-event forwarder. Never point sandbox
events at the live-key production handler.

Refund/dispute/fraud events enter service-only `billing_review_events`; Owner
Home shows the unresolved count. Inspect Stripe customer/payment IDs and the
related purchase/credits before adjusting anything. Never delete consumed usage
or issue duplicate credits. Record the reviewed outcome in the incident record and set `resolved_at`
on that event after reconciliation; do not mark unresolved money
issues complete merely to clear the badge.

Sales/transition controls and rollback are in [entitlements](plans-and-entitlements.md).
Test scripts create tagged sandbox customers/isolated orgs and clean them up;
never reconcile a real client using sandbox price IDs.
