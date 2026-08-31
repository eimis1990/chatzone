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

The property is now present in Bing Webmaster Tools and producing both web-search
and AI Performance exports. The exact verification mechanism is still
`⚠️ verify`: `NEXT_PUBLIC_BING_SITE_VERIFICATION` may remain unset if the owner
used DNS or the GSC import instead.

## Interim refresh — 2026-07-26

The supplied "last 3 months" GSC export contains only 29 calendar rows
(2026-06-25 → 2026-07-23), with impressions on 28 days. Treat it as a four-week
new-site baseline, not a 90-day performance verdict.

- Property-level GSC chart: **18 clicks / 1,556 impressions / 1.16% CTR**.
- Country split: Lithuania supplies **15/18 clicks** from 29 impressions at
  position 2.66; the US + UK supply **1,014 impressions and zero clicks** at
  positions 60.15 and 68.99. Discovery is reaching the intended English markets,
  but still at unclickable positions.
- The Jul 6–12 new-site test peaked at 901 weekly impressions. The latest four
  complete rows stabilized at 38, 51, 46, and 46 impressions/day; do not mistake
  the fall from the test spike for a sustained decline.
- The visible query table is dominated by two clusters:
  conversational-AI-vs-chatbot variants = **516 impressions at weighted position
  83.77**; Zendesk variants = **474 at 55.44**. The matching pages now show
  568 impressions at 83.28 and 527 at 51.23.
- Page-one watch list remains too small for snippet conclusions:
  `ai-customer-service-statistics` = 69 impressions at 9.94;
  `new-ai-chatbots-2026` = 31 at 6.39. Both have zero clicks, but the former was
  materially refreshed on Jul 21.
- Content age is a major confounder: the repo now has 58 posts, 27 dated Jul 15
  or later. Seven are dated Jul 23 or later, so this export gives them at most one
  partial day; four Jul 25 posts have no GSC exposure in the file.
- GSC's query export shows zero clicks even though the chart shows 18. This is
  expected privacy/truncation behavior at low volume; page-table totals also use
  different aggregation. Use chart/country totals for site KPIs and page-filtered
  query exports for page decisions.
- Bing web search is still statistically empty: **15 impressions / zero clicks**.
  Bing AI Performance is the early positive signal: **85 citations across 14 of
  26 days** (Jun 29 → Jul 24), with one or two cited Loqara pages per active day.
  All four sampled grounding queries are Zendesk evaluation/review intents;
  export the cited-pages table next time before attributing that activity to a
  specific URL.

Decision: keep the Jul 28 indexing checkpoint and Aug 18 28-day post-remediation
checkpoint. Do not resume bulk publishing from this snapshot. First export
page-filtered queries for the two impression magnets and the two page-one watch
pages; judge lasting SEO progress after the current Jul 21 crawl/index/content
state has had a full 28 days.

## 2026-08-20 performance checkpoint

The Aug 20 Bing and GSC exports are the baseline for the detailed
[90-day search-visibility plan](../superpowers/plans/2026-08-25-search-visibility-growth.md).
The byte-preserved files, hashes, filters, and calculation rules live in the
[2026-08-20 baseline archive](../seo-data/2026-08-20/README.md).

- Google property total: **29 clicks / 2,552 impressions / 1.14% CTR** at
  impression-weighted position **54.11**. The latest complete 28 days contributed
  11 clicks / 1,139 impressions / 0.97% CTR versus 18 / 1,413 / 1.27% in the
  preceding 28 days.
- Lithuania still supplies **20/29 clicks**. The US, UK, and Netherlands combine
  for **1,640 impressions and zero clicks**, confirming that English-market rank
  and authority—not discovery alone—are the primary constraint.
- Bing Web Search remains small at **1 click / 70 impressions**. Bing AI is the
  leading signal at **261 citation events**, but the overview cannot identify
  cited URLs or grounding queries; those exports are a Phase 0 requirement.
- Existing high-intent pages (WooCommerce setup, beauty/skincare, comparisons,
  handoff, lead capture) produce clicks on small samples. Broad Zendesk and
  conversational-AI pages still absorb most impressions at positions 51–83.

Decision: run a 90-day refresh/evidence/distribution program with a 70/20/10
effort allocation; measure organic signup behavior before increasing net-new
publishing. Use GSC property totals for site KPIs and page-filtered query exports
for URL decisions.

