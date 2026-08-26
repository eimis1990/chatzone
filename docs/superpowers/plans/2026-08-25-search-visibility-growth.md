# Search visibility growth — 90-day execution plan

> **Status:** ready for execution on 2026-08-25. Track progress by changing
> `[ ]` to `[x]` only after the task's acceptance criteria pass.
>
> **Program window:** 2026-08-25 → 2026-11-23
> **Primary outcome:** increase qualified, non-brand organic visits and the
> number of visitors who start Loqara signup—not article count.

## Goal and strategy

Loqara is already discoverable: Google and Bing show the site in search, and
Bing AI cites it. The current constraint is that most English-market pages rank
too low to earn clicks. For the next 90 days, the operating model is:

- **70% refresh/consolidation:** improve pages Google already tests.
- **20% original evidence and utility:** publish data, templates, tools, and
  verified customer proof that competitors cannot reproduce cheaply.
- **10% net-new content:** create a URL only for a measured, non-overlapping
  query gap with a commercial connection to Loqara.

This plan implements the standards in
[`seo-geo-playbook.md`](../../wiki/seo-geo-playbook.md). Use
[`seo-content-loop.md`](../../seo-content-loop.md) for the recurring workflow,
but this plan owns priorities and release order for this program.

## How to use this file

- Complete phases in order unless a task is explicitly marked parallel.
- For every completed task, add the completion date, deployment commit, and
  evidence link/path below the checkbox or in the review log.
- A content edit is not complete when it is drafted. It is complete after source
  review, rendering QA, deployment smoke testing, and a scheduled 7/28-day check.
- Never compare a partial current window with a complete previous window.
- Do not treat Bing AI citations as rankings or clicks. Track the cited URL and
  grounding query before deciding which page caused the result.
- Do not buy, exchange, or manufacture links. Earn references through useful
  assets, real partnerships, customer proof, and transparent participation.

### Completion record template

Copy this under a completed task when the evidence is not self-explanatory:

```text
Completed: YYYY-MM-DD
DRI:
Deploy/commit:
Evidence:
7-day review:
28-day review:
Notes:
```

## Baseline — exports dated 2026-08-20

### Google Search Console

| Metric | Baseline |
| --- | ---: |
| Property total | 29 clicks / 2,552 impressions / 1.14% CTR |
| Impression-weighted average position | 54.11 |
| Latest complete 28 days | 11 clicks / 1,139 impressions / 0.97% CTR |
| Previous 28 days | 18 clicks / 1,413 impressions / 1.27% CTR |
| Lithuania | 20 clicks / 48 impressions / position 12.42 |
| United States | 0 clicks / 1,211 impressions / position 58.25 |
| United Kingdom | 0 clicks / 318 impressions / position 64.41 |
| Netherlands | 0 clicks / 111 impressions / position 40.78 |
| Desktop | 18 clicks / 2,183 impressions / 0.82% CTR |
| Mobile | 11 clicks / 361 impressions / 3.05% CTR |

Google's property chart is the source of truth for site totals. Page and query
tables use different aggregation and privacy thresholds, so their sums do not
need to equal the property total. Use page-filtered query exports for decisions
about an individual URL.

### Bing

| Metric | Baseline |
| --- | ---: |
| Web Search | 1 click / 70 impressions / 1.43% CTR |
| AI citation events | 261 |
| Largest daily AI result | 31 citations / 7 cited pages |
| AI citations from Aug 7–17 | 159 (61% of the export total) |

The overview export does not identify which pages and grounding queries drove
the AI activity. Establish those dimensions in Phase 0 before setting a
page-diversity target.

### What the baseline says

1. Crawling and basic indexability are not the main blocker; the site receives
   impressions in both engines.
2. The US, UK, and Netherlands produced 1,640 impressions and zero clicks. The
   primary problem is English-market rank and authority.
