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

## The ritual (Mondays)

1. **Export Search Console data.** GSC → Performance → last 3 months → filter to
   Queries (and separately Pages). Export both as CSV.
2. **Run the gap-analysis prompt below** — paste it into Claude with the two CSVs
   attached. You get back 5–10 ranked opportunities + article briefs.
3. **Write 3–5 articles** from the briefs, following the article format spec below.
   Save them as `content/blog/<slug>.md` (copy an existing post's frontmatter).
4. **Deploy** (push to `main` → Vercel auto-deploys) and **submit for indexing** in
   both GSC *and* Bing Webmaster Tools (URL Inspection → Request indexing).

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

Then output 3–5 ARTICLE BRIEFS for the best new-page opportunities. Each brief:
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

Every new post follows this shape — it's what ranks on Google and what AI engines lift.

- **Opening paragraph**: real context, not fluff.
- **Quick Answer**: a `<blockquote class="quick-answer">` with a direct 40–60 word answer
  to the title's question, placed right after the intro. AI engines pull the first
  concise, self-contained answer on the page — this is the single highest-leverage
  AEO element. (See `best-ai-chatbot-for-shopify.md` for the reference implementation.)
- **Question-based H2s**: phrase headings the way people ask ("How do I choose a
  Shopify chatbot?"), not as noun labels ("The tools, in detail"). These map to real
  prompts and get pulled into AI answers. Don't force it — a strong keyword heading
  can stay.
- **Internal links**: to relevant `/blog` posts and product/category pages.
- **FAQ section**: an H2 titled exactly `Frequently asked questions` with 6+ `### question`
  headings. `lib/blog.ts` parses this into FAQPage JSON-LD automatically — it's what
  earns rich results and feeds AI citations. Keep answers self-contained (40–80 words).

## What else moves AEO (off this loop)

- **Bing Webmaster Tools** — ChatGPT search runs on Bing's index. Import from GSC once.
- **Third-party citations** — G2, Capterra, Reddit, independent "best X" roundups.
  AI engines weight these heavily and no on-site change substitutes for them.
- **Segment AI traffic in GA** — add a channel group for referrals from chatgpt.com,
  perplexity.ai, claude.ai, gemini.google.com so you can see if any of this lands.
