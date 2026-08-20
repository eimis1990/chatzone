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
The renderer still emits `FAQPage` data for correctly structured visible FAQs, but
Google stopped showing FAQ rich results on May 7, 2026 and removed its FAQ rich-result
documentation on June 15, 2026. Keep useful Q&A for shoppers and other consumers;
never position it as a Google rich-result tactic.
The [SEO/GEO playbook](seo-geo-playbook.md) is authoritative; the weekly GSC
gap-analysis workflow is in `docs/seo-content-loop.md`.

## Images

New blog raster assets use the built-in OpenAI Image 2 workflow and are saved as
optimized 1200×800 WebP files in `public/blog/`. Higgsfield is no longer a blog
image dependency because its subscription was cancelled. The older
`scripts/gen-blog-image.mjs <slug> "<prompt>"` path remains available for legacy
gpt-image-1 generation. Prompts must be text-free; data labels belong in HTML/CSS,
not in generated pixels.

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

The July 23 commercial-intent cluster adds three decision pages without reopening
those umbrella queries. `ai-chatbot-for-furniture-stores` owns the vertical,
constraint-heavy furniture intent and specializes the generic recommendation
guide. `shopify-inbox-vs-ai-chatbot` owns the native-free-chat versus dedicated-AI
decision; it must preserve the current capability boundary that Loqara searches
Shopify products but does **not** look up Shopify orders. `live-chat-vs-ai-chatbot-ecommerce`
owns the staffing/routing decision, distinct from the technology taxonomy in
`conversational-ai-vs-chatbot` and the handoff mechanics in
`ai-chatbot-human-handoff`. Each post has a text-free cover plus explanatory
process visual, explicit related slugs, contextual backlinks, useful FAQs, and
primary/first-party evidence where claims are time-sensitive.

The July 25 specific-use-case cluster specializes four different customer jobs
without retargeting the broad recommendation or returns pages:
`ai-chatbot-for-electronics-stores` owns exact device/accessory compatibility;
`ai-chatbot-for-b2b-ecommerce` owns technical-buyer qualification before a sales
or engineering handoff; `ai-chatbot-prevent-avoidable-returns` owns optional,
low-risk troubleshooting **before** the return process described by
`automate-returns-with-ai-chatbot`; and
`ai-chatbot-for-beauty-skincare-stores` owns non-medical product/ingredient
guidance. Preserve their boundaries: no invented compatibility or suitability,
binding quotes or account pricing, blocked return routes, diagnosis, treatment,
or allergy guarantees. Each uses an editorial cover plus a separate realistic
customer-use scene, both text-free 1200×800 WebP assets.

The August 5 AI-shopping data-readiness cluster adds three narrow operational
spokes beneath the broader ChatGPT-shopping guide. `openai-product-feed-ecommerce`
owns the current stable-feed checklist and does not promise merchant acceptance or
placement. `product-variants-ai-shopping` owns exact item/group/variant modelling
across the OpenAI feed and Google's Product/ProductGroup vocabulary.
`product-qa-ai-shopping` owns the verified shopper-question workflow and explicitly
reflects Google's May 2026 removal of FAQ rich results. The three posts cross-link,
backlink from the broad ChatGPT guide, cite current OpenAI/Google primary sources,
and each pair a text-free editorial cover with a distinct explanatory diagram.

The August 14 vertical acquisition cluster owns three specific commercial-intent
jobs without reopening the broad e-commerce AI query. `ai-chatbot-for-fashion-stores`
owns size and subjective-fit guidance while preserving the no-guarantee and
privacy boundaries. `ai-chatbot-for-auto-parts-stores` owns exact vehicle-fitment
verification and states that Loqara is not a VIN decoder or fitment database by
default. `ai-chatbot-for-hardware-stores` owns project quantities and product-system
compatibility, with a professional handoff for safety-sensitive work. Each post
has one text-free editorial cover and one physically plausible realistic use-case
scene generated with OpenAI Image 2, both optimized to 1200×800 WebP.

## Backlink acquisition baseline (2026-08-15)

Search-index sampling (not a complete backlink export) found that Loqara's visible
third-party footprint is still thin relative to its 65-post content base. Competitors'
repeatable authority channels are distribution assets rather than generic guest-post
volume: Shopify and software-review profiles, platform/integration partner pages,
customer case studies that clients and partners also promote, original-data reports,
podcast appearances, webinars, communities, and industry awards.

The in-widget `Powered by Loqara` anchor is rendered inside Loqara's own embed iframe
(`components/widget/ChatWindow.tsx:1420-1440`), so it does **not** create a normal
host-page backlink from the merchant domain. Treat it as branding/referral traffic,
not a backlink program. Seek optional, editorial host-site mentions through joint
case studies and integration pages; never require keyword-rich links in customer
contracts or add distributed hidden/footer links. Google explicitly classifies
forced, paid, automated, and widely distributed template links as link spam.

