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

_Last verified: 2026-07-08 (66f6bb8)._