3. Specific integration, vertical, comparison, and operational pages create
   clicks from small impression bases. Broad informational pages often rank at
   positions 50–84 and should not receive automatic expansion.
4. The site's 65-post inventory is large relative to its current search demand.
   Better evidence, consolidation, internal links, and distribution should come
   before another volume sprint.

## Program scorecard

These are working milestones, not guarantees. Do not optimize a metric by
publishing low-intent traffic that cannot become a customer.

| KPI | Baseline | Day 30 | Day 60 | Day 90 |
| --- | ---: | ---: | ---: | ---: |
| Google clicks per complete 28 days | 11 | 15+ | 25+ | 40+ |
| US + UK clicks per complete 28 days | 0 | first click | 5+ | 10+ |
| Commercial URLs in Google top 20 | establish in Phase 0 | +1 | +3 | +3–5 |
| Organic visit → Get started rate | unknown | instrumented | baseline + diagnosis | improving vs baseline |
| Organic signups per 28 days | unknown | instrumented | target set from baseline | improving vs baseline |
| Bing AI cited-page diversity | unknown | established | improving | improving |
| Factual capability contradictions | known examples | 0 open critical | 0 | 0 |

### North-star and guardrail metrics

- **North star:** organic visitors who start signup, plus completed signups.
- **Leading indicators:** non-brand clicks, top-20 commercial URLs, qualified
  impressions in target countries, and diverse Bing AI citations.
- **Guardrails:** factual accuracy, organic conversion rate, branded/non-brand
  split, no index bloat, no broken links, and no unsupported product claims.

---

## Phase 0 — Measurement, truth, and operating guardrails

**Window:** 2026-08-25 → 2026-09-08
**Exit condition:** page/query decisions and organic conversions can be measured,
and known high-risk capability claims are consistent.

### Task 0.1 — Preserve a reproducible baseline

**Suggested DRI:** owner / SEO operator

- [x] Archive the dated Bing and GSC exports in the agreed internal analytics
      location; keep the raw files unchanged.
- [x] Record export filters: Web search, date range, country/device filters, and
      whether Search Console used a comparison period.
- [x] Add a one-page summary with the metrics in this plan and the calculation
      definitions.
- [x] Use a consistent timezone and complete-day cutoff in future snapshots.

**Acceptance:** another person can reproduce every program-baseline number without
guessing which date range or filter was used.

**Completed 2026-08-25:** raw CSVs, hashes, filters, present date ranges, and
calculation rules are stored in `docs/seo-data/2026-08-20/README.md`.

### Task 0.2 — Obtain query-to-page data

**Suggested DRI:** SEO operator

- [ ] Export page-filtered queries for the top 10 opportunity URLs listed in the
      page queue below, using the latest complete 28 days and previous 28 days.
- [ ] If using the Search Console API, group by both `page` and `query` and retain
      clicks, impressions, CTR, and position.
- [ ] Add a branded query classification (`loqara`, spelling variants) without
      assuming hidden/anonymized queries are non-brand.
- [ ] Record one owner URL for every material query cluster.

**Acceptance:** each refresh brief names the exact queries currently matching its
URL; potential cannibalization is supported by query/page evidence.

### Task 0.3 — Obtain actionable Bing AI data

**Suggested DRI:** SEO operator

- [ ] Export page-level citation activity.
- [ ] Export grounding queries and record the cited URL for each material query.
- [ ] Separate Bing web-search clicks from AI citations in all reporting.
- [ ] Establish a cited-page-diversity baseline: unique cited URLs and the share
      generated by the top cited URL.

**Acceptance:** the team can name which Loqara pages Bing cites and for which
questions; no decision relies only on the 261-event overview total.

### Task 0.4 — Instrument the organic conversion funnel

**Suggested DRI:** engineering + owner

- [x] Verify analytics records landing-page path, referrer/source, CTA click,
      Get Started open, signup start, and signup completion.
