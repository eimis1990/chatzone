# Blog & SEO

File-based markdown blog that drives organic + AI-engine traffic.

**Before creating, refreshing, or changing delivery for public content, follow the
[SEO/GEO playbook](seo-geo-playbook.md).** This page describes the blog machinery
and established topic boundaries; the playbook is the publication quality gate.

## Mechanics

- Posts are `content/blog/<slug>.md` with frontmatter (title, description, date,
  author, image). `lib/blog.ts` parses them, renders via `marked`, injects H2/H3
  anchor ids, and extracts the "Frequently asked questions" section into
  **FAQPage JSON-LD**. Pages: `app/blog/`, `app/blog/page/[page]/`, and
  `app/blog/[slug]/`. The archive is server-paginated at 12 posts: `/blog` owns
  page 1 and only pages 2..N are valid numbered routes.
- Author defaults to the site owner (headshot + LinkedIn auto-applied).
- `app/sitemap.ts` auto-includes every post; `app/robots.ts` + `public/llms.txt`
  round out discoverability. Archive pagination is deliberately omitted from the
  sitemap because every article is already listed; ordinary previous/next/page
  anchors provide its crawl graph. The sitemap is automatic, but `public/llms.txt`
  is a manually curated list: add strategically important new guides there.
- `llms.txt` scope check (2026-07-21): entries are descriptive Markdown links
  (`- [Title](url): note`) for consumers that parse the llmstxt.org format.
  **Google ignores `llms.txt`** for rankings and generative-Search eligibility —
  it is a low-cost compatibility file for OTHER AI consumers, never a substitute
  for crawlable HTML, and product facts in it must match `lib/plans-catalog.ts`.

## Visual system (`.article` CSS in `app/globals.css`)

Reusable blocks: `takeaways`, `callout`, `stat-grid`/`stat`, `proscons`, `pills`,
auto-wrapped tables, `figure`/`figcaption`, and `quick-answer`. **Markdown does
not render inside these raw-HTML blocks** — use `<strong>`/`<em>`
([gotchas](gotchas.md)). Flagship template: `best-ai-chatbot-for-shopify.md`.

Markdown tables are enhanced centrally in `lib/blog.ts`: every cell receives
its column heading as `data-label`, and tables with four or more columns get a
wide-table marker. Container queries in `app/globals.css` turn wide tables into
labelled comparison cards inside the narrow article + TOC layout; three-column
tables stack on phones, while two-column tables stay tabular. Do not add manual
scroll wrappers or per-post table HTML.

## Answer-engine conventions

Every post: a `<blockquote class="quick-answer">` (40–60 word direct answer) under
the intro, natural question-based H2s where appropriate, contextual internal links,
primary evidence, and useful FAQs. These structures improve comprehension and make
claims easier to extract, but do not guarantee rankings, rich results, or citations.
The [SEO/GEO playbook](seo-geo-playbook.md) is authoritative; the weekly GSC
gap-analysis workflow is in `docs/seo-content-loop.md`.

## Images

`scripts/gen-blog-image.mjs <slug> "<prompt>"` → `public/blog/<slug>.webp`
(OpenAI gpt-image-1, converted to light WebP via `cwebp`). Prompts must be
illustrative/abstract — no text in the image (data lives in CSS blocks).

When a post needs a second explanatory visual, use a distinct text-free process
diagram or concept map rather than repeating the hero. Reference it in a semantic
`<figure>` with descriptive alt text, explicit 1200×800 dimensions, lazy loading,
and a caption that explains the relationship the image encodes. The July 18 AI
operations cluster is the reference set: each post pairs a 3D editorial cover with
a process infographic in `public/blog/`.

## Strategy

Competitor is **Parnidia** (see `docs/loqara-vs-parnidia.md`). Mix of how-to +
comparison/"alternatives" SEO posts; lead with intent keywords; honest voice.

The July 2026 commerce-discovery cluster covers three distinct intents:
`agentic-commerce-ecommerce` (emerging category),
`how-to-get-products-recommended-by-chatgpt` (merchant GEO/how-to), and
`ai-product-recommendation-chatbot` (commercial onsite product discovery).
They cross-link rather than competing for the same primary query.

The follow-on five-post cluster extends that coverage without reusing those
primary queries: `google-ai-mode-shopping-ecommerce` (Google-specific external
discovery), `semantic-search-ecommerce` (onsite retrieval),
`conversational-commerce-guide` (category strategy), `ai-chatbot-for-magento`
(platform implementation), and `automate-returns-with-ai-chatbot` (post-purchase
workflow). Returns content must preserve the product boundary: Loqara answers,
collects, verifies supported order status, and hands off; it does not currently
issue refunds or return labels.

The July 17 cluster was planned from an explicit overlap audit rather than raw
content volume. Its discovery branch separates the umbrella query
`generative-engine-optimization-ecommerce`, the protocol-specific
`indexnow-ecommerce-guide`, and the analytics intent
`measure-ai-search-visibility-ecommerce`. Its trustworthy-support branch moves
from source preparation (`ecommerce-ai-chatbot-knowledge-base`) to risk control
(`prevent-ai-chatbot-hallucinations`) to release validation
(`test-ai-chatbot-before-launch`). Each page owns a different question and
cross-links to its two supporting pages; do not merge or retarget them toward
the same head term.

