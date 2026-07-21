# SEO/GEO, performance, and indexing remediation — design specification

**Date:** 2026-07-20
**Status:** implementation in progress
**Source audit:** `/Users/eimantaskudarauskas/Desktop/www.loqara.com-20260720T225809.html`
**Execution plan:** `docs/superpowers/plans/2026-07-20-seo-geo-remediation.md`

## 1. Outcome

Make Loqara's public website fast, reliably crawlable, correctly indexed, and
demonstrably authoritative for its subject area. The work must improve both
traditional search visibility and inclusion/citation potential in generative
search without relying on unsupported GEO tricks.

The implementation is complete only when:

1. Critical public content is visible in the server-rendered page and does not
   wait for hydration.
2. The homepage no longer downloads both hero videos during its critical load.
3. The blog index no longer renders and eagerly advertises all posts at once.
4. Public routes have correct canonical, Open Graph, Twitter, sitemap, and
   structured-data output.
5. Private/auth/embed routes have an index-control strategy that can actually
   be read and enforced by crawlers.
6. Editorial pages establish who publishes the content, how it is researched,
   and why its claims should be trusted.
7. Existing articles have deliberate topical relationships and primary-source
   support where they make factual, statistical, or vendor claims.
8. Accessibility remediation is completed as the final phase, after the page
   structure and visual behavior have stabilized.

## 2. Verified baseline

The supplied report used Lighthouse 13.3 with a desktop configuration. It was
affected by an injected browser extension and a full-page screenshot protocol
timeout. An extension-free Lighthouse 13.4.1 mobile run was therefore used to
separate real site problems from audit-environment noise.

| Route/category | Supplied desktop | Clean mobile | Interpretation |
|---|---:|---:|---|
| Homepage Performance | 79 | 61 | Real mobile performance problem |
| Homepage Accessibility | 89 | 89 | Real contrast/link/target problems |
| Homepage Best Practices | 58 | 100 | Supplied failure was extension contamination |
| Homepage SEO | 100 | 100 | Basic tags pass; this does not measure content authority |
| Blog Performance | not measured separately | 63 | Listing is too large and image-heavy |
| Blog Accessibility | not measured separately | 100 | Recheck after pagination/image changes |
| Blog SEO | not measured separately | 100 | Basic technical eligibility is sound |

Clean mobile lab metrics:

- Homepage: FCP 3.6 s, LCP 11.3 s, Speed Index 7.9 s, TBT 40 ms,
  CLS 0, approximately 10.5 MB transferred.
- Blog: FCP 3.5 s, LCP 10.8 s, Speed Index 6.1 s, TBT 30 ms,
  CLS 0, approximately 2.47 MB transferred and 112 requests.
- Homepage media: approximately 7.97 MB across the intro and loop videos.
- Homepage images: approximately 2.16 MB with about 1.47 MB estimated savings.
- Fonts: 11 requests and approximately 249 KB on public routes.
- Blog HTML: approximately 228 KB, 104 image elements, 54 image preloads, and
  58 image requests on the index.

Lab measurements are regression indicators, not field Core Web Vitals. The
release decision also needs Search Console/CrUX field data once enough traffic
has accumulated.

## 3. Guiding decisions

### 3.1 SEO and GEO are one discoverability system

For Google, generative-search eligibility begins with normal Search indexing
and snippet eligibility. The design therefore prioritizes crawlability,
renderability, relevance, source quality, entity clarity, and page experience.
`llms.txt` remains a low-cost compatibility file for non-Google consumers, but
it is not treated as a Google ranking feature.

### 3.2 Server-rendered content is the source of truth

Headings, copy, navigation, article links, and primary calls to action must be
present and visibly rendered without JavaScript. Animation can enhance that
content after first paint, but may not start critical text at `opacity: 0` or
leave content dependent on an IntersectionObserver to become readable.

### 3.3 The hero starts as a poster, then progressively enhances