- [x] Preserve acquisition source through the signup flow.
- [ ] Create an organic landing-page report showing visits, engaged visits, CTA
      opens, signup starts, and completions.
- [ ] Verify events in production with one controlled organic/referrer test and
      document event names.
- [x] Exclude owner/internal traffic where practical.

**Acceptance:** one production journey appears end to end in the report, and the
team can attribute an organic signup to its landing page.

**Progress 2026-08-26:** the working tree now captures a privacy-bounded 90-day
first touch on public pages, attaches the same dimensions to CTA/open/start/
submit/recorded-signup events in Vercel and GA4, persists them on accepted signup
rows, exposes them in the owner CSV, and filters authenticated/owner/embed/demo
traffic. Focused tests cover the storage, classification, event, form, and API
boundaries. `docs/seo-data/organic-funnel-report.md` defines the report and live
test. Migration `20260826085019_signup_acquisition_attribution.sql` is applied;
the task remains open until application deployment, GA4 custom-dimension
registration, report creation, and one controlled production journey pass.

### Task 0.5 — Complete a product-claim consistency audit

**Suggested DRI:** product owner + content reviewer

- [x] Build a source-of-truth capability matrix for Shopify, WooCommerce,
      Magento, feeds, order lookup, product search, shipping answers, voice,
      human handoff, and supported languages.
- [x] Audit all comparison/vendor pages that mention Shopify order lookup against
      the current order-status capability page and product behavior.
- [x] Correct unsupported or ambiguous claims before promoting the affected URL.
- [ ] Verify time-sensitive vendor features and prices against current official
      sources; label estimates and desk research.
- [x] Add the capability matrix to the content review checklist.

**Acceptance:** zero known critical capability contradictions remain, and every
comparison refresh records its source-review date.

**Progress 2026-08-25:** the capability matrix and public-claim corrections are
complete and recorded in `docs/seo-data/2026-08-20/capability-claim-audit.md`.
The task remains open until the separate third-party feature/pricing source review
is complete.

### Task 0.6 — Align the content operating procedure

**Suggested DRI:** content owner

- [x] Replace the default “write 3–5 articles” instruction in
      `docs/seo-content-loop.md` with refresh-first opportunity selection.
- [x] Correct the claim that FAQ schema earns rich results or AI citations; it
      supplies machine-readable context but does not guarantee either outcome.
- [x] Add the 70/20/10 allocation and the net-new-content gate from this plan.
- [x] Add 7-day and 28-day review fields to the weekly content log.

**Acceptance:** the routine cannot be followed literally in a way that resumes
bulk publishing or promises FAQ rich results.

**Completed 2026-08-25:** `docs/seo-content-loop.md` now chooses one measured
action, enforces the net-new gate, and requires 7/28-day outcome records.

### Work-session verification — 2026-08-25

- [x] `npm run audit:blog` — 65 posts audited with no objective errors; the
      existing contextual-inbound-link warning for
      `conversational-ai-shopping-assistant` remains open in its later page task.
- [x] `npm run typecheck` — passed.
- [x] `npm run lint` — passed with zero errors and the repository's existing
      warnings.
- [x] `npm test -- tests/unit` — 113 files and 728 tests passed.
- [x] Production `next build` — compiled and generated 237 static pages.
- [x] `git diff --check` — passed.

The full integration-suite command is not counted as a regression pass because
`tests/integration/match_chunks.test.ts` expects a live seeded organization that
is absent in this local environment. Its setup failed before an assertion; the
unit suite and production build are the reproducible local checks for this work.

### Work-session verification — 2026-08-26

- [x] Four focused acquisition/funnel suites — 10 tests passed.
- [x] Full unit suite — 117 files and 738 tests passed.
- [x] `npm run typecheck` — passed.
- [x] `npm run lint` — passed with zero errors and 78 existing warnings.
- [x] `npm run audit:blog` — 65 posts, zero errors, one previously recorded
      contextual-inbound-link warning.
