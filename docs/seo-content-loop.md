# Weekly SEO / AEO content loop

A repeatable, human-in-the-loop ritual for finding what to write next and shipping it
in a format that ranks on Google **and** gets cited by AI engines (ChatGPT, Claude,
Perplexity, Gemini). Adapted from the Agensi playbook. ~1–2 hours, once a week.

Nothing here auto-publishes. You review every draft before it goes live — the whole
brand is "honest voice", so a hallucinated price or feature is a real cost, not a typo.

## Pre-release check (every content change)

Run `npm run audit:blog` before publishing. It fails on objective breakage
(duplicate titles, bad dates, broken internal/related links, missing images or
topics) and prints warnings for editorial review (posts without external
citations, missing quick-answer blocks, weak link graph). The script checks
structure, not truth — whether a source actually supports a claim stays a
human review step.

**Priority order for content work** (per the 2026-07 SEO/GEO remediation):
refresh and source existing posts, consolidate overlap, and add first-party
evidence BEFORE writing net-new articles. New volume on top of an unsourced
backlog compounds the problem.

## Effort allocation and approval gate

Until the 2026-08-25 visibility program says otherwise, allocate the weekly
content budget as follows:

- **70% refresh/consolidation:** improve pages search engines already test,
  correct evidence, resolve overlap, and strengthen contextual links.
- **20% original evidence/utility:** real product examples, methodology,
  anonymized data, calculators, templates, and approved customer proof.
- **10% net-new pages:** usually no more than one or two strong pages per month.

A new page needs measured demand, a unique intent owner, a commercial path to
Loqara, primary sources collected before drafting, a contribution competitors
cannot reproduce cheaply, assigned internal links, and a 7/28-day review plan.
If any item is missing, refresh an existing owner page instead.

## The ritual (Mondays)

1. **Export Search Console data.** GSC → Performance → last 3 months → filter to
   Queries (and separately Pages). Export both as CSV.
2. **Run the gap-analysis prompt below** with both property-wide and page-filtered
   query data. Rank refresh, consolidation, evidence, and new-page opportunities.
3. **Choose one highest-value action** that passes the allocation and approval
   gate above. Record the page, query, reader job, hypothesis, exact change, and
   business outcome before editing.
4. **Review and ship** using the article format and release checks below. Push to
   `main`, smoke the production URL, then request indexing only for the changed URL.
5. **Schedule reviews:** a 7-day technical/indexing check and a 28-day comparable
   performance check. Record clicks, impressions, CTR, position, target-country
   traffic, and organic conversion events; do not declare a result early.

The loop compounds: each ranking article adds impressions for related queries, which
feed next Monday's gap analysis.

---

## Prompt: weekly gap analysis

> Paste this into Claude, then attach `Queries.csv` and `Pages.csv` from Search Console.

```
You are my SEO analyst for Loqara (loqara.com) — an AI chat & voice agent for
e-commerce stores. Our buyers are store owners, e-commerce managers, and agencies
(not developers). We compete with Gorgias, Intercom/Fin, Tidio, Zendesk, and
Parnidia. Our existing blog posts live at /blog and are listed at loqara.com/llms.txt.

Attached are two Google Search Console CSVs: query-level and page-level performance
for the last 3 months.

Find me, ranked by opportunity (impressions × how winnable):

1. KEYWORD GAPS — queries where we get impressions but have no dedicated page.
   For each: the query, impressions, avg position, and search intent.
2. CANNIBALIZATION — two of our pages competing for the same query. Name both URLs
   and recommend which should own it (and how to differentiate the other).
3. STRIKING DISTANCE — queries ranking positions 5–20 where a targeted refresh of an
   EXISTING page could push us onto page one. Name the page and what to add.
4. EMERGING QUERIES — new terms appearing recently we haven't targeted.

Then output a ranked ACTION QUEUE. Prefer existing-page refreshes and
consolidations. For each action include:
- Action type: refresh, consolidate, add evidence/utility, or net-new page
- Owner URL (or proposed URL only if no existing page owns the intent)
- Target query, current impressions/position, reader job, and commercial path
- What unique evidence or utility should be added
- Exact internal links to add in both directions
- One measurable hypothesis and its 7/28-day review fields

Only for a net-new opportunity that passes the approval gate, add an ARTICLE BRIEF:
- Working title (include the target query naturally)
- Target query + 3–5 related queries to cover
- Search intent + who it's for
- A 40–60 word draft Quick Answer (see our format)
- 5–7 proposed H2s, phrased as questions people actually ask
- Which existing /blog posts and product/category pages to internally link to
- 6+ FAQ questions for the structured-data block

Be specific and cite the impression counts from the CSVs. Skip anything we already
rank well for or that's off-audience (developer-only queries).
```

---

## Article format spec

Every new or materially refreshed post follows this shape because it helps people
and makes scoped claims easier for search and answer systems to understand. The
shape does not guarantee rankings, rich results, or AI citations.

- **Opening paragraph**: real context, not fluff.
- **Quick Answer**: a `<blockquote class="quick-answer">` with a direct 40–60 word answer
  to the title's question, placed right after the intro. Keep its subject, scope,
  date, and caveat intact so the answer remains useful out of context. This aids
  comprehension and extractability; it is not a citation guarantee. (See
  `best-ai-chatbot-for-shopify.md` for the reference implementation.)
- **Question-based H2s**: phrase headings the way people ask ("How do I choose a
  Shopify chatbot?"), not as noun labels ("The tools, in detail"). These map to real
  prompts and get pulled into AI answers. Don't force it — a strong keyword heading
  can stay.
- **Internal links**: to relevant `/blog` posts and product/category pages.
- **FAQ section**: use an H2 titled exactly `Frequently asked questions` with
  genuine `### question` headings only when follow-up questions help the reader.
  `lib/blog.ts` mirrors the visible Q&A into FAQPage JSON-LD. Google no longer
  shows FAQ rich results for ordinary commercial sites, and the schema does not
  guarantee rankings or AI citations. Keep useful answers self-contained.

## Review record (required for every shipped action)

```text
Page:
Primary query / reader job:
Action and hypothesis:
Deployed (date + SHA):
7-day technical/indexing review:
28-day clicks / impressions / CTR / position:
Target-country traffic:
CTA opens / signup starts / completed signups:
Decision: keep / extend / revise / consolidate
```

## What else moves AEO (off this loop)

- **Bing Webmaster Tools** — ChatGPT search runs on Bing's index. Import from GSC once.
- **Third-party citations** — G2, Capterra, Reddit, independent "best X" roundups.
  AI engines weight these heavily and no on-site change substitutes for them.
- **Segment AI traffic in GA** — add a channel group for referrals from chatgpt.com,
  perplexity.ai, claude.ai, gemini.google.com so you can see if any of this lands.
