# Bing AI page/query baseline — 2026-08-26

This file closes Phase 0 Task 0.3 in the
[90-day search-visibility plan](../superpowers/plans/2026-08-25-search-visibility-growth.md).
It records which Loqara URLs Bing's sampled AI Performance report cites and
which sampled grounding queries led to those citations.

## Measurement rules

- Source: live Bing Webmaster Tools for `https://www.loqara.com/`.
- Window: **3 months, 2026-05-26 through 2026-08-25**.
- AI headline total: **296 citation events** and **1 average cited page**.
- Bing labels both the Pages and Grounding Queries tables as a **sample of
  overall activity** that may be refined as additional data is processed.
- Therefore, sampled table rows do not have to sum to the 296-event headline.
- Bing Web Search performance is reported separately: **1 click / 74
  impressions** in the same three-month view. Web clicks are not AI citations.

## Sampled cited pages

| Rank | Cited URL | Citations | Share of 296 total |
|---:|---|---:|---:|
| 1 | `/blog/zendesk-ai-review` | 98 | 33.1% |
| 2 | `/blog/ai-product-recommendation-chatbot` | 53 | 17.9% |
| 3 | `/blog/tidio-vs-zendesk` | 35 | 11.8% |
| 4 | `/blog/semantic-search-ecommerce` | 33 | 11.1% |
| 5 | `/blog/new-ai-chatbots-2026` | 8 | 2.7% |
| 6 | `/blog/best-chatbot-platforms` | 8 | 2.7% |
| 7 | `/blog/recover-abandoned-carts-ai-chatbot` | 7 | 2.4% |
| 8 | `/blog/zendesk-alternatives-for-ecommerce` | 6 | 2.0% |
| 9 | `/blog/ai-fraud-detection-ecommerce` | 5 | 1.7% |
| 10 | `/blog/ai-chatbot-gdpr-data-privacy` | 4 | 1.4% |
| 11 | `/blog/ai-chatbot-for-magento` | 4 | 1.4% |
| 12 | `/blog/product-qa-ai-shopping` | 3 | 1.0% |
| 13 | `/blog/ai-chatbot-human-handoff` | 2 | 0.7% |

The 13 visible rows contain **266 sampled citations**, or 89.9% of the headline
total. The top cited URL generates **33.1% of the 296 headline total** and 36.8%
of the visible page sample. The top four URLs generate **219 citations**, or
74.0% of the headline total. This is the starting cited-page-diversity baseline:
**13 sampled cited URLs; top-URL share 33.1%**.

## Sampled grounding-query ownership

Each query below was opened in Bing's live Grounding Queries report and matched
to the URL shown by the filtered Pages table. All 12 sampled queries had one
visible cited owner URL.

| Grounding query | Citations | Citation share | Confirmed cited URL |
|---|---:|---:|---|
| how AI chat for product advice works | 22 | 32.35% | `/blog/ai-product-recommendation-chatbot` |
| Zendesk AI for IT Operations evaluation | 12 | 19.67% | `/blog/zendesk-ai-review` |
| Tidio vs Zendesk reviews comparison | 10 | 13.33% | `/blog/tidio-vs-zendesk` |
| Zendesk AI automation support evaluation | 10 | 20.83% | `/blog/zendesk-ai-review` |
| semantic search retail media platform | 9 | 10.34% | `/blog/semantic-search-ecommerce` |
| AI customer support tools Zendesk pricing features implementation triage agent assist help center automation | 9 | 29.03% | `/blog/zendesk-ai-review` |
| Tidio vs Zendesk comparison features pricing reviews | 7 | 35.00% | `/blog/tidio-vs-zendesk` |
| fraud detection tools black box order declines visibility | 5 | 12.50% | `/blog/ai-fraud-detection-ecommerce` |
| Zendesk Support Suite AI Help Desk review | 5 | 25.00% | `/blog/zendesk-ai-review` |
| Zendesk Agent Assist Platforms evaluation Productivity Software v2 | 4 | 19.05% | `/blog/zendesk-ai-review` |
| AI chat integration Magento Freshdesk returns compliance frameworks | 3 | 20.00% | `/blog/ai-chatbot-for-magento` |
| best chatbot integration platforms for businesses no per-message pricing | 3 | 30.00% | `/blog/best-chatbot-platforms` |

The sampled query rows contain 99 citation events. Their `Citation share` is
Bing's share for that grounding query, not each row's share of Loqara's 296
citations.

## Decisions from this baseline

1. **Protect the Zendesk review URL.** It is the largest cited page and owns five
   distinct evaluation, feature, help-desk, and pricing-related query variants.
   Refresh it in place; do not split it without query/page evidence.
2. **Keep product-advice ownership on the recommendation guide.** Its confirmed
   grounding query and second-place page total make it a meaningful GEO asset
   even though its Google ranking weakened in the latest comparison.
3. **Preserve distinct comparison and topical owners.** Tidio-vs-Zendesk,
   semantic search, fraud detection, Magento integration, and broad platform
   selection each have a clean sampled owner.
4. **Diversify citations deliberately.** A third of all headline citations come
   from one URL and nearly three quarters from four URLs. Original evidence and
   concrete workflows on lower-cited commercial pages should aim to increase
   the unique cited-URL count without weakening established owners.
5. **Never combine Bing Web and AI KPIs.** Report Web clicks/impressions and AI
   citations/cited-page diversity in separate rows at every checkpoint.

## Next checkpoint

Repeat the live 3-month Pages and Grounding Queries capture at the plan's
28-day review. Record the headline total, sampled URL count, top-URL share, new
owner URLs, lost owner URLs, and any query that changes owner.