- [x] Production `next build` — compiled and generated 237 static pages.
- [x] `git diff --check` — passed.
- [ ] Database migration verification — local Docker is unavailable and the
      linked project has an older unrelated pending migration, so this session
      did not run a broad `db push`. Apply and verify the named attribution
      migration explicitly during rollout.

### Phase 0 review gate

- [ ] Tasks 0.1–0.6 pass their acceptance criteria.
- [ ] Baseline and conversion reports are accessible to the owner.
- [ ] Each Phase 1/2 page has a query owner and a named business outcome.
- [ ] Review recorded in the program log below.

---

## Phase 1 — Capture existing striking-distance demand

**Window:** 2026-09-02 → 2026-09-22 (may overlap late Phase 0)
**Exit condition:** the most winnable existing pages have accurate snippets,
current evidence, clear answers, and scheduled measurement.

### Task 1.1 — Refresh `ai-customer-service-statistics`

**Baseline:** 75 impressions, position 13.67, zero page-table clicks.

- [ ] Export and record the page's current queries before editing.
- [ ] Replace stale or secondary statistics with current primary sources.
- [ ] Add relevant 2026 research only where the original source supports the
      exact claim; record source dates and sample scope.
- [ ] Add a transparent selection/methodology note and explain limitations.
- [ ] Add one downloadable or reusable chart/table with descriptive alt text.
- [ ] Add original Loqara evidence only if the sample is real, anonymized, and
      disclosed; otherwise do not imply a benchmark exists.
- [ ] Rewrite title/description to match the measured query and page value.
- [ ] Add at least four relevant contextual inbound links from existing posts.
- [ ] Request recrawl after deployment and schedule 7/28-day reviews.

**Acceptance:** all statistics have nearby primary citations; the page offers a
reuse-worthy asset; the 28-day review compares the same query/page window.

### Task 1.2 — Refresh `new-ai-chatbots-2026`

**Baseline:** 37 impressions, position 6.16, zero page-table clicks.

- [ ] Confirm the queries and whether the current title matches their intent.
- [ ] Add a visible “updated August/September 2026” review section only after a
      material vendor/source review.
- [ ] Add a concise change log: what changed, for whom it matters, and the review
      method.
- [ ] Verify all vendor features, prices, and availability against official
      sources and date the comparison.
- [ ] Test one title/description change; log the exact previous and new values.
- [ ] Add contextual internal links from platform and comparison hubs.

**Acceptance:** the result deserves its freshness signal, exposes its review
method, and has a single logged snippet test rather than simultaneous rewrites.

### Task 1.3 — Optimize the remaining top-20 watch list

**Pages:** `best-ai-chatbot-for-ecommerce`, `how-to-choose-ai-support-agent`,
`multilingual-ai-customer-support`, `live-chat-vs-ai-chatbot-ecommerce`,
`where-is-my-order-ai`, and `best-chatbot-platforms`.

- [ ] Export page-filtered queries for every page.
- [ ] Classify each as `keep`, `snippet refresh`, `content refresh`, or
      `consolidation candidate`.
- [ ] Make no title change when the query sample is too small to diagnose CTR.
- [ ] For approved refreshes, strengthen the direct answer, decision criteria,
      limitations, and commercial next step.
- [ ] Add missing two-way contextual links within the relevant cluster.
- [ ] Log one change set per URL and schedule 7/28-day reviews.

**Acceptance:** every edited page responds to measured demand; no page is changed
solely because its aggregate CTR is zero on a tiny sample.

### Phase 1 review gate

- [ ] `npm run audit:blog` passes without new objective failures.
- [ ] External claims, internal links, image alt text, capability statements,
      author details, and dates have been manually reviewed.
- [ ] Updated pages render correctly on mobile and desktop.
- [ ] Canonical, status, schema, sitemap, and primary CTA are smoke-tested after
      deployment.
