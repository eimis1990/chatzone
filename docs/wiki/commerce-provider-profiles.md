# Commerce provider profiles

Provider isolation is a hard architectural invariant: improving one connector
must not silently change another connector's ranking, prompts, hydration, or
failure behavior.

## Extension point

Product-search behavior is registered in
`lib/products/provider-profiles/index.ts`. Every `CommerceProvider` must have an
explicit profile, including providers with no semantic index. Profiles own:

- catalog-sync fetchers and enrichment policy;
- semantic-index capability/configuration checks;
- the provider's matcher RPC;
- live price/stock hydration;
- product-detail reference conversion;
- stale-index compatibility guards;
- optional semantic-query normalization and candidate overfetch;
- model detail breadth, display-count guidance, and structured completion;
- optional provider-only model query guidance.

Current ownership:

| Provider | Sync source | Matcher / live hydrator | Special behavior |
| --- | --- | --- | --- |
| WooCommerce | Woo catalog API | `match_products` / Woo Store API | Provider-neutral hybrid/title ranking |
| Shopify | Storefront API | `match_products` / Storefront API by GID | Provider-neutral hybrid/title ranking |
| Magento | GraphQL | `match_products` / GraphQL by SKU | Provider-neutral hybrid/title ranking |
| Verskis | Product-page HTML | `match_products_verskis` / stored URL | Structured metadata, field-aware attributes, semantic query normalization, 32-row live-hydration headroom, 20-detail browse sets, structured type/attribute completion, detail URL reference, origin guard |
| Feed | none | none | Explicitly keyword-only |

Implementations live one file per provider under
`lib/products/provider-profiles/`. Shared `searchCatalog`, catalog sync, and AI
tools only orchestrate the selected profile; they must not accumulate provider
or store branches. Low-level transport/parsing stays in the corresponding
`lib/commerce/<provider>.ts` connector and is reached through the uniform
dispatcher in `lib/commerce/index.ts`.

## Database boundary

`match_products` is the provider-neutral matcher. Any ranking behavior tied to
a provider's document structure, language conventions, or storefront quirks
belongs in a separately named RPC such as `match_products_verskis`. The split is
enforced by `20260717162814_isolate_provider_product_matchers.sql` and covered
by `tests/integration/product-ranking.test.ts`.

Do not add a store hostname, client name, localized attribute label, or
provider-only weighting to the shared RPC. If behavior truly varies by one
store inside a provider, make it explicit bot/provider configuration and pass
that parameter through the provider profile. Do not branch on the domain.

## Prompt boundary

- General commerce rules stay in `lib/ai/prompt.ts` and
  `lib/ai/commerce-tool.ts`.
- Provider-specific tool guidance comes from the selected provider profile.
- Industry/store conversation behavior belongs in an assigned reusable system
  prompt (for example `docs/prompt-templates/furniture-store.md`), not in every
  commerce bot's shared prompt.

This distinction matters: Lithuanian canonical-form furniture guidance is
useful for a furniture bot, but must not bias an English Shopify cosmetics bot.

## Shared automatically vs. provider opt-in

Do not confuse reusable infrastructure with enabled provider behavior. The
shared layer supplies the extension points and universal safety fixes; each
profile decides whether a catalog should use the higher-cost or
schema-dependent capabilities.

| Improvement | Scope now | Adoption rule |
| --- | --- | --- |
| A fresh search cannot display prior-turn cards | All providers | Universal correctness rule in `lib/ai/commerce-tool.ts:142-158`; do not override per provider |
| Product cards stream as soon as `display_products` finishes | All providers | Universal latency/UI behavior in `lib/ai/commerce-tool.ts:328-360` |
| Preview and live text chat both use `searchCatalog` | All configured providers | Universal parity rule; provider profiles still select the actual matcher/hydrator |
| Missing hard product data is unverified, not a match | All providers | Universal prompt safety rule; industry prompts may make it stricter |
| Semantic query normalization | Verskis only | Add `semantic.normalizeQuery` only when a provider's catalog has a repeatable vocabulary/schema mismatch |
| Candidate overfetch before live hydration | Verskis only | Add `semantic.candidatePoolSize` only when measured live hydration losses prevent filling the requested result count |
| More than 8 model-visible candidate details | Verskis uses 20 | Raise `candidateDetailsLimit` only when structured details materially improve exhaustive filtering and the token cost is justified |
| Deterministic browse-set completion/filtering | Verskis only | Add `completeDisplaySelection` only when structured fields can prove category and constraints; never infer from images or prose guesses |
| Provider-specific matcher RPC | Verskis only | Use only when the neutral matcher cannot represent the provider's document fields/language; keep `match_products` neutral |
| Visible-HTML price fallback | Verskis connector only | Parser behavior belongs in the affected transport; never copy HTML selectors into another connector |

WooCommerce, Shopify, and Magento therefore receive the universal correctness
and card-delivery fixes, but retain the neutral matcher, 8-detail budget, normal
candidate count, and model-selected display set. Tests in
`tests/unit/provider-profiles.test.ts` and `tests/unit/commerce-tool.test.ts`
lock those defaults. Adopt an opt-in hook for another provider only after a
provider-specific reproduction demonstrates the need and after adding both a
provider regression and an unaffected-provider isolation assertion.

The 20-card Verskis cap is deliberate. Database retrieval is not the dominant
cost; live product-page hydration, model context, response size, and shopper UI
all grow with the result count. Fetching every match in a 50-500 item category
would make ordinary chat searches slower and more fragile. If users need more,
prefer explicit 20-item pagination/load-more over an unbounded display set.

## Checklist for a provider improvement

1. Reproduce the issue against that provider and identify whether it is
   provider-wide, industry-specific, or truly store-specific.
2. Put transport/parsing changes in that provider's commerce connector.
3. Put catalog-sync policy, product-search capability, matcher selection,
   query normalization, hydration breadth, detail-reference conversion, guards,
   and provider-only display guidance/completion in its profile.
4. Use a provider-named RPC for provider-specific database ranking.
5. Add a provider regression plus a shared-provider isolation regression.
6. Verify at least one unaffected provider path before finishing.
7. Update this page, [commerce](commerce.md), and the wiki log when the boundary
   or provider capabilities change.

_Last verified: 2026-07-17._