The initial hero is a responsive, optimized poster plus fully visible text.
Video is decorative enhancement:

- never download intro and loop concurrently;
- reduced-motion and data-saving users remain on the poster;
- mobile uses a separately encoded lightweight asset or remains poster-only;
- the loop resource is created only near the intro handoff;
- failure to autoplay must leave the poster and copy intact;
- no video request may delay the hero text, CTA, CSS, or critical font.

### 3.4 Public image loading is explicit

Use `next/image` for public-site images where optimization is beneficial.
Every image must have known dimensions or a constrained `fill` parent and a
correct `sizes` value. Only the actual above-the-fold LCP candidate may use
eager/high-priority loading. All other images are lazy by default.

The showcase renders the active design plus a bounded neighbor window. It must
not mount all full-resolution screenshots simply to position them off-screen.

### 3.5 The blog index is crawlable, paginated server content

`/blog` is page 1. Additional pages use `/blog/page/<n>` with static generation,
self-canonicals, normal anchor pagination, invalid-page 404s, and route-specific
metadata. Page size is 12 posts. This keeps every post discoverable without a
client-only "load more" dependency.

Topic hubs are separate from pagination. They organize articles by stable
reader intent and strengthen the internal-link graph; they are not thin tag
archives generated for every keyword variation.

### 3.6 `noindex` is the index-control mechanism

Authentication is the security boundary. `noindex, nofollow` metadata (or an
equivalent `X-Robots-Tag`) is the search boundary for auth, dashboard, owner,
embed, and presentation routes. `robots.txt` is used primarily for crawl
management, not as a substitute for `noindex`.

Crawler verification must confirm that publicly reachable non-indexable routes
actually return a readable `noindex` directive. API endpoints remain disallowed.

### 3.7 Freshness claims must represent real edits

Sitemap `lastModified`, article `dateModified`, visible "last updated" labels,
and Open Graph `modifiedTime` use real meaningful-edit dates. A build or request
must not make unchanged content appear newly updated.

### 3.8 Editorial trust is explicit and testable

Trust improvements consist of factual artifacts, not generic trust language:

- an About page with verifiable company/product details;
- an author page with experience, role, profile links, and authored posts;
- an editorial policy covering research, AI assistance, corrections, and
  meaningful updates;
- a comparison/review methodology explaining what was tested and what was
  researched from primary sources;
- primary-source citations adjacent to affected claims;
- visible disclosures where automation materially assisted content creation;
- original screenshots, benchmarks, examples, and case studies where possible.

No biography, customer result, benchmark, or product capability may be invented
to satisfy the specification. Missing facts require owner input.

### 3.9 Accessibility is the final implementation phase

Accessibility work is deliberately last so color tokens, animation behavior,
pagination controls, carousel controls, and link components are stable first.
The final phase covers contrast, inline-link distinction, target size, keyboard
behavior, reduced motion, screen-reader output, and automated regression checks.

## 4. Scope

### In scope

- Homepage rendering, media, images, fonts, optional widget loading, and
  nonessential client JavaScript.
- Blog listing pagination and image loading.
- Public metadata, sitemap, robots, private-route indexing controls, and
  structured data.
- About/author/editorial/methodology content and schema connections.
- Existing-blog citation, related-post, inbound-link, and topical-hub work.
- `llms.txt`, IndexNow behavior, analytics timing, and public security headers.
- Automated technical/content checks and repeatable Lighthouse verification.
- Final accessibility remediation.

### Out of scope

- A paid backlink campaign, digital PR campaign, or fabricated third-party
  mentions.
- Guaranteed rankings, traffic, AI citations, or indexing; search engines make
  the final serving decision.
- Product-dashboard performance except where a root-layout change could affect it.
- Product functionality unrelated to public discoverability.
- A legal opinion on Privacy or Terms copy; real dates can be implemented, but
  substantive legal review remains an owner/legal task.