- [ ] 7-day and 28-day reviews are on the program calendar.

---

## Phase 2 — Build commercial page authority

**Window:** 2026-09-09 → 2026-10-06
**Exit condition:** proven commercial clusters have differentiated owner pages,
useful assets, and deliberate internal support.

### Task 2.1 — Rebuild the Zendesk AI review around current decision intent

**Baseline:** 703 impressions, position 51.42, zero page-table clicks.

- [ ] Map the page-filtered Zendesk queries by feature, pricing, review, and
      “what changed in 2026” intent.
- [ ] Verify current Zendesk AI offerings and pricing using official sources.
- [ ] State what was tested directly, what is desk research, the review date,
      comparison criteria, and Loqara's commercial interest.
- [ ] Add “What changed in 2026” only where current documentation supports it.
- [ ] Replace unsupported cost estimates with sourced values or a transparent
      calculation method.
- [ ] Add a decision table for company size, support complexity, integrations,
      cost sensitivity, and when Zendesk is a good fit.
- [ ] Add four to six contextually relevant inbound internal links.
- [ ] Do not create a separate Zendesk-pricing URL until query/page data proves a
      distinct intent that this page cannot satisfy.

**Acceptance:** the article is a current, transparent buying aid rather than a
generic vendor summary; every pricing/feature claim is sourced and dated.

### Task 2.2 — Strengthen the Shopify commercial cluster

**Primary pages:** `shopify-ai-assistant-guide` and
`shopify-inbox-vs-ai-chatbot`.

- [ ] Assign separate intent: Shopify admin AI/Sidekick versus customer-facing
      storefront assistance and support.
- [ ] Explain Shopify Magic/Sidekick, Shopify Inbox, and Loqara without blending
      their capabilities.
- [ ] Correct the order-lookup boundary from Task 0.5.
- [ ] Add a practical setup/decision diagram and real product screenshots where
      available.
- [ ] Link from the Shopify-related platform/comparison pages and back again.
- [ ] Add a conversion CTA matching the reader's stage, not a generic signup
      interruption.

**Acceptance:** the two pages have non-overlapping briefs, accurate capabilities,
and no contradictory Shopify claims.

### Task 2.3 — Expand proven vertical pages

**Priority:** beauty/skincare first; furniture second.

- [ ] Enhance the beauty/skincare guide with concrete product-discovery flows,
      safety/claims boundaries, realistic conversations, screenshots, and setup
      steps.
- [ ] Add a reusable furniture-store chatbot conversation template or
      downloadable flow to satisfy template-oriented queries.
- [ ] Add vertical-specific CTA copy and measure CTA opens separately.
- [ ] Add internal links from platform, recommendation, and use-case hubs.
- [ ] Identify one real prospect/customer question per vertical and incorporate
      it without inventing customer experience.

**Acceptance:** each page contains a useful vertical asset that stands on its own
and each CTA is separately measurable.

### Task 2.4 — Protect and expand the WooCommerce winner

**Baseline:** 2 clicks from 5 impressions, position 6.2.

- [ ] Preserve the URL and existing successful intent.
- [ ] Add current setup screenshots, prerequisites, troubleshooting, and product
      capability boundaries.
- [ ] Link to it from order-status, ecommerce-platform, setup, and comparison
      content using natural anchors.
- [ ] Verify the setup steps against the current application before publishing.

**Acceptance:** the guide remains concise enough for setup intent, all steps are
current, and it receives at least four relevant inbound contextual links.

### Task 2.5 — Complete an internal-link authority sprint

- [ ] Inventory contextual inbound links to every Phase 1/2 owner page.
- [ ] Add links only where they help the reader take the next logical step.
- [ ] Ensure each target has at least three strong inbound links; use four to six
      for the Zendesk, statistics, Shopify, beauty, furniture, and Woo pages.
- [ ] Remove or rewrite misleading anchors and links to overlapping pages.
- [ ] Run the blog audit and a broken-link check.

