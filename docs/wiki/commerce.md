# Commerce

Store connectors + product search. Separate from [RAG chunks](rag-and-knowledge.md).

## Connectors (`lib/commerce/`)

- Providers: **woocommerce, shopify, magento, verskis, feed** (`lib/commerce/types.ts:1`). Configured
  per-bot in `config.commerce` — `lib/validation/schemas.ts:256-275` (provider, storeUrl,
  restKey/restSecret, shopifyDomain/shopifyToken, magentoToken, feedUrl, discount).
- `lib/commerce/index.ts` dispatches per-provider: `searchStore` (`:98`), `validateStore`
  (`:175`), `getOrderStatus` (`:205`), `getDiscount` (`:249`).
- **Order lookups only work for woocommerce and magento** — `getOrderStatus`
  (`lib/commerce/index.ts:205-225`) has no shopify/verskis/feed case, and `orderLookupEnabled`
  (`:256-260`) requires `restKey`+`restSecret` (or `magentoToken` for magento). Identity-gated:
  a match requires both order id and billing email (`lib/commerce/types.ts:50-57`).
- **Discount is a static code**, not a live coupon API — `getDiscount` (`:249-252`) just returns
  the configured `config.commerce.discount.code`/`description`.
- **Verskis uses storefront HTML, not a JSON API** (`lib/commerce/verskis.ts:35-215`): validation detects
  `<meta name="generator" content="Verskis">`, discovers the localized public search form, counts
  the product sitemap, and parses live search/category cards for current price/image/availability.
  Product cards keep opaque numeric `data-pid` ids so the model cannot print their URLs as Markdown
  links. `get_product_details` resolves those ids through the candidate/current-card map to the
  same-origin product URL across turns, then fetches the main page's description and full `Savybės`
  table. Detail parsing stops before
  `alternative_goods`/`related_goods`; otherwise recommendation-card dimensions/colors contaminate
  the inspected product. Live keyword search concurrently enriches its selected cards with those
  full attributes as model-only `details`, so exact color/dimension filters do not require several
  serial tool batches (live regression: `sofa` result #8, CA95931, exposes `Spalva: Kapučino`).
  Search results are also capped at `results_total` because Mobel appends
  unrelated recommendation carousels after the real matches, including explicit zero-result pages
  (`lib/commerce/verskis.ts`). Configurable products sometimes omit `offers.price` from JSON-LD;
  the parser falls back to the visible main `strong.price[data-pricenew]` before recommendation
  blocks, otherwise valid products such as CA60511/GA76681 disappear during live hydration
  (`lib/commerce/verskis.ts:207-217`). Verskis has no order lookup, but its product sitemap + structured
  product pages now support full semantic catalog sync (below). Because WooCommerce is the
  configurator default, `/api/commerce/validate` retries failed Woo validation as Verskis and tells
  both configurators to persist `provider: 'verskis'`; this is why pasting `mobel.lt` works without
  knowing its platform first (`app/api/commerce/validate/route.ts:48-82`,
  `components/client/ConfigForm.tsx:2200-2250`, `components/client/onboarding/StepStore.tsx:61-91`).
- All outbound requests to a tenant's `storeUrl`/`feedUrl`/`shopifyDomain` are SSRF-guarded via
  `assertPublicUrl` before the real network call (`lib/commerce/index.ts:32-44`).
- **Testing notes:** crocs.lt & open24.lt block public Magento APIs — test Magento against
  `venia.magento.com` ([gotchas](gotchas.md)).
- ⚠️ **Some stores block datacenter egress entirely**: dropslietuva.com (Woo behind
  Cloudflare) accepts the same request from a residential IP but rejects it from
  Vercel — an IP/ASN-level bot rule, so headers don't help (we send browser-like
  `STOREFRONT_HEADERS` on all storefront fetches anyway, since that fixes the
  cheaper header-scoring case). Diagnose by comparing `/api/commerce/validate` on
  localhost vs production. For such stores the client must add a WAF exception for
  `/wp-json/wc/store/*` (or disable Bot Fight Mode) — read-only public data. Until
  then, validate/sync/hydration ALL fail from prod, so a demo bot cannot run
  against their store from Vercel.

## Product search (`lib/products/`)

- `searchCatalog` (`lib/products/search.ts`): semantic match over `product_embeddings`
  (via the selected [provider profile](commerce-provider-profiles.md)) + **live price/stock hydration at answer time** — prices are never
  stored (`lib/products/sync.ts:27`). Falls back to live keyword search (`searchStore`) when
  there's no index yet, or the semantic path finds nothing.