- Publishing new keyword-targeted articles before the existing quality and
  internal-link backlog is under control.

## 5. Performance and quality budgets

Use the median of three clean mobile Lighthouse runs against a production build.
One anomalous run is not a pass or a failure by itself.

| Measure | Homepage release target | Blog index release target |
|---|---:|---:|
| Lighthouse Performance | >= 85 | >= 90 |
| Lighthouse SEO | 100 | 100 |
| Lighthouse Best Practices | 100 | 100 |
| Lab LCP | <= 3.5 s | <= 3.5 s |
| TBT | <= 200 ms | <= 200 ms |
| CLS | <= 0.10 | <= 0.10 |
| Initial transfer before deferred media | <= 2.0 MB | <= 1.5 MB |
| Initial image requests | <= 12 | <= 16 |
| Preloaded font files | <= 3 | <= 3 |
| Concurrent hero video downloads | 1 maximum | n/a |
| Posts rendered on first index page | n/a | 12 |

Field target after rollout: Good Core Web Vitals at the 75th percentile,
including LCP <= 2.5 s, INP <= 200 ms, and CLS <= 0.1. Field status is monitored
for 28 days; it is not allowed to block the initial engineering release when no
representative field data exists.

Content/indexing acceptance targets:

- Every sitemap URL returns 200, an indexable canonical, and no accidental
  `noindex`.
- Every intentionally private route family has a verifiable `noindex` strategy.
- No unchanged route receives a synthetic current `lastModified` date.
- All 51 current posts have curated related links or a deliberate topical
  fallback based on category, never global recency.
- Every current post has at least two relevant contextual outbound internal
  links unless an editorial exception is documented.
- Every current post has at least one relevant contextual inbound link.
- Statistical, legal/regulatory, time-sensitive, and vendor-capability claims
  cite primary sources or are removed/rephrased as clearly identified opinion.
- Comparison/review posts disclose the evaluation method and relationship to
  the products being compared.

Final accessibility target:

- Lighthouse Accessibility 100 on `/` and `/blog`.
- Zero axe serious/critical violations on homepage, blog index, and one article.
- All interactive controls work by keyboard with a visible focus indicator.
- Normal text meets WCAG AA contrast; large text and UI components meet their
  applicable thresholds.
- Reduced-motion mode has no autoplay decorative video, forced smooth scrolling,
  or content hidden by motion state.

## 6. Proposed implementation architecture

### 6.1 Public rendering and animation

- Convert hero copy wrappers from Framer Motion elements to normal semantic
  elements or hydration-safe animation wrappers whose initial server style is
  visible.
- `Reveal` and `RevealSlide` default to visible content. If reveal motion is
  retained, apply only transform/transition enhancement after JavaScript is
  active and never leave an invisible no-JS state.
- Remove Lenis unless measured conversion or usability evidence justifies its
  persistent RAF/client cost; native `scroll-behavior` is the default.

### 6.2 Hero media controller

- Keep a poster in the initial server markup.
- Detect reduced-motion and save-data before assigning a video `src`.
- Select desktop/mobile video variants using media information.
- Attach only the intro source first. Create/assign the loop source after intro
  playback is established and close to completion.
- Use a deterministic state model: `poster -> intro-loading -> intro-playing ->
  loop-loading -> loop-playing`, with all errors returning to `poster`.
- Video is `aria-hidden`, noninteractive, and never the only carrier of content.

### 6.3 Font boundary

- Root layout preloads only the globally used base face(s).
- Landing display font is either scoped to the marketing route or explicitly
  retained as the third permitted preload.
- Chat font catalog faces set `preload: false` and load only when their CSS
  variables are actually used.
- Confirm widget/configurator routes still render every selectable font before
  removing any root variable.

### 6.4 Blog pagination and taxonomy

- Add a shared server-rendered listing component.
- Add `BLOG_PAGE_SIZE = 12`, page-count calculation, page slicing, and validation
  to the blog data layer.
