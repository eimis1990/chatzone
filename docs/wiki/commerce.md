# Commerce

Store connectors + product search. Separate from [RAG chunks](rag-and-knowledge.md).

## Connectors (`lib/commerce/`)

- Providers: **woocommerce, shopify, magento, feed** (`lib/commerce/types.ts:1`). Configured
  per-bot in `config.commerce` — `lib/validation/schemas.ts:185-204` (provider, storeUrl,
  restKey/restSecret, shopifyDomain/shopifyToken, magentoToken, feedUrl, discount).
- `lib/commerce/index.ts` dispatches per-provider: `searchStore` (`:83`), `validateStore`
  (`:105`), `getOrderStatus` (`:133`), `getDiscount` (`:177`).
- **Order lookups only work for woocommerce and magento** — `getOrderStatus`
  (`lib/commerce/index.ts:149-153`) has no shopify/feed case, and `orderLookupEnabled`
  (`:184-188`) requires `restKey`+`restSecret` (or `magentoToken` for magento). Identity-gated:
  a match requires both order id and billing email (`lib/commerce/types.ts:42-52`).
- **Discount is a static code**, not a live coupon API — `getDiscount` (`:177-181`) just returns
  the configured `config.commerce.discount.code`/`description`.
- All outbound requests to a tenant's `storeUrl`/`feedUrl`/`shopifyDomain` are SSRF-guarded via
  `assertPublicUrl` before the real network call (`lib/commerce/index.ts:32-44`).
- **Testing notes:** crocs.lt & open24.lt block public Magento APIs — test Magento against
  `venia.magento.com` ([gotchas](gotchas.md)).

## Product search (`lib/products/`)

- `searchCatalog` (`lib/products/search.ts:69-113`): semantic match over `product_embeddings`
  (via `match_products` RPC) + **live price/stock hydration at answer time** — prices are never
  stored (`lib/products/sync.ts:27`). Falls back to live keyword search (`searchStore`) when
  there's no index yet, or the semantic path finds nothing.
- Semantic index + live hydration is supported for **woocommerce, shopify, and magento** —
  `semanticIndexSupported` (`lib/products/search.ts:45-50`). **`feed` has no live API to
  hydrate from, so it's keyword-search-only** (same file, `:49`).
- If semantic matches exist but live hydration comes back empty, that's treated as "store API
  unreachable" and surfaced as an error rather than silently falling through to keyword search
  reading as "out of stock" (`lib/products/search.ts:95-98`).
- Catalog sync (`lib/products/sync.ts:32-90`) works for the same three providers (not just
  WooCommerce); it fetches → AI-tags (`lib/products/enrich.ts`, batched via `gpt-4o-mini`) →
  embeds → full-refreshes `product_embeddings`.
- Sync is triggered two ways: manually via the **"Sync catalog"** button
  (`components/client/ConfigForm.tsx:1999` → `app/api/products/sync/route.ts`), and by a
  **nightly Vercel Cron** (`app/api/cron/catalog-sync/route.ts`) that only re-syncs bots that
  *already* have an index — the first sync is always a manual owner action.

## In chat

- `lib/ai/commerce-tool.ts` (`makeProductTools`) builds the agent's tools when
  `commerceEnabled` (any provider `storeConfigured`): `search_products` (candidates only) →
  `display_products` (agent picks which to actually show, rendered as cards), plus
  `order_status` (only if `orderLookupEnabled`) and `discount_code` (only if a discount is
  configured) — `lib/ai/commerce-tool.ts:33-152`.
- Wired into the text chat route at `app/api/chat/route.ts:209-214`, with `searchImpl` bound to
  `searchCatalog` (the semantic+live path) rather than the raw keyword `searchStore`.
- The `app/api/widget/{order,search,discount}` routes are **not** used by the text chat tools
  above — they back the **voice** agent's client tools (ElevenLabs), each origin-checked and
  rate-limited independently. See [voice](voice.md).

## Product details for the model

`searchCatalog` carries the indexed `doc` along on semantic matches as
`CommerceProduct.details` (`docToDetails` strips the title line, caps 400 chars —
`lib/products/search.ts`). `search_products` returns it to the model for the top
8 results per search (token budget; `lib/ai/commerce-tool.ts`), so the agent can
judge fit, answer product questions, and compare using categories/tags/attributes
and the longer description. Cards don't render `details`; the keyword fallback
(`searchStore`) has none. ⚠️ Details come from the synced index — a stale sync
means stale attributes; price/stock stay live-hydrated as before.

## On-demand full details (`get_product_details`)

Gated by `productDetailsSupported` — WooCommerce + Shopify (`lib/ai/commerce-tool.ts`):
up to 3 ids → `getProductDetails` (`lib/commerce/index.ts`, behind `guardStoreEgress`)
→ `fetchWooProductDetails` (public Store API `include=`) or
`fetchShopifyProductDetails` (Storefront `nodes(ids:)`, plain-text `description` +
`options` as attribute lines, skipping the synthetic "Title: Default Title").
Returns the FULL description (≤1500 chars, word-boundary truncation) plus
attribute lines ("Spalva: mėlyna, žalia"). For the model only — never rendered.
Other providers return `[]` from the dispatch and simply don't get the tool.
Unknown ids → empty list → the tool answers "No details found" (no log); infra
errors log `[agent] get_product_details failed`.

**Voice version**: the voice LLM never sees product ids (the search summary is
names-only), so its `get_product_details` client tool takes the spoken
`productName`; `app/api/widget/details/route.ts` resolves it via `searchCatalog`
top-1 and returns a spoken-summary string. Nearest-match resolution can pick the
wrong product for a bad name — the summary tells the LLM to reject clear
mismatches. Tool defined in `lib/ai/elevenlabs-agent.ts` with
`expects_response: true` (mandatory — see [voice](voice.md)); registered only
when `productDetailsSupported`; agent hash bumped to `v24-product-details` so
existing agents re-sync on the next call. Widget chain:
`VoiceCallButton` clientTool → `ChatWindow.handleVoiceProductDetails` →
`transport.getProductDetailsByName` (the preview transport stubs it).

## Card awareness across turns

The model's tool results live only within one request, but the cards a turn showed
are persisted on the assistant row (`messages.products`, migration 0013). On each
turn the chat route reads back the **last assistant message with products** and:

- injects a numbered "CARDS CURRENTLY SHOWN" block into the system prompt
  (`buildSystemPrompt`'s `shownProducts` param, `lib/ai/prompt.ts`) so "the first
  one" resolves and the agent may name/compare *shown* products in text — the one
  exception to the no-names rule. ⚠️ The block MUST include each card's `(id …)` —
  without ids the model guesses ids for `display_products` / `get_product_details`
  on later turns and both silently fail ("No details found");
- passes them to `makeProductTools` as a separate `shown` map so `display_products`
  can re-show a card by id without a fresh search. ⚠️ Keep shown cards **out of
  the `candidates` map** — the response layer's safety net auto-renders candidates
  when the model doesn't call `display_products`, and seeding it re-renders stale
  cards on every non-product turn (phantom-cards regression).

Re-shown cards carry price/stock from when they were first displayed (fine within
a live session; the widget resets on reload anyway — no cross-reload history).

_Last verified: 2026-07-11 (working tree)._
