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

The greeting dismiss control uses its own 16px/2px-stroke X so it matches the
configurator preview. Do not reuse the launcher's 24px close icon here; that icon
is intentionally larger for the launcher control (`public/widget.js:158`).

On Loqara's landing page, `WidgetEmbed` owns the loader lifecycle. Because the
loader mounts outside React under `<body>`, its effect cleanup must remove every
widget surface together: launcher, greeting, iframe wrapper, pulse rings, and
the injected script. Missing the independently mounted greeting leaves an
orphan prompt after client-side navigation (`components/landing/WidgetEmbed.tsx:19`).

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

## Bare-apex embeds (loqara.com vs www)

A snippet typed with the apex domain (`https://loqara.com/widget.js`) loads the
script and the iframe fine (redirects are followed for those), but the parent
page's `fetch` of `/api/widget-config` dies: the apex→www 308 from Vercel's
domain redirect layer carries **no CORS headers**, and a CORS fetch must pass
the check on every hop. Symptoms: default purple launcher + 16px white panel
peeking behind the fully-themed chat (the iframe fetches config same-origin, so
it always themes). `widget.js` now canonicalizes `loqara.com` → `www.loqara.com`
when deriving `appUrl` (public/widget.js, "Bare-apex embeds" comment); test in
`tests/unit/widget-loader.test.ts`. Found live on homebynb.lt 2026-08-23.

## Embed snippet UI

- `buildEmbedSnippet(appUrl, publicKey)` (`lib/embed-snippet.ts`) builds the
  one-line `<script>`.
- The Embed screen is shared: `components/client/embed/EmbedSnippetPanel.tsx`
  (+ `SnippetCopy.tsx`), rendered by the client's Embed page **and** the owner's
  Embed tab ([access-model](access-model.md)).

## First-paint theme continuity

The host loader already has the public theme before a normal launcher click. It
passes the accent (`c`) and chat background (`bg`) as paint-only query values on
the lazy `/embed/[publicKey]` URL and applies the background behind the iframe
itself (`public/widget.js:693`). The server page validates those values and
server-renders `EmbedShell`'s loading/error surface with them, so initial opens
and hard iframe reloads do not flash the app's white root background
(`app/embed/[publicKey]/page.tsx:24`, `app/embed/[publicKey]/EmbedShell.tsx:62`).
After config loads, `ChatWindow` also uses the configured chat background while
the visitor-block check is pending (`components/widget/ChatWindow.tsx:985`). The
restart confirmation sheet uses that same background, with theme-aware copy and
secondary-button contrast instead of a hard-coded white surface
(`components/widget/ChatWindow.tsx:1501`).

## Conversation continuity across page navigations

Each navigation on the host site destroys and recreates the chat iframe, so
`ChatWindow` persists the conversation id in iframe-origin localStorage
(`cbz_conv_<publicKey>`, `{id, ts}`; ts refreshed per message) and resumes it on
mount when it's under 24h old (`RESUME_WINDOW_MS`): transcript via the existing
`/api/messages`, handoff status/agent via one `poll` call — no new endpoints.
Restored turns are text-only (product cards etc. aren't persisted). The server
rebuilds model context from the conversation id, and `/api/chat` re-verifies the
visitor id on the next send, so a stale id silently starts a fresh conversation.
The `persistKey` prop gates all of it: `EmbedShell` passes the public key; the
configurator preview omits it and always starts fresh. Restart ("Start new
conversation") removes the stored key. Tests:
`tests/unit/chat-window-resume.test.tsx` (note: this jsdom/Node pairing has no
localStorage — the test stubs it via `vi.stubGlobal`).

## Temporary visitor blocks

The live iframe checks its browser-local visitor id before rendering interactive
chrome. An active block replaces the entire widget with the white/red blocked
screen; chat responses can trigger the same state through an exposed expiry
header. Preview transport stays unblocked. See
[visitor-abuse-protection](visitor-abuse-protection.md).

_Last verified: 2026-08-03._
