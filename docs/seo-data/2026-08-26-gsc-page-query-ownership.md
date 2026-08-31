# GSC page-query ownership — 2026-08-26

Evidence for Task 0.2 of the
[90-day search-visibility plan](../superpowers/plans/2026-08-25-search-visibility-growth.md).

## Export method and limits

- Source: live Google Search Console UI for the verified URL-prefix property
  `https://www.loqara.com/`.
- Search type: Web.
- Current complete 28 days: **2026-07-28 → 2026-08-24**.
- Previous 28 days: **2026-06-30 → 2026-07-27**.
- Filter: exact page URL, one priority URL at a time.
- Metrics retained: page and visible-query clicks, impressions, CTR, and average
  position.
- GSC privacy thresholds hide some queries. Page totals are authoritative for a
  URL; visible query rows do not necessarily sum to those totals. A hidden query
  is **not** classified as branded or non-brand.
- Visible branded classification: query contains `loqara` or an obvious spelling
  variant. **No visible query in this sample is branded.** Hidden queries remain
  unknown.

## Page-level comparison

| Owner URL | Clicks now / prior | Impressions now / prior | CTR now / prior | Position now / prior | Initial decision |
| --- | ---: | ---: | ---: | ---: | --- |
| `/blog/ai-customer-service-statistics` | 0 / 0 | 9 / 69 | 0% / 0% | 58.1 / 9.9 | Diagnose decline; do not change the snippet from hidden-query data |
| `/blog/new-ai-chatbots-2026` | 0 / 0 | 6 / 31 | 0% / 0% | 5.0 / 6.4 | Preserve ranking; recertify freshness before changing title/copy |
| `/blog/zendesk-ai-review` | 0 / 0 | 200 / 562 | 0% / 0% | 54.6 / 51.0 | Rebuild as one current Zendesk AI buying guide |
| `/blog/shopify-ai-assistant-guide` | 0 / 0 | 38 / 41 | 0% / 0% | 26.4 / 44.0 | Improving; own Shopify admin AI/Sidekick intent |
| `/blog/ai-chatbot-for-beauty-skincare-stores` | 3 / 0 | 83 / 6 | 3.6% / 0% | 32.9 / 52.2 | Highest-growth vertical; expand carefully |
| `/blog/add-ai-agent-to-woocommerce` | 1 / 1 | 2 / 3 | 50% / 33.3% | 4.0 / 7.7 | Protect exact setup intent and URL |
| `/blog/ai-chatbot-for-furniture-stores` | 0 / 0 | 46 / 2 | 0% / 0% | 31.5 / 43.0 | Build the measured chatbot-template asset |
| `/blog/best-chatbot-platforms` | 0 / 1 | 24 / 19 | 0% / 5.3% | 54.7 / 19.6 | Declining; diagnose generic-intent competitiveness |
| `/blog/shopify-inbox-vs-ai-chatbot` | 1 / 0 | 34 / 3 | 2.9% / 0% | 23.6 / 24.3 | Strengthen the focused Inbox comparison |
| `/blog/ai-product-recommendation-chatbot` | 0 / 0 | 107 / 23 | 0% / 0% | 62.3 / 29.8 | Own recommendation mechanics; fix authority before expansion |
| `/blog/conversational-ai-shopping-assistant` | 0 / 0 | 56 / 0 | 0% / 0% | 61.2 / — | Own shopping-assistant workflow; keep separate for now |

The two URLs in the recommendation/shopping-assistant queue entry are both
included, so the page queue contributes eleven exact URL filters rather than ten.

## Material query clusters and URL owners

“Material” here means at least three visible current impressions, at least ten
visible previous impressions, or a strategically specific query with a strong
position. Every visible row below had zero query-level clicks and zero query CTR;
GSC suppressed the query behind the page-level clicks on the beauty,
WooCommerce, and Shopify Inbox URLs.

### AI customer-service statistics

**Owner:** `/blog/ai-customer-service-statistics`

The current nine impressions are fully hidden. Previous visible rows were
`zendesk news july 2026` (1 impression, position 7),
`ai customer service market size` (1, position 58), and
`"grand view research"` (1, position 93). None is enough to support a title
change. The market-size/statistics intent remains with this URL; the stray
Zendesk freshness query does not create a second owner.

### New AI chatbots in 2026

**Owner:** `/blog/new-ai-chatbots-2026`

All six current impressions and all 31 previous impressions are hidden at query
level. Page position remains strong (5.0 now versus 6.4 prior), so the refresh
brief must preserve the current intent and earn any freshness date through a
real vendor/source review. Hidden rows cannot justify a snippet rewrite.

### Zendesk AI review, features, and pricing

**Owner:** `/blog/zendesk-ai-review`

| Visible query | Imp. now / prior | Position now / prior |
| --- | ---: | ---: |
| `zendesk ai` | 80 / 147 | 52.1 / 39.1 |
| `ai zendesk` | 32 / 21 | 52.0 / 50.3 |
| `zendesk artificial intelligence` | 14 / 34 | 60.5 / 49.0 |
| `zendesk buy` | 7 / 18 | 60.6 / 58.4 |
| `zen desk ai` | 4 / 2 | 39.0 / 42.5 |
| `zendesk ai features` | 4 / 12 | 49.8 / 42.4 |
| `zendesk gpt4` | 2 / 2 | 56.5 / 48.5 |
| `what is zendesk ai` | 2 / 0 | 69.5 / — |
| `zendesk ai updates` | 2 / 0 | 81.0 / — |
| `zendesk ai pricing` | 1 / 3 | 72.0 / 67.7 |

