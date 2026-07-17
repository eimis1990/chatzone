# Blog & SEO

File-based markdown blog that drives organic + AI-engine traffic.

## Mechanics

- Posts are `content/blog/<slug>.md` with frontmatter (title, description, date,
  author, image). `lib/blog.ts` parses them, renders via `marked`, injects H2/H3
  anchor ids, and extracts the "Frequently asked questions" section into
  **FAQPage JSON-LD**. Pages: `app/blog/` + `app/blog/[slug]/`.
- Author defaults to the site owner (headshot + LinkedIn auto-applied).
- `app/sitemap.ts` auto-includes every post; `app/robots.ts` + `public/llms.txt`
  round out discoverability. The sitemap is automatic, but `public/llms.txt` is
  a manually curated list: add strategically important new guides there.

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

## AEO conventions (see `docs/seo-content-loop.md`)

Every post: a `<blockquote class="quick-answer">` (40–60 word direct answer) under
the intro, question-based H2s, internal links, and a 6+ FAQ section. This is what
gets cited by ChatGPT/Claude/Perplexity/Gemini. The weekly GSC gap-analysis loop
(export Search Console → find gaps → write 3–5 posts) is documented there.

## Images

`scripts/gen-blog-image.mjs <slug> "<prompt>"` → `public/blog/<slug>.webp`
(OpenAI gpt-image-1, converted to light WebP via `cwebp`). Prompts must be
illustrative/abstract — no text in the image (data lives in CSS blocks).

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

_Last verified: 2026-07-17 (GEO measurement + trustworthy-support clusters)._