The July 18 cluster establishes `ai-for-ecommerce` as an umbrella page for broad
AI-use-case intent, with five operational spokes that must retain separate query
ownership: Shopify merchant assistants (`shopify-ai-assistant-guide`), catalog
content operations (`ai-product-descriptions-ecommerce`), shopper experience
ranking (`ai-personalization-ecommerce`), inventory prediction
(`ai-inventory-forecasting-ecommerce`), and transaction/account risk
(`ai-fraud-detection-ecommerce`). The Shopify article distinguishes internal
Sidekick/Magic assistance from public storefront chat, so it complements rather
than replaces `best-ai-chatbot-for-shopify`. Personalization remains broader than
the conversational recommendation intent owned by `ai-product-recommendation-chatbot`.

## 2026-07-20 remediation baseline

The public-site audit found that technical SEO tags are broadly sound, but mobile
rendering/payload and editorial authority are the current constraints: clean mobile
Lighthouse measured Performance 61 on `/` (11.3 s lab LCP, ~10.5 MB) and 63 on
`/blog` (10.8 s lab LCP). The supplied Best Practices 58 was browser-extension
contamination; a clean run scored 100. The blog index currently renders all 51
posts, and the content inventory has 29 posts without external Markdown citations,
28 without explicit `related` frontmatter, and 12 without contextual inbound links.

The planned direction is documented in the
[design specification](../superpowers/specs/2026-07-20-seo-geo-remediation-design.md)
and [checkbox execution plan](../superpowers/plans/2026-07-20-seo-geo-remediation.md).
Accessibility is the final implementation phase. Do not treat `llms.txt` or FAQ
schema as Google ranking shortcuts; prioritize visible server content, media/image
budgets, index controls, curated topic relationships, primary evidence, and clear
publisher/author methodology.

Phase 1 shipped on the remediation branch in `9acaebe`: hero/showcase/reveal content
is server-visible, Lenis is removed in favor of native anchor scrolling, and the
reduced-motion hero has a hydration-safe poster snapshot. The local production-build
checkpoint improved median Performance 61 → 79 and lab LCP 11.26 s → 5.83 s;
Phase 2 still owned the ~7.96 MB hero-video payload at that checkpoint.

Phase 2 hero media shipped in `1c43ce2`: responsive mobile/desktop posters are
server-first, reduced-motion/Save-Data/2G clients remain poster-only, and the loop
source is assigned only after the intro ends. Mobile derivatives total 584 KB and
desktop derivatives 993 KB, down from 7.96 MB. Three local optimized-build audits
measured a 2.31 MB median page transfer (10.34 MB after Phase 1), Performance 78,
6.03-second lab LCP, and zero CLS. The next payload constraint is the 1.34 MB image
transfer, which was led by the chat-view showcase.

Task 2.3 shipped in `4d3d71f`: the 11 showcase PNGs became visually checked WebPs,
natural filename ordering and descriptive labels are explicit, and the carousel
mounts only its active/immediate-neighbor images. The forward neighbor waits for
browser idle; outer wings use CSS chat skeletons. Click, wrap, and swipe behavior
are covered in Playwright. Median total transfer is now 1.28 MB and image transfer
0.30 MB, with Performance 79, 5.83-second lab LCP, and zero CLS.

Phase 2 completed in `6b3b5e6`: the remaining landing illustrations are responsive,
global font preloads are limited to Geist Sans and the hero's Plus Jakarta Sans,
the nav downloads one logo state, and the live landing widget waits six seconds
plus idle or loads/opens on the first proxy click. `/present` retains immediate
widget loading. The final three-run median is Performance 85, 4.30-second simulated
LCP, 0 CLS, 0.94 MB, and 38 requests, versus Performance 61, 11.26 seconds, and
10.78 MB in the production baseline. The LCP text's observed local render delay is
~122 ms; the remaining simulated shortfall is a ~35 KB render-blocking CSS audit
tracked as Task 6.5.

Phase 3 server-paginates all 51 posts into five crawlable archive pages, hard-404s
duplicate/malformed ranges, and gives numbered pages unique canonicals and metadata.
Archive cards use responsive `next/image` output with a compact 112 px mobile
thumbnail, author identity remains text-only, and article/related covers have
explicit responsive sizes. The blog canvas/RAF grid is now a static CSS texture.
Automatic prefetch is disabled for archive links and the nav logo so a blog visit
does not speculatively download article/home route data or the homepage-only Plus
Jakarta font; the homepage hero now owns that font preload directly. Three local
optimized mobile runs measured median Performance 91, LCP 3.46 seconds, 0.41 MB,
36 requests, 13 image requests, and zero CLS. Homepage remained at Performance 85,
LCP 4.35 seconds, and 0.93 MB in the post-change smoke audit.

_Last verified: 2026-07-21 (Phase 3 remediation branch)._