**Acceptance:** no priority owner page is orphaned or supported only by generic
“related posts” cards; links are visible in server-rendered article content.

### Phase 2 review gate

- [ ] Every owner page has a unique intent statement and conversion action.
- [ ] Every priority claim and comparison is sourced, dated, and accurate.
- [ ] No new URL was added for an intent already owned by an existing page.
- [ ] Deployment smoke checks and scheduled reviews are recorded.

---

## Phase 3 — Create evidence and earn distribution

**Window:** 2026-09-22 → 2026-10-27
**Exit condition:** Loqara owns at least one defensible evidence asset and one
interactive or reusable utility, with a documented distribution campaign.

### Task 3.1 — Produce a Loqara ecommerce conversation benchmark

**Suggested DRI:** product/data + content

- [ ] Define a privacy-safe, statistically honest cohort and minimum sample size.
- [ ] Select useful measures: first-contact resolution, repeated-question rate,
      handoff rate/reason, fallback rate, product-result clicks, order-status
      automation, conversation-to-lead, and conversation-to-order where tracked.
- [ ] Exclude demo/internal bots and disclose date range, population, exclusions,
      definitions, and limitations.
- [ ] Obtain customer approval for any identifiable example or quotation.
- [ ] Publish an accessible methodology, charts, and downloadable summary/CSV.
- [ ] Reuse the evidence in relevant existing pages without copying a generic
      paragraph everywhere.
- [ ] If the dataset is not strong enough, publish a clearly labelled preliminary
      analysis or defer—never manufacture a benchmark.

**Acceptance:** a third party can understand how each figure was calculated and
quote it with its scope intact.

### Task 3.2 — Add an ecommerce AI-support ROI calculator

- [ ] Validate the inputs and formulas with the product owner: monthly tickets,
      eligible automation share, support cost, containment/resolution rate,
      conversion effect, subscription cost, and implementation cost.
- [ ] Distinguish user input, default assumption, and calculated output.
- [ ] Show low/base/high scenarios and explain limitations.
- [ ] Make the result shareable or exportable without collecting personal data.
- [ ] Add it to the best existing ROI/cost owner page rather than creating a new
      generic article by default.
- [ ] Track calculator starts, completions, CTA opens, and signups.

**Acceptance:** calculations are reproducible, assumptions are visible, and the
calculator produces measurable commercial interactions.

### Task 3.3 — Publish one verified customer case study

- [ ] Select a customer with a meaningful before/after question and permission
      to publish.
- [ ] Record baseline period, comparison period, traffic/volume differences,
      configuration changes, and limitations.
- [ ] Use product screenshots and direct approved quotations.
- [ ] Avoid attributing every change to Loqara when other factors changed.
- [ ] Link the case study from the relevant vertical/integration page and sales
      material.

**Acceptance:** the customer approves the final text and metrics in writing, and
the page clearly separates observed evidence from interpretation.

### Task 3.4 — Run an earned-distribution campaign

- [ ] Create a prospect list segmented by customers, ecommerce agencies,
      integration partners, newsletters, podcasts/webinars, industry communities,
      and relevant resource pages.
- [ ] Match each prospect to one useful asset; do not send generic link requests.
- [ ] Prepare transparent outreach that explains the relevance and commercial
      relationship.
- [ ] Participate in relevant Reddit/community discussions by answering the
      question fully; include a Loqara link only when it materially helps.
- [ ] Reject paid/exchanged low-quality links, private blog networks, scaled guest
      post packages, and forum-link offers.
- [ ] Track contact, response, publication/reference, referral visits, qualified
      leads, and signups—not just acquired links.

**Acceptance:** at least 25 well-matched outreach opportunities are contacted,
responses are logged, and every acquired mention passes a relevance/quality review.

### Phase 3 review gate

- [ ] At least one original evidence asset is live or explicitly deferred for an
      documented sample/privacy reason.
