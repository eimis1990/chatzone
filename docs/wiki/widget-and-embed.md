# Widget & embed

How the on-site chat widget loads and gets its config.

## Two fetch paths (important)

1. **Launcher** — `public/widget.js` runs on the *customer's* page, derives the
   app URL from its own `<script src>`, and fetches `/api/widget-config?key=…`.
   This request carries the **customer's** cross-origin `Origin` header.
2. **Iframe** — when opened, widget.js mounts an iframe at `/embed/[publicKey]`
   (served by our app). `EmbedShell.tsx` fetches `/api/widget-config`
   **same-origin**, so the browser sends **no Origin header** (GET) or our own
   host (POST).

## Config gating — `publicBotConfig` (`lib/widget-config.ts`)

The single public entry point. It strips secrets (systemPrompt, model, keys,
allowedDomains) and applies plan entitlements:

- **Languages** are clamped to the plan's `maxLanguages` around the chosen
  primary (a free bot serves its one chosen language; a downgraded bot collapses
  to its primary). See [languages-i18n](languages-i18n.md).
- Lead capture / badge / voice-call button gated per
  [entitlements](plans-and-entitlements.md) + the Voice add-on.
- Proactive greeting config is reduced to the chosen primary language before it
  reaches the browser; only trimmed text variants and display/style options are
  public (`lib/widget-config.ts:202`).

## Proactive launcher greeting

`public/widget.js` renders the greeting directly on the customer page, above the
closed launcher, so the chat iframe remains lazy. It starts its immediate/delayed
timer only after config loads, randomly chooses a variant, opens chat when the
message is clicked, and has a separate 44px dismiss target. `once_per_session`
uses `sessionStorage` keyed by public bot key; the key is written when the bubble
actually appears, not when it is merely scheduled. Opening chat cancels a pending
timer. Entrance/exit motion is opacity/transform-only and the entrance is skipped
for `prefers-reduced-motion` (`public/widget.js:159`, `public/widget.js:247`,
`public/widget.js:305`, `public/widget.js:642`).

The configurator preview is deterministic: it shows the first non-empty variant
for the active language rather than randomizing on each form render
(`components/client/TestChat.tsx:120`).

## Origin allowlist — `isOriginAllowed` (`lib/widget-auth.ts`)

- Empty `allowedDomains` → all origins allowed (setup mode).
- **First-party bypass:** no Origin (same-origin iframe GET) or the app's own
  host (SITE_URL) always pass — otherwise the iframe couldn't load its own config.
  This was the "currently unavailable" bug; see [gotchas](gotchas.md).
- Third-party parent sites must match the allowlist (host-exact, www- and
  scheme/path-insensitive via `allowedDomainToHost`).
- Onboarding auto-adds the client's site to `allowedDomains`
  (`lib/actions/onboarding.ts`).

## Embed snippet UI

- `buildEmbedSnippet(appUrl, publicKey)` (`lib/embed-snippet.ts`) builds the
  one-line `<script>`.
- The Embed screen is shared: `components/client/embed/EmbedSnippetPanel.tsx`
  (+ `SnippetCopy.tsx`), rendered by the client's Embed page **and** the owner's
  Embed tab ([access-model](access-model.md)).

_Last verified: 2026-07-08 (66f6bb8)._