- Generate `/blog/page/[page]` static params for pages 2..N.
- Use anchor-based previous/next and numbered pagination.
- Add a small curated category vocabulary to frontmatter and data types; no
  free-form explosion of tag pages.
- Category hubs contain unique editorial introductions and curated pillar/spoke
  ordering, rather than duplicating the paginated listing.

### 6.5 Metadata and structured data

- Define route-specific Open Graph and Twitter metadata for home, blog index,
  paginated blog pages, Privacy, Terms, About, author, editorial policy, and
  methodology.
- Preserve per-article metadata and add `modifiedTime` when `updated` exists.
- Enrich article `Person` with a canonical author URL, verified `sameAs`, role,
  and `worksFor` relationship to the existing Organization entity.
- Keep FAQ schema only where every question and answer is visibly present and
  exactly matches the page. Do not present it internally as a guaranteed rich
  result or a special GEO requirement.

### 6.6 Content quality automation

Add a read-only blog audit script that reports and can fail CI for objective
violations:

- duplicate slug/title/description;
- invalid dates or `updated < date`;
- missing author/category/image/description;
- broken internal blog links;
- invalid explicit `related` slugs;
- fewer than two contextual internal links;
- zero contextual inbound links;
- missing Quick Answer where the editorial template requires it;
- missing source section/citations for content categories that require them;
- image paths that do not exist.

The script cannot judge whether prose is genuinely helpful or whether a source
supports a claim. Those remain human review gates.

### 6.7 Secondary delivery controls

- Homepage widget injection is deferred until idle or first relevant interaction;
  `/present` keeps immediate loading.
- GA loads after window load/consent as chosen by the owner, with page-view and
  conversion-event verification before release.
- Add conservative response security headers. CSP begins in report-only mode and
  is promoted only after GA, Vercel Analytics, Stripe, widget, OpenAI, Supabase,
  and ElevenLabs flows have been exercised.
- IndexNow submits changed public URLs rather than every URL after every build.
- Convert bare URLs in `llms.txt` to descriptive Markdown links, while keeping
  the file curated and secondary to HTML pages.

## 7. Rollout and regression policy

There is no staging gate; `main` deploys to production. Each phase therefore
ships as a separately verified commit or small group of commits.

For every engineering phase:

1. Check the current branch and worktree for concurrent changes.
2. Run targeted tests while implementing.
3. Run `npm run typecheck`, `npm test`, `npm run lint`, and `npm run build`.
   Lint passes at zero errors; the known compiler warnings are not phase blockers.
4. Exercise the changed paths locally at 375 px and desktop width.
5. Deploy, smoke-test production HTML/headers, and run three clean mobile
   Lighthouse passes.
6. Compare against this baseline and record the result before starting the next
   phase.

If a phase regresses conversion-critical behavior, indexing, or an established
performance budget, fix or revert that phase before proceeding. Do not stack
later work on an unverified regression.

## 8. Dependencies and owner decisions

Implementation can begin without further decisions for rendering, video,
images, pagination, robots/noindex, sitemap dates, and route metadata.

The following require owner input before their task is considered complete:

- verified About/author biography and credentials;
- whether and how AI-assisted editorial production is disclosed;
- the actual review/testing process used for vendor comparisons;
- the last substantive review dates for Privacy and Terms;
- whether GA should be consent-gated or merely delayed;
- any public customer names, case-study results, or performance benchmarks;
- CSP enforcement timing after report-only telemetry is reviewed.

## 9. Definition of done

The program is done when all plan checkboxes are complete, final performance and
accessibility budgets pass, production metadata/crawl checks pass, the editorial
backlog has been reviewed by a human, and a 28-day Search Console monitoring
checkpoint has been recorded. Completion means the site is technically and
editorially stronger; it does not mean a particular ranking is guaranteed.
