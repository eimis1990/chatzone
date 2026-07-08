# Gotchas

Sharp edges that have bitten us. Read before debugging something weird.

## Widget shows "This chatbot is currently unavailable"

The embed iframe (served by our app) fetches `/api/widget-config` **same-origin**,
so a same-origin GET carries **no `Origin` header**. If a bot has a non-empty
`allowedDomains`, `isOriginAllowed` used to reject the missing origin → 403 →
that message. Fixed in `lib/widget-auth.ts`: **first-party requests (no Origin,
or the app's own host) bypass the allowlist**; the allowlist only governs
third-party parent sites (which always send a cross-origin Origin). Onboarding
now auto-adds the client's domain to `allowedDomains`, which is what first
exposed this. See [widget-and-embed](widget-and-embed.md).

## `npx vitest` fails with ERR_REQUIRE_ESM

Use `npm test` — it sets the required `--experimental-require-module` flag. See
[conventions](conventions.md).

## Markdown inside raw HTML blocks doesn't render

`marked` treats a block-level HTML element as a raw HTML block and does **not**
parse markdown inside it. Use `<strong>`/`<em>`, not `**`/`_`, inside
`<blockquote>`/`<div>` in blog posts.

## `content.en` is no longer guaranteed

Bot config `content` is now a fully-optional per-language record (a bot can be
Lithuanian-only). Never assume `config.content.en` exists — use optional access
and fall back (`content[lang] ?? content.en ?? Object.values(content)[0]`). See
[languages-i18n](languages-i18n.md).

## Plan limits must be enforced server-side

`allowedDomains`, `maxLanguages`, `maxBots`, etc. — the ConfigForm UI gates are
convenience only. The authoritative enforcement is in `publicBotConfig`
(`lib/widget-config.ts`) for the widget and `createBotInOrg` for bot creation. A
downgraded client can still hold stale over-limit config; the serve-time clamp is
what protects the product.

## Magento public APIs

crocs.lt and open24.lt block public Magento APIs — test Magento connectors
against `venia.magento.com`. See [commerce](commerce.md).

## Concurrent sessions on this checkout

More than one agent session sometimes commits to this working copy. If history
looks scrambled, check `git log`/reflog before assuming your work was lost.

_Last verified: 2026-07-08 (66f6bb8)._
