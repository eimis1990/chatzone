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
| Starter | €149 | €1,490/year |
| Growth | €249 | €2,490/year |
| Scale | €449 | €4,490/year |
| Voice agent | €49 | — |
| Product visualizer | €29 | — |
| Voice overage | €0.20/min | metered monthly |
| Setup — Essential | — | €749 once |
| Setup — E-commerce | — | €995 once |

Stable product metadata and price lookup keys make catalog provisioning
idempotent (`scripts/stripe-setup.mjs:79`, `scripts/stripe-setup.mjs:97`). Voice
overage uses the `voice_overage_minutes` Billing Meter
(`scripts/setup-stripe-voice-overage.mjs:17`).

## Environment separation

The app uses only canonical `STRIPE_*` names. Local and preview environments
hold sandbox values; Vercel Production holds live values. Keys, products,
prices, customers, portal configurations, and webhook signing secrets are all
environment-specific and must never be mixed (`lib/stripe/client.ts:16`,
`lib/stripe/plans.ts:17`, `app/api/stripe/webhook/route.ts:12`).

## 2026-08-18 sandbox state

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

## 2026-08-18 live state

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

## 2026-08-31 first live subscription — verified end to end

HomeByNB (customer `cus_VAq7C7kSkLsg9B`, UAB POP Diva, info@homebynb.lt)
subscribed to Starter monthly (€149, `loqara_starter_month`) on 2026-08-31.
Cross-checked live Stripe ↔ prod `organizations` row: sub id, customer id,
status `active`, interval `month`, and `current_period_end`
(2026-09-30T13:03:45Z) all match, so Checkout → webhook → `syncSubscriptionToOrg`
works in production. Live `/api/widget-config` serves the bot from
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