## 2026-08-26 page-filtered query checkpoint

Task 0.2's live exact-page comparison is recorded in
`docs/seo-data/2026-08-26-gsc-page-query-ownership.md`: current complete period
2026-07-28 → 2026-08-24 versus 2026-06-30 → 2026-07-27, Web search. The top ten
queue entries represented eleven URLs because the recommendation/shopping entry
contains two possible owners.

- Beauty/skincare is the clearest growth page: 3 clicks / 83 impressions versus
  0 / 6, while average position improved from 52.2 to 32.9.
- WooCommerce retained a click in both periods and improved from position 7.7 to
  4.0, so its exact URL/setup intent should be protected.
- Furniture's measured opportunity is specific: `furniture store chatbot
  template` generated 16 impressions at position 11.6.
- Shopify Inbox gained its first page-level click; the admin-AI guide improved
  from position 44.0 to 26.4. Their visible intent remains distinct.
- Statistics, generic chatbot platforms, and product recommendations lost
  substantial average position. Do not rewrite their snippets from aggregate
  CTR alone; visible query evidence is weak or privacy-suppressed.
- Zendesk still owns meaningful demand (200 impressions), but its main queries
  remain around positions 52–61 and the former pricing cluster largely vanished.
- No visible query in the sample is branded. Hidden queries remain unknown, not
  automatically non-brand. Page-level clicks can be absent from query rows under
  GSC privacy thresholds.

Decision: move beauty/skincare and the furniture template ahead of broad page
expansion; protect WooCommerce; keep Shopify admin and Inbox ownership separate;
and do not merge recommendation/shopping-assistant pages until a later comparable
window shows shared material queries.

## 2026-08-26 Bing AI page/query checkpoint

The live three-month AI Performance view (2026-05-26 → 2026-08-25) is captured
in `docs/seo-data/2026-08-26-bing-ai-page-query-baseline.md`.

- Bing AI recorded **296 citation events**. Its sampled Pages table contains
  **13 cited Loqara URLs** and 266 citations; Bing warns that the table is a
  sample and may be refined.
- `/blog/zendesk-ai-review` leads with 98 citations: **33.1% of the headline
  total** and 36.8% of the visible sample. The top four URLs account for 219
  citations, or 74.0% of the headline total.
- The 12 sampled grounding queries were each drilled into Bing's filtered Pages
  view. Product advice maps to the recommendation guide; five Zendesk variants
  map to the Zendesk review; Tidio comparison, semantic search, fraud detection,
  Magento integration, and broad platform selection retain distinct owners.
- Bing Web Search remains a separate KPI at **1 click / 74 impressions** for the
  same live three-month view. Do not add these values to AI citations.

Decision: refresh cited URLs in place, protect current query ownership, and use
original evidence/workflows to broaden cited-page diversity. Recheck sampled URL
count and the top-URL share at the 28-day checkpoint.

## 2026-08-26 vendor-source checkpoint

Phase 0 Task 0.5's current-primary-source review is recorded in
`docs/seo-data/2026-08-26-vendor-source-review.md`. Ten vendor families were
checked against current official pricing/product sources.

- Gorgias now publishes roughly $0.90 per resolved interaction on most annual AI
  Agent plans, and AI-resolved threads do not also count as billable helpdesk
  tickets. Older Loqara copy claiming an unpublished rate or a double charge was
  removed.
- Crisp's Hugo AI Agent is available from the $45 Mini plan with included AI
  credits; it is not gated to Plus. Comparisons now distinguish knowledge-trained
  AI from commerce-native product/order actions.
- Unsourced third-party Zendesk deployment, add-on, allowance, and resolution-rate
  estimates were removed. Public plan/seat/Copilot prices remain, while the
  contract-specific automated-resolution rate is explicitly quote-only.
- Priority vendor/comparison pages now expose the 26 August 2026 review date and
  still direct buyers to check current billing and contract terms.

Decision: Phase 0 capability/vendor truth now passes. Re-run the source matrix
before giving any vendor page a new `updated` freshness date and at the 28-day
checkpoint.

_Last verified: 2026-08-26 (live GSC exact-page comparison, Bing AI page/query
drill-down, and current-primary vendor review)._
