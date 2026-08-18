# Stripe — MB Lokara go live

The complete catalog, Billing Meter, webhook, Customer Portal, and local env are
configured in **MB Lokara sandbox** (`acct_1U5pvKBtWM4Edzrx`). The live account
is **MB Lokara** (`acct_1U5pvCBPga6Qu0zH`); its 8-product catalog and Customer
Portal are present. On 2026-08-18, the owner reported creating the live webhook
and populating all 11 live price ids in Vercel Production; the next deployment
and live smoke test still need to verify the configuration. Stripe previously
showed a past-due business-verification document request with live payments and
payouts paused, so confirm that restriction is cleared before the smoke test.

## 1. Activate the live legal account

Complete Stripe's account onboarding using:

- Legal name: **MB Lokara**
- Company code: **308101926**
- Registered address: **Perkūnkiemio g. 19, LT-12120 Vilnius, Lithuania**
- Public brand: **Loqara**
- Website: **https://www.loqara.com**
- Business: B2B SaaS providing AI chat and voice assistants
- VAT: not registered (confirm invoice wording and the future registration
  trigger with the accountant)

Add an EUR payout bank account/IBAN held by the business, or otherwise accepted
by Stripe for the legal entity. A business payment card is **not** required for
standard payouts. Also add a support email, enable 2FA, and confirm the statement
descriptor customers will recognize.

## 2. Get the live runtime key

After Stripe enables live mode, create a restricted live key (`rk_live_…`) with
only the permissions the runtime needs. A live secret key (`sk_live_…`) can be
used temporarily if necessary. Never commit or paste either key into a ticket.

## 3. Verify the live catalog and create the webhook

The live catalog has already been copied. Verify every live price id before
putting it into Vercel; do not infer that a sandbox price id is valid in live
mode even when the products have matching names.

If the catalog ever needs to be repaired, the provisioning script is
idempotent:

```bash
STRIPE_SECRET_KEY=sk_live_xxx node scripts/stripe-setup.mjs --live --url https://www.loqara.com
```

Create the live voice-overage meter and copy its price id too:

```bash
STRIPE_SECRET_KEY=sk_live_xxx node scripts/setup-stripe-voice-overage.mjs
```

Create a live webhook destination for
`https://www.loqara.com/api/stripe/webhook` with these four events:

- `checkout.session.completed`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`

Copy the new live `whsec_…` signing secret when Stripe shows it. The sandbox
webhook and its signing secret do not carry over to live mode.

In **Live mode → Settings → Billing → Customer portal**, enable payment-method
updates, invoice history, customer details, cancellation at period end, and
cancellation reasons. Keep subscription switching disabled because the Loqara
app already changes base plans while preserving add-ons.

## 4. Add the live env vars to Vercel

Vercel → the project → **Settings → Environment Variables**, scope **Production**:

| Variable | Value |
|---|---|
| `STRIPE_SECRET_KEY` | live restricted `rk_live_…` key, or `sk_live_…` temporarily |
| `STRIPE_WEBHOOK_SECRET` | live endpoint `whsec_…` |
| `STRIPE_PRICE_STARTER_MONTH` | from output |
| `STRIPE_PRICE_STARTER_YEAR` | from output |
| `STRIPE_PRICE_GROWTH_MONTH` | from output |
| `STRIPE_PRICE_GROWTH_YEAR` | from output |
| `STRIPE_PRICE_SCALE_MONTH` | from output |
| `STRIPE_PRICE_SCALE_YEAR` | from output |
| `STRIPE_PRICE_VOICE_MONTH` | from output |
| `STRIPE_PRICE_VOICE_OVERAGE` | from the meter script |
| `STRIPE_PRICE_VISUALIZER_MONTH` | from output |
| `STRIPE_PRICE_SETUP_ESSENTIAL` | from output |
| `STRIPE_PRICE_SETUP_ECOMMERCE` | from output |
| `NEXT_PUBLIC_APP_URL` | `https://www.loqara.com` |

Use the canonical `STRIPE_*` names for both environments: sandbox values in
local/preview environments and live values in Vercel Production.

On 2026-08-18, the owner reported populating all 11 live price ids and creating
the live webhook. Before redeploying, confirm that `STRIPE_SECRET_KEY` and the
new live `STRIPE_WEBHOOK_SECRET` are populated too. Production will not consume
the new environment values until a fresh deployment is created.

Redeploy after changing environment variables.

## 5. Verify before inviting clients

1. In sandbox, buy Starter monthly with a Stripe test card and confirm the org
   becomes Starter.
2. Open **Manage billing** and confirm invoice history/payment-method update.
3. Enable and disable Voice; confirm the flat and metered items stay together.
4. Buy a setup package; confirm an invoice PDF and a `setup_orders` row exist.
5. Inspect webhook deliveries for HTTP 200 responses.
6. In live mode, make one low-value real purchase/refund and give the invoice,
   itemized Balance summary CSV, and payout reconciliation export to the
   accountant for approval.

For local webhook testing:

```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

Use Stripe test card `4242 4242 4242 4242` with any future expiry and CVC.

## Notes

- Creating products, prices, meters, portals, and webhooks moves no money.
- A publishable key is not used by this integration because Checkout and the
  Customer Portal are Stripe-hosted and their sessions are created server-side.
- Test and live keys, customers, products, price ids, webhook secrets, and
  portal configurations are separate.

## Tax / VAT

`STRIPE_TAX_ENABLED` remains off. Do not turn it on until Stripe Tax has a head
office address, the correct product classification, and every legally required
registration; otherwise Checkout can fail or calculate zero because the account
is not registered to collect.

The sandbox SaaS and add-on products use **Software as a Service (SaaS) —
Business Use**. The two implementation-service products are left unclassified
for the accountant to confirm. Add VAT/OSS registrations only after MB Lokara is
actually registered—do not enter a placeholder VAT number.

Once the accountant approves the setup, enable invoice/receipt emails and then
set `STRIPE_TAX_ENABLED=true` in production if Stripe Tax should calculate tax.
