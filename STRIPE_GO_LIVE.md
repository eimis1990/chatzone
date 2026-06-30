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