- Semantic index + live hydration is supported for **woocommerce, shopify, magento, and verskis** —
  `semanticIndexSupported` (`lib/products/search.ts`). Verskis stores its numeric JSON-LD
  `productID` as `external_id` and the product URL in the existing `url` column; semantic matches
  hydrate current price/stock concurrently from those product pages via
  `fetchVerskisProductsByRefs`. The profile selects `match_products_verskis`, whose rows retain the
  existing `url` field. **Feed remains keyword-only.** If a bot changes stores while an old index remains,
  a Verskis origin check rejects those stale match URLs and falls back to live keyword search until
  the next sync upsert/prunes them (`lib/products/provider-profiles/verskis.ts`).
- Verskis broad browse retrieval deliberately asks its matcher for at least 32 candidates, hydrates
  product pages with an ordered eight-worker pool (one retry, 60-row ceiling), then trims to the
  requested 20/24 live cards (`lib/products/provider-profiles/verskis.ts:172-185`,
  `lib/commerce/verskis.ts:291-340`, `lib/products/search.ts:86-122`). This absorbs stale/unparseable
  pages without fetching an entire 50-500 item category. The profile also canonicalizes `sofa-lova`
  to the structured sleeping-function query for semantic matching; keyword fallback retains the
  original shopper query (`lib/products/provider-profiles/verskis.ts:19-29`).
- If semantic matches exist but live hydration comes back empty, that's treated as "store API
  unreachable" and surfaced as an error rather than silently falling through to keyword search
  reading as "out of stock" (`lib/products/search.ts:95-98`).
- **Store page URLs as queries**: a URL *anywhere* in the query text (owners write
  "show products from this page <url>" in quick actions) routes to
  `listStoreProductsByUrl` — first 20, in the page's own order (`lib/products/search.ts:75`).
  For WooCommerce the page HTML itself is the order source of truth: scrape
  `data-product_id`/`?add-to-cart=` ids in DOM order, hydrate via Store API `include=`,
  reorder to match the page (`listWooProductsByUrl`, `lib/commerce/woocommerce.ts`). That
  covers category/tag archives AND custom pages like karakara.lt `/naujienos/` (neither a
  category nor a tag — term resolution alone returns [] there). Only same-host-as-store
  URLs are page-fetched (visitor text can carry URLs); fallback is last-path-segment
  category→tag term resolution, then slug-words keyword search.
- Catalog sync (`lib/products/sync.ts`) works for the same four providers (not just
  WooCommerce); it fetches → tags → embeds → upserts/prunes `product_embeddings`. Verskis is
  fetched from `products.xml` sitemaps with a 16-worker pool; every main product page contributes
  breadcrumb categories, description, image, brand, and up to 40 `Savybės` attributes
  (`fetchVerskisCatalog`, `lib/products/catalog.ts`). A failed sitemap/page is retried or aborts
  the snapshot rather than letting the final prune delete a transiently missing product. Verskis
  skips the generic recipient/occasion AI tagging pass: structured furniture data is already rich,
  and direct embedding keeps the first ~2k-product sync within the 300s job budget. Live Mobel
  crawl: 1,951 unique products, ~69s before embedding/index writes.
- Sync is triggered two ways: manually via the **"Sync catalog"** button
  (`components/client/ConfigForm.tsx` → `app/api/products/sync/route.ts`), and by a
  **nightly Vercel Cron** (`app/api/cron/catalog-sync/route.ts`) that only re-syncs bots that
  *already* have an index — the first sync is always a manual owner action.
  The configurator exposes the same Smart product search card for Verskis, and the nightly cron
  includes it because both gate through `semanticIndexSupported`.
- **Index status UI**: `GET /api/products/sync?botId=` returns
  `{indexed, storeTotal, lastSyncedAt}` (store total via `validateStore`; real for Woo,
  best-effort 0/1 for Shopify). The configurator shows "X / Y products indexed · last synced …
  · auto-resyncs nightly" with a fill bar. Live sync progress covers every phase: `fetching`
  reports a running count (no total — pages stream), `enriching`/`embedding`/`indexing` report
  processed/total (`lib/products/sync.ts` → `catalog_sync_status`, polled client-side).
- ⚠️ **A transient page failure used to silently truncate the index** — one non-OK response
  mid-pagination broke the fetch loop and the partial set (e.g. 1,600 of 2,582) was indexed
  without any error. `fetchWooCatalog` now retries a failed page once (750 ms backoff); the
  "X / Y indexed" display is the visible safeguard when it still happens.

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

## Search ranking: brand names and the audience filter

Three sharp edges found via the "slim lady" incident (2026-07-12), all live-debugged:

- **Title-token boost** (migration `20260712060000_product_title_boost.sql`):
  products whose TITLE contains every query token — case + Lithuanian-diacritic
  folded via `fold_lt()` (`translate()`, no unaccent extension) — always rank
  first in `match_products`. Before this, "slim lady skaidulu kompleksas" FTS'd
  to nothing ("skaidulu" ≠ "skaidulų" under 'simple' config) and vector noise
  (soap dispensers) outranked exact name matches.
- **Brand names are searched verbatim**: the chat + voice prompts and both
  search-tool descriptions now tell the model that a named BRAND/PRODUCT (e.g.
  "Slim Lady") is passed as-is, never translated into a category search.