Priority acquisition order: (1) credible product/review profiles and genuine customer
reviews; (2) Verskis and other platform/agency integration pages; (3) measured customer
case studies with reusable charts and methodology; (4) a quarterly anonymized commerce
conversation benchmark co-published with partners; (5) founder podcast/webinar pitches
based on the benchmark and live evaluations. Exact referring-domain counts and a
link-intersect export require a dedicated index such as Semrush or Ahrefs.

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

The 2026-08-04 landing refresh replaced the homepage's full-bleed hero-video
presentation with a white character/conversation composition. `Hero` owns two
optimized Higgsfield WebPs (fox and fictional customer avatar), a CSS-only
reduced-motion-safe three-message entrance on a plain white stage, and the
existing dark platform marquee (`components/landing/Hero.tsx`,
`app/globals.css`). `HeroFoxMedia` progressively covers the SSR/LCP fox still
with a 611 KB, silent, eight-second Seedance idle loop after hydration. The fox
stays planted while blinking, looking aside, and returning to the supplied
neutral pose. Reduced-motion, Save-Data, 2G, failed-playback, and pre-hydration
states keep the still image (`components/landing/HeroFoxMedia.tsx`). The older
full-stage `HeroVideo` and its responsive derivatives remain unused legacy code.

The hero is a `100svh` composition rather than a stack of fixed-height blocks:
its copy remains shrink-wrapped, the conversation stage takes the remaining
height, and the platform marquee is a fixed bottom sibling. Display type, copy,
stage spacing, and fox scale respond to `svh`; compact phone heights get a tighter
override. The fox canvas is offset 8px on mobile / 12px on desktop because the
opaque character centroid sits left of the transparent image canvas center, so
the visible character—not the file bounds—lands on the viewport midpoint
(`components/landing/Hero.tsx`, `app/globals.css`). The fox still is eagerly
loaded because it remains the hero's above-the-fold LCP image; the video begins
only after the browser media policy permits it.

The final hero rhythm gives the two headline lines a 1.04 line-height, moves the
copy block modestly away from the header, and lowers the fox within the remaining
stage without displacing the bottom marquee. Supporting copy is deliberately one
benefit-led sentence: instant voice/chat answers grounded in products, policies,
and live order data (`components/landing/Hero.tsx`, `app/globals.css`).

The 2026-08-10 pass loosened that rhythm further: hero copy padding rose to
`clamp(6.5rem, 13svh, 9.75rem)`, stage margin to `clamp(2rem, 5.5svh, 4.5rem)`,
and the desktop fox shrank to `clamp(28rem, 56svh, 37rem)` so most of the
character reads (~129px of him hides behind the strip, down from ~307px at the
original `72svh`)
(`app/globals.css:359`, `:372`, `:389`). The marquee's
"Works wherever your store runs" label was dropped and the band tightened to
`py-3` with `text-xl`/`size-6` marks, taking it from ~93px to 53px — that
reclaimed height is what buys the extra breathing room while keeping the strip
inside the viewport (`components/landing/Hero.tsx:70`). The band keeps an
`aria-label` in place of the deleted visible heading. Because the scene sits lower, the
image-card breakpoint moved from 821px to 880px of viewport height
(`components/landing/HeroConversation.tsx:18`); shorter screens fall back to two
compact rows instead of clipping the third behind the marquee.

`HeroConversation` rotates through three 11.5-second commerce examples: chair
recommendations rendered as production compact `ProductCards`, a sofa search
rendered as responsive production `ProductCards`, and shipment tracking rendered
by the production timeline `OrderStatusCard`. Shared demo records live in
`lib/widget-components/sample-data.ts`, so the homepage and component-library
previews cannot silently drift. Tall desktop stages use the image-card carousel;
short desktop and mobile stages use the same component's compact variant to keep
the entire answer above the platform marquee. The chair scene shows three rows on
tall desktop and two rows at shorter heights for the same reason. Distinct local
chair product shots keep those compact results credible. Each scene also owns a
distinct local customer portrait (original woman, male furniture shopper, and
curly-haired Black order-tracking shopper), and the opening questions are long
enough to preserve the intended multi-line customer-bubble silhouette.
Each scene now closes with the entrance motion reversed and reverse-staggered:
the closing customer bubble exits first, followed by the rich fox response and
then the opening question. React starts the 1.85-second exit phase before the
11.5-second scene swap, while CSS owns the three reverse delays and mirrored easing.
The opening customer question mirrors the rich answer's outer page margin, while
the compact closing reply sits farther inward near the fox to balance the larger
cards on the left. `prefers-reduced-motion` disables rotation and leaves the chair conversation visible
(`components/landing/HeroConversation.tsx`).

_Last verified: 2026-08-14 (working tree)._
