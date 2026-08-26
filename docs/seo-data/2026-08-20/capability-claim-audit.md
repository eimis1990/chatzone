# Public capability-claim audit — 2026-08-25

Evidence for Phase 0 Task 0.5 of the
[search-visibility plan](../../superpowers/plans/2026-08-25-search-visibility-growth.md).

## Code authority

- `lib/commerce/capabilities.ts`: store configuration, product-detail,
  shipping-rate, and order-lookup gates.
- `lib/commerce/index.ts`: provider dispatch for product search, order status,
  shipping rates, and configured discounts.
- `lib/products/provider-profiles/`: semantic-search support by provider.
- Human-readable source of truth:
  `docs/wiki/commerce.md#public-claim-capability-matrix`.

## Verified boundary

- WooCommerce: product search, semantic index, identity-checked order lookup,
  and live shipping rates.
- Shopify: product search; semantic index with a Storefront token; **no Loqara
  order lookup or live shipping-rate tool today**.
- Magento: product search, semantic index, and identity-checked order lookup;
  no live shipping-rate tool.
- Verskis: product search and semantic index; no order lookup or live shipping.
- Generic feed: keyword product search only; no order lookup or live shipping.
- TravelLine: room-type search and dated availability through its dedicated
  tool; no ecommerce order lookup or shipping-rate tool.
- Discounts: configured static code, not live coupon creation.
- Chat languages: English and Lithuanian; Free permits one and paid plans may
  enable both. “All languages” does not mean every world language.
- Live voice calls: English and Lithuanian and require the paid Voice add-on for
  client organizations; voice inherits provider capability gates.
- Human handoff: available on every displayed plan. Lead capture starts on
  Starter and is not a Free entitlement.

## Corrected surfaces

The audit corrected generic or false implications—especially that connecting
Shopify enabled Loqara order lookup—in:

- Homepage metadata, Organization/SoftwareApplication structured data, hero,
  commerce feature copy, and visible FAQ.
- `best-chatbot-platforms`
- `best-ai-chatbot-for-ecommerce`
- `ai-chatbot-for-online-store`
- `gorgias-alternatives-for-ecommerce`
- `zendesk-alternatives-for-ecommerce`
- `intercom-alternatives-for-ecommerce`
- `tidio-alternatives-for-ecommerce`
- `zendesk-ai-review`
- `tidio-vs-zendesk`
- `how-to-choose-ai-support-agent`
- `capture-leads-with-conversational-chat`
- `chatbot-roi-metrics-that-matter`
- `chatgpt-for-customer-service`
- `agentic-commerce-ecommerce`
- `voice-ai-for-ecommerce-support`
- `add-voice-ai-to-online-store`

Provider-specific WooCommerce copy and generic descriptions of what a capable
third-party agent *may* do were retained when they did not claim universal
Loqara support.

## Reproduction checks

```bash
rg -n -i \
  "identity-checked order lookup on Shopify|Shopify.{0,120}Loqara.{0,120}order lookup|Loqara.{0,120}Shopify.{0,120}order lookup" \
  content/blog app components

rg -n -i \
  "Loqara.{0,180}(order lookup|looks? up orders?|order status)|order lookup.{0,180}Loqara" \
  content/blog app components
```

Expected result: Shopify matches explicitly say Loqara does **not** support the
action or distinguish Shopify product search from WooCommerce/Magento order
lookup. Review generic matches manually because provider-specific pages and
conditional educational guidance remain valid.

## Still open

- [ ] Complete a current-primary-source review of every time-sensitive vendor
  feature and price before marking Phase 0 Task 0.5 fully accepted.
- [ ] Add the reviewer date/evidence beside each comparison's future refresh
  record. This audit corrected Loqara capability truth; it did not certify every
  third-party price in the comparison backlog.