- [ ] The utility and case study have event tracking and contextual distribution.
- [ ] No acquisition tactic violates search-engine spam policies or misrepresents
      Loqara's relationship with a publisher/customer.

---

## Phase 4 — Consolidate, validate, and scale selectively

**Window:** 2026-10-20 → 2026-11-23
**Exit condition:** overlapping content has one clear owner, low-value work is
deprioritized, and the next quarter is based on measured outcomes.

### Task 4.1 — Resolve recommendation/shopping-assistant overlap

**Candidate pages:** `ai-product-recommendation-chatbot` and
`conversational-ai-shopping-assistant`.

- [ ] Compare their query/page exports, headings, links, and conversions.
- [ ] If intent overlaps, choose one owner and merge/redirect only with a reviewed
      redirect and internal-link update.
- [ ] If both remain, define one as product-recommendation mechanics/buyer intent
      and the other as an implementation/decision workflow.
- [ ] Verify canonical, redirect, sitemap, related links, and archived external
      links after any consolidation.

**Acceptance:** no material query cluster is ambiguously targeted by both pages.

### Task 4.2 — Deprioritize off-product visibility

**Candidate:** ecommerce fraud-detection article.

- [ ] Confirm whether fraud detection is or will become a real Loqara capability.
- [ ] If no, stop investing solely because the article has impressions.
- [ ] Keep, reposition, consolidate, or remove only after reviewing backlinks,
      conversions, query intent, and redirect needs.
- [ ] Do not delete a page merely because it has low clicks.

**Acceptance:** the page's status follows product strategy and evidence rather
than impression volume alone.

### Task 4.3 — Apply the net-new-content gate

A new page may be approved only when all boxes are checked:

- [ ] A measured query/customer/sales need is attached.
- [ ] No existing page owns the same intent.
- [ ] The audience and decision/job are named.
- [ ] The page has a plausible Loqara commercial journey.
- [ ] At least one unique contribution is planned: original data, actual product
      evidence, template, tool, tested workflow, or defensible expert judgment.
- [ ] Primary sources are collected before drafting.
- [ ] Inbound and outbound internal links are assigned.
- [ ] The 7/28-day measurement plan and consolidation fallback are recorded.

**Acceptance:** new output is limited to approximately one or two strong pages per
month until authority and conversions justify a higher cadence.

### Task 4.4 — Run the 90-day program review

- [ ] Re-export GSC property, pages, queries, countries, devices, and search
      appearance for comparable complete periods.
- [ ] Re-export Bing web and AI page/grounding-query reports.
- [ ] Compare clicks, non-brand clicks, US/UK clicks, position bands, owner-page
      conversions, and cited-page diversity with baseline.
- [ ] Review every changed page at both 7 and 28 days; label results `winner`,
      `promising`, `no signal`, or `regression`.
- [ ] Keep and extend winners; diagnose regressions; consolidate no-signal pages
      only when intent/evidence supports it.
- [ ] Select the next quarter's work from query and conversion evidence.

**Acceptance:** the owner receives a short decision report that says what changed,
what produced clicks/signups, what failed, and exactly what the next quarter will do.

---

## Page opportunity queue

This is the starting priority order. Phase 0 query/page exports may reorder it.

