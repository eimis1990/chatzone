# Plans & entitlements

## Source of truth

`lib/entitlements.ts` — `entitlementsFor(plan)` returns the `Entitlements` for a
plan (falls back to `free`). Fields: `maxBots`, `maxLanguages`, `leadCapture`,
`removeBadge`, `customRetention`, `teams`, `conversations`.

| Plan | maxBots | maxLanguages | leadCapture | removeBadge | teams | conv/mo |
| --- | --- | --- | --- | --- | --- | --- |
| free | 1 | 1 | – | – | – | 100 |
| starter | 2 | ∞ | ✓ | ✓ | – | 1,500 |
| growth | 5 | ∞ | ✓ | ✓ | – | 4,000 |
| scale | ∞ | ∞ | ✓ | ✓ | ✓ | 12,000 |
| enterprise | ∞ | ∞ | ✓ | ✓ | ✓ | ∞ |

> ⚠️ verify prices/copy against `lib/plans-catalog.ts` and `public/llms.txt` when
> plans change — those hold the marketing/pricing strings and must stay in sync.

## Where each limit is enforced (server-side — never trust the browser)

- **maxBots** → `createBotInOrg` (`lib/bots/create.ts`), used by both the client
  `createBot` action and the owner `createBotForOrg`.
- **maxLanguages** → `publicBotConfig` clamps served languages
  ([widget-and-embed](widget-and-embed.md)); the ConfigForm UI gates selection.
- **leadCapture / removeBadge / voice-call** → `publicBotConfig`.
- The `ConfigForm` gets the numbers via props (`maxLanguages`, `canUseLeadCapture`,
  `canUseVoice`) from the configure pages; these are UX gates only.

## Notes

- Prefer numeric limits (`maxLanguages: number`) over booleans so single-vs-many
  generalizes. `maxBots`/`maxLanguages` use `Infinity` for unlimited.
- Assertions live in `tests/unit/entitlements.test.ts`.

## Billing reconciliation

- Stripe customer IDs are cached on `organizations`, but Stripe remains the
  source of truth. A deleted customer or an ID from a different Stripe account
  returns `resource_missing`. Subscription reads narrow that error to “No such
  customer”, conditionally clear only the matching cached ID, reset the billing
  mirror to Free/Inactive, and allow the next checkout to create a replacement
  (`lib/stripe/errors.ts:1-17`, `lib/stripe/customer.ts:7-76`,
  `lib/stripe/manage.ts:10-75`). Other Stripe failures still propagate.

## Subscription add-on cards

- The client subscription page uses one shared card anatomy for active,
  available, and coming-soon add-ons: status/header, price and three benefit
  rows, then a pinned footer with a 44px action and persistent availability
  note. Keeping all action controls in `CardFooter` prevents copy length from
  shifting buttons between cards (`components/client/BillingPanel.tsx:88-184`,
  `:497-681`).

_Last verified: 2026-08-03 (89ac480)._
