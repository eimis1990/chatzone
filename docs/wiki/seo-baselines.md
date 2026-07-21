# Search Console baselines — 2026-07-21

Baseline snapshot for the SEO/GEO remediation program (plan task 5.8). Source:
owner's GSC exports of 2026-07-21 (Performance: last 3 months, Web; Coverage:
sitemap-valid report). Compare future checkpoints against these numbers, not
against Lighthouse or article count.

## Checkpoints

- **7-day:** 2026-07-28 — expect: sitemap resubmission reflected, new routes
  (hubs, identity pages) beginning to appear in Coverage.
- **28-day:** 2026-08-18 — expect: indexed count materially above 32, position
  improvement on the two impression-magnet pages (below), first field CWV data.

## Indexing baseline

- Sitemap: 65 URLs live (51 posts + home, blog, 6 topic hubs, 4 identity pages,
  privacy, terms). Resubmitted in GSC on 2026-07-21 after the phases 1–5 deploy.
- Coverage "valid": **32 pages** (report lags — its chart ends 2026-07-10, i.e.
  pre-deploy). Valid set = home, /blog, privacy, terms + 28 posts. Roughly 23
  older posts plus everything shipped today (hubs, identity pages, July content
  batches) were not yet indexed at that snapshot. Re-export Coverage at the
  checkpoints before "resolving exclusions" — most will clear on their own.

## Performance baseline (≈ 2026-06-25 → 2026-07-19)

- Totals: **18 clicks / ~1,375 impressions**. Two regimes:
  - Brand traffic: Lithuania, 15 clicks / 28 impressions at position ~2.6
    ("loqara" variants). Essentially all real clicks are LT brand searches.
  - Discovery traffic: Jul 4–11 impression spike (peak ~178/day) at position
    ~65, mostly US/UK long-tail, then decay to ~25–40/day — classic new-site
    ranking test by Google, zero clicks.
- Devices: desktop 1,155 imp @ pos 60; mobile 218 imp @ pos 52 (CTR 4.1%).

### The two impression magnets (refresh priorities)

| Page | Impressions | Position | Query class |
|---|---:|---:|---|
| /blog/conversational-ai-vs-chatbot | 568 | 83 | "chatbot vs conversational ai" variants (~500 imp) |
| /blog/zendesk-ai-review | 507 | 51 | "zendesk ai / pricing / answer bot" (~450 imp) |

These two absorb ~78% of all impressions at unclickable positions. They are the
highest-leverage refresh targets: real US demand exists, Google is already
matching us to it, we just rank pages 5–9. (Both were source-hardened in the
2026-07-21 citation sweep; next lever is content depth/refresh, per the
refresh-before-net-new policy in seo-content-loop.md.)

### Page-1 rankings with zero clicks (watch, don't panic)

ai-customer-service-statistics (pos 9.5, 68 imp), new-ai-chatbots-2026 (6.4),
gorgias-alternatives (7.7), tidio-alternatives (8.75), ai-voice-agents-explained
(8.1), voice-ai-for-ecommerce-support (8.0), how-to-choose (9.2), multilingual
(11.4). Low query volume + young snippets; recheck CTR at the 28-day mark
before touching titles/descriptions.

## Monthly AI-search visibility sample (GEO)

Run these ~10 prompts monthly in ChatGPT, Google AI Mode, and Perplexity;
record whether Loqara is mentioned/cited and who is. Manual checks only — no
automated scraping of Google results (ToS).

1. best AI chatbot for a Shopify store
2. best AI chatbot for WooCommerce
3. Tidio alternatives for a small online store
4. Is Zendesk AI worth it for a small e-commerce store?
5. cheaper Intercom alternative for e-commerce support
6. how much does an AI support chatbot cost
7. add a voice AI agent to an online store
8. reduce customer support tickets for an online shop with AI
9. AI chatbot that can look up order status
10. AI customer support in Lithuanian

First sample: not yet run — do the first pass at the 7-day checkpoint so the
post-deploy state is what gets measured.

## Bing

Not verified as of 2026-07-21 (`NEXT_PUBLIC_BING_SITE_VERIFICATION` unset; the
option to import from GSC exists). Owner decision pending — low priority.

_Last verified: 2026-07-21._