| Priority | Existing page | Baseline | Decision | New URL? |
| ---: | --- | --- | --- | --- |
| 1 | `ai-customer-service-statistics` | 75 imp, pos 13.67 | Evidence + snippet refresh | No |
| 2 | `new-ai-chatbots-2026` | 37 imp, pos 6.16 | Freshness/source + snippet refresh | No |
| 3 | `zendesk-ai-review` | 703 imp, pos 51.42 | Rebuild authority and buyer value | No |
| 4 | `shopify-ai-assistant-guide` | 71 imp, pos 36.61 | Current Shopify intent + differentiation | No |
| 5 | `ai-chatbot-for-beauty-skincare-stores` | 75 imp, 3 clicks, pos 36.99 | Expand proven vertical | No |
| 6 | `add-ai-agent-to-woocommerce` | 5 imp, 2 clicks, pos 6.2 | Protect and support winner | No |
| 7 | `ai-chatbot-for-furniture-stores` | 39 imp, pos 35.21 | Add actual template/flow | No |
| 8 | `best-chatbot-platforms` | 27 imp, 1 click, pos 18.7 | Query-led refresh | No |
| 9 | `shopify-inbox-vs-ai-chatbot` | 34 imp, 1 click, pos 25.12 | Strengthen comparison | No |
| 10 | product recommendation + shopping assistant | 155 combined imp | Test overlap, differentiate/merge | No pending evidence |
| 11 | `conversational-ai-vs-chatbot` | 568 imp, pos 83.28 | Authority-heavy; limit near-term spend | No |
| 12 | ecommerce fraud detection | 212 imp, 1 click, pos 61.58 | Product-fit review/deprioritize | No |

## Recurring weekly operating checklist

### Monday — evidence

- [ ] Update the rolling complete-28-day scorecard.
- [ ] Review page/query movement, country mix, Bing cited URLs, and conversions.
- [ ] Check scheduled 7/28-day reviews before choosing new work.

### Tuesday — improve

- [ ] Work on the highest-priority existing owner page or original asset.
- [ ] Record the query, reader job, hypothesis, and exact change.

### Wednesday — truth and quality

- [ ] Verify claims with primary sources and confirm current product capability.
- [ ] Review internal links, accessible images, quick answer, limitations, CTA,
      author/reviewer, and meaningful updated date.

### Thursday — ship and distribute

- [ ] Run the release checks, deploy, and smoke test canonical/status/schema/CTA.
- [ ] Distribute the page/asset to specifically matched partners or communities.

### Friday — learn

- [ ] Record deployments, distribution, replies, referrals, and conversion events.
- [ ] Do not declare a search result before its scheduled measurement window.

## Standard content release checklist

- [ ] `npm run audit:blog`
- [ ] `npm run typecheck`
- [ ] `npm test`
- [ ] `npm run lint` (zero errors; existing warnings may remain)
- [ ] `npm run build`
- [ ] Mobile and desktop visual review
- [ ] Claim/source and capability review
- [ ] Internal/related/external link check
- [ ] Image path, dimensions, crop, alt text, and caption check
- [ ] Canonical, 200 status, structured data, sitemap, and server HTML smoke
- [ ] Analytics event verification for the page's CTA/utility
- [ ] Deployment SHA and exact change recorded
- [ ] 7-day and 28-day reviews scheduled

## Review calendar and evidence log

| Review | Due | Status | Evidence / decision |
| --- | --- | --- | --- |
| Program kickoff | 2026-08-25 | [x] | Baseline archived; capability and workflow audits started |
| 7-day instrumentation check | 2026-09-01 | [ ] | |
| Phase 0 gate | 2026-09-08 | [ ] | |
| First 28-day checkpoint | 2026-09-22 | [ ] | |
| Day 60 review | 2026-10-24 | [ ] | |
| Day 90 final review | 2026-11-23 | [ ] | |

## Definition of program success

The program is successful when Loqara can show—not merely assume—that:

1. Non-brand search visibility in target English markets is producing clicks.
2. At least three commercially relevant pages moved into a materially better
   ranking band and/or generated qualified conversions.
3. Organic conversion from landing page to signup is measured and improving.
4. Bing AI citations are attributable to useful pages and relevant grounding
   queries rather than reported only as an aggregate count.
5. Product and vendor claims are current, sourced, and internally consistent.
6. Original evidence or utility earns distribution beyond Loqara's own site.
7. The next publishing decision follows measured demand and one-page/one-intent
   discipline instead of an article-volume target.
