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

_Last verified: 2026-07-08 (66f6bb8)._