The former pricing cluster disappeared in the current window:
`zendesk pricing negotiation` (43 prior impressions),
`zendesk answer bot pricing` (42), `zendesk pricing` (41),
`answer bot pricing zendesk` (40), and `inbox by zendesk pricing` (21).
Keep feature, review, buyer-fit, and sourced pricing in this one owner page; the
current evidence does not justify a separate pricing URL.

### Shopify admin AI and Sidekick

**Owner:** `/blog/shopify-ai-assistant-guide`

`shopify admin ai` has 3 current impressions at position 47.3 versus 4 at 37.3.
Previous visible queries that disappeared include `shopify ai assistant` (5),
the long-form real-time admin-assistant question (3), the mobile-app-builder
executive-assistant question (3), and one-impression Sidekick/shopping-assistant
variants. This URL owns merchant/admin AI and Sidekick. Storefront Inbox and
customer-facing comparison intent belongs to the separate Inbox owner below.

### Beauty and skincare assistance

**Owner:** `/blog/ai-chatbot-for-beauty-skincare-stores`

| Visible query | Imp. now / prior | Position now / prior |
| --- | ---: | ---: |
| `ai cosmetic` | 5 / 1 | 73.0 / 70.0 |
| `virtual beauty assistant features` | 4 / 0 | 85.0 / — |
| `ai for cosmetics retail` | 3 / 0 | 64.7 / — |
| `try ai powered beauty help` | 3 / 0 | 69.0 / — |
| `beauty ai chat` | 1 / 0 | 11.0 / — |
| `is this hypoallergenic?` | 1 / 0 | 4.0 / — |

The page total is much stronger than the visible-query subtotal because of GSC
privacy suppression. Keep the URL as the vertical owner and emphasize realistic
product-discovery flows plus safe limits around allergy and skincare claims.

### WooCommerce setup

**Owner:** `/blog/add-ai-agent-to-woocommerce`

GSC hides all query rows, but the page retained one click in each window and
improved from position 7.7 to 4.0. Preserve the URL, concise setup intent, and
current application steps. Do not infer the hidden clicked query's brand class.

### Furniture chatbot template

**Owner:** `/blog/ai-chatbot-for-furniture-stores`

`furniture store chatbot template` produced 16 current impressions at position
11.6 and is the clearest measured asset opportunity. A malformed/noisy B2B SERP
string produced 11 impressions at position 73.8 and is not treated as a content
brief. `ai marketing for furniture store` contributed 2 at position 92. The URL
owns furniture-store chatbot flows and should add the reusable template promised
by the measured query.

### Generic chatbot-platform comparison

**Owner:** `/blog/best-chatbot-platforms`

`chatbot platform` produced 8 current impressions at position 87.3;
`chatbot platforms` produced 3 at 75.7. Smaller variants (`bot sites`,
`chat bot platform`, `chatbot providers`) remain similarly weak. The URL owns the
generic platform-comparison cluster, but the position decline means it should not
be expanded ahead of higher-intent winners without a differentiated buying asset.

### Shopify Inbox comparison

**Owner:** `/blog/shopify-inbox-vs-ai-chatbot`

`shopify inbox alternatives` produced 2 current impressions at position 80.5;
`shopify inbox` produced 1 at position 7; and `shopify inbox ai` produced 1 at
position 36. The URL owns Shopify Inbox capability, alternatives, and the
customer-facing Inbox-versus-AI decision. The page-level click is hidden from
the query table and must remain unclassified.

### Product-recommendation mechanics

**Owner:** `/blog/ai-product-recommendation-chatbot`

`conversational product recommendations` produced 45 current impressions at
position 77.8 versus 10 at 28.7. `how does chatting with ai for product advice
work` added 11 at 60.7. Previous generic product-recommendation chatbot variants
disappeared. This URL owns recommendation mechanics and buyer-intent product
advice; its falling position calls for authority/evidence work, not another URL.

### Conversational shopping workflow

**Owner:** `/blog/conversational-ai-shopping-assistant`

| Visible query | Current impressions | Current position |
| --- | ---: | ---: |
| `conversational shopping platform` | 7 | 80.6 |
| `conversational shopping` | 6 | 71.2 |
| `ai chatbot shopping assistant` | 4 | 72.8 |
| `conversational buying assistant` | 3 | 42.3 |
| `conversational shopping solution` | 3 | 91.0 |
| `ai voice shopping assistant` | 3 | 92.0 |
| `conversational shopping assistant` | 2 | 60.5 |
| `virtual shopping assistant` | 2 | 81.5 |

This URL owns the implementation/decision workflow: platform choice, assistant
behavior, voice, and the shopping journey. The recommendation URL above owns the
mechanics of selecting products. No material query currently matches both URLs,
so consolidation is not yet supported; reassess after another complete window.

## Queue change supported by this evidence

Prioritize the growing or already converting URLs before broad declining pages:

1. Beauty/skincare expansion.
2. Furniture chatbot template asset.
3. Protect WooCommerce setup.
4. Strengthen Shopify Inbox and the improving Shopify admin guide as separate
   intents.
5. Rebuild Zendesk with current official evidence.
6. Diagnose recommendation authority and keep shopping workflow separate.
7. Defer major statistics, generic-platform, or snippet rewrites until stronger
   visible query evidence exists.

