# Stripe — go live

Everything is wired in code and works in **test mode** locally. To switch
**production** to live billing, do the steps below. (These need your live Stripe
secret key, so only you can run them — never share the key.)

## 1. Get your live secret key
In the Stripe Dashboard, toggle to **Live mode** → Developers → API keys → copy
the **Secret key** (`sk_live_…`).

## 2. Create live products/prices + the webhook
Run the provisioning script with your live key. It creates all products and
prices (Starter/Growth/Scale × month/year, Voice €49/mo, Setup Essential €749,
Setup E-commerce €995) **and** the webhook endpoint, then prints an env block.
It's idempotent (safe to re-run).

```bash
STRIPE_SECRET_KEY=sk_live_xxx node scripts/stripe-setup.mjs --live --url https://www.loqara.com
```

Copy the printed block — it includes `STRIPE_WEBHOOK_SECRET` (shown once) and all
`STRIPE_PRICE_*` IDs.

## 3. Add the env vars to Vercel (Production)
Vercel → the project → **Settings → Environment Variables**, scope **Production**:

| Variable | Value |
|---|---|
| `STRIPE_SECRET_KEY` | your `sk_live_…` |
| `STRIPE_WEBHOOK_SECRET` | from the script output (`whsec_…`) |
| `STRIPE_PRICE_STARTER_MONTH` | from output |
| `STRIPE_PRICE_STARTER_YEAR` | from output |
| `STRIPE_PRICE_GROWTH_MONTH` | from output |
| `STRIPE_PRICE_GROWTH_YEAR` | from output |
| `STRIPE_PRICE_SCALE_MONTH` | from output |
| `STRIPE_PRICE_SCALE_YEAR` | from output |
| `STRIPE_PRICE_VOICE_MONTH` | from output |
| `STRIPE_PRICE_SETUP_ESSENTIAL` | from output |
| `STRIPE_PRICE_SETUP_ECOMMERCE` | from output |
| `NEXT_PUBLIC_APP_URL` | `https://www.loqara.com` (checkout return URLs use it) |

## 4. Redeploy
Env changes need a fresh deploy:

```bash
vercel --prod --yes
```

## 5. Verify
Log in → **/app/subscription**. Billing should now be enabled (plans
purchasable, voice add-on available). Do a real purchase to confirm, or rehearse
in test first.

---

## Rehearse in test first (recommended)
You're already configured in test locally. Run the app, open `/app/subscription`,
and use Stripe test card `4242 4242 4242 4242` (any future expiry / any CVC). To
receive webhooks locally:

```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

## Notes
- Creating products/prices/webhooks moves **no money** — it's configuration.
- The webhook the script creates points to `https://www.loqara.com/api/stripe/webhook`
  with events: `checkout.session.completed`, `customer.subscription.created`,
  `customer.subscription.updated`, `customer.subscription.deleted`.
- Test and live price IDs differ — production uses the live ones from Vercel.

---

## Tax / VAT (money hygiene)

The code is ready but OFF by default. Checkout only starts collecting tax after
you set `STRIPE_TAX_ENABLED=true` — and that must come LAST, because enabling
it before the dashboard setup makes Checkout session creation fail.

Do these in order, in the **live** Stripe dashboard:

1. **Enable Stripe Tax** — Settings → Tax. Confirm your origin address
   (Lithuania) and activate. Pricing: 0.5% only on transactions where tax is
   calculated; monitoring is free.
2. **Add your registration** — Settings → Tax → Registrations. Add Lithuania
   with your VAT code (if you're VAT-registered). Selling B2C into other EU
   countries later? Register for OSS (One-Stop Shop) via VMI and add the "EU
   OSS" registration here. If you're not VAT-registered yet, Stripe Tax still
   monitors thresholds and tells you when registration becomes required.
3. **Set the default tax category** — Settings → Tax → set the preset product
   tax code to "Software as a service (SaaS) — business use". All our prices
   inherit it; no per-product edits needed.
4. **Prices stay tax-EXCLUSIVE** (current behavior): €49 + VAT on top. EU
   businesses that enter a valid VAT ID in Checkout get reverse charge (0%)
   automatically — that's what `tax_id_collection` enables.
5. **Invoice emails** — Settings → Billing → Invoices: enable emailing
   finalized invoices/receipts to customers. Also add your company details
   (name, address, VAT code) under Settings → Business → Public details so
   they appear on invoices.
6. **Flip the switch** — add `STRIPE_TAX_ENABLED=true` in Vercel (Production)
   and redeploy. From then on Checkout collects billing address + VAT ID and
   itemizes tax; one-time setup packages also generate proper invoices.

Existing subscriptions created BEFORE this (test purchases) won't have
automatic tax — only new Checkouts do. Fine while you have no real subscribers;
any that exist can be recreated.

Talk to your accountant about: whether you must register for VAT now
(Lithuania's threshold: €45,000/12mo), and OSS timing.