- ⚠️ **`audience=unisex` means "no filter"**, enforced in `searchCatalog`
  (`lib/products/search.ts`): the model volunteers `audience: 'unisex'` even when
  told not to, and the RPC filter would then EXCLUDE women/men/kids-tagged items —
  that's how "Slim Lady" (tagged women) vanished from its own search.
- **Verskis inflected attribute queries use a provider-only field-aware matcher** (migrations
  `20260717114744` through `20260717115738`). Lithuanian `baltos kėdės` does
  not FTS-match indexed `Spalva: Balta` under the `simple` dictionary. The RPC
  combines strict four-character prefixes with lower-priority three-character
  prefixes (for mutations such as `kėdė` → `kėdžių`), then scores product-type
  matches in the title and hard qualifiers in structured attribute values. Main
  `Spalva` / `Color` is separate from component color, so `Kojų spalva: Balta`
  cannot make a beige chair rank as a white chair. Live Mobel regression:
  `virtuvinių kėdžių baltos spalvos` retrieves all 11 exact white dining chairs
  in the top 24; `baltos kėdės` puts all 11 in the first 11. Migration
  `20260717162814` moved this logic to `match_products_verskis` and restored
  provider-neutral `match_products` for WooCommerce, Shopify, and Magento.

The chat route logs every model search (`[agent] search_products query=...`,
`app/api/chat/route.ts`) — check it first when ranking looks wrong; the model's
query is often not what the shopper typed.

## Product details for the model

`searchCatalog` carries the indexed `doc` along on semantic matches as
`CommerceProduct.details` (`docToDetails` strips the title line, caps 400 chars —
`lib/products/search.ts`). `search_products` returns it to the model for the top
8 results by default, or 20 for Verskis through its provider profile (token/recall budget;
`lib/ai/commerce-tool.ts:52-110`), so the agent can
judge fit, answer product questions, and compare using categories/tags/attributes
and the longer description. Cards don't render `details`; most keyword fallbacks
have none, while Verskis enriches its selected live results from product pages.
⚠️ Indexed-provider details come from the synced index — a stale sync means stale
attributes; price/stock stay live-hydrated as before. Verskis enrichment is live.

For a Verskis category or one-attribute browse, `display_products` completes the model's
shortlist from structured title-family + attribute evidence up to exactly
`min(20, verified matches)`. It also removes a different furniture family accidentally selected
for the same attribute (for example sleeper corner sofas from a straight sofa-bed request) and
never expands numeric/range fit requests (`lib/products/provider-profiles/verskis.ts:106-147`).
Only four cards are shown inline as the carousel preview; “See all (20)” is the full result list.
After any fresh search, prior-turn cards are not eligible for display, preventing sofa cards from
leaking into a later chair request (`lib/ai/commerce-tool.ts:139-160`).

## On-demand full details (`get_product_details`)

Gated by `productDetailsSupported` — WooCommerce + Shopify + Verskis
(`lib/ai/commerce-tool.ts`, `lib/commerce/index.ts`):
up to 3 ids → `getProductDetails` (`lib/commerce/index.ts`, behind `guardStoreEgress`)
→ `fetchWooProductDetails` (public Store API `include=`) or
`fetchShopifyProductDetails` (Storefront `nodes(ids:)`, plain-text `description` +
`options` as attribute lines, skipping the synthetic "Title: Default Title") or
`fetchVerskisProductDetails` (same-origin product URL + main attribute table only).
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
`transport.getProductDetailsByName`; the configurator preview has its own authed
mirror (`/api/preview/details`) — it was initially stubbed, which made preview
voice calls claim "no details" while the live widget worked (same
preview-is-a-separate-route trap as card awareness).

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

`display_products` results are now emitted as soon as the tool finishes, and
`ChatWindow` attaches a received products event to the still-streaming assistant
message immediately (`lib/ai/commerce-tool.ts`, `components/widget/ChatWindow.tsx`).
Previously both sides held cards until all final prose completed, making a correct
recommendation look like a slow text/link-only response. The end-of-stream candidate
safety net remains for models that omit `display_products`.

⚠️ **The configurator preview is a separate route** (`/api/preview/chat`,
stateless) — features added to `/api/chat` do NOT automatically exist there, and
"works in preview" ≠ "works live" (or vice versa). Card awareness reaches the
preview via the client: `ChatWindow.buildHistory` keeps card-only messages and
attaches `products` to assistant turns (`previewChatSchema` allows them); the
  preview route derives `shownProducts` from that history exactly like the chat
  route does from `messages.products`. Preview now binds `search_products` to
  `searchCatalog` too, so a synced semantic index behaves the same in preview and
  the live widget; without an index, both still fall back to live keyword search.

_Last verified: 2026-07-17 (working tree + full 1,951-product mobel.lt live crawl)._
