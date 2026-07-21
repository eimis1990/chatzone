# SEO/GEO, performance, and indexing remediation — implementation plan

> **Status:** ready for execution. Track progress by changing `[ ]` to `[x]`.
> Accessibility is intentionally the final implementation phase.

**Goal:** Resolve the verified Lighthouse, rendering, indexing, metadata, and
content-authority findings for Loqara's public website.

**Spec:** `docs/superpowers/specs/2026-07-20-seo-geo-remediation-design.md`

**Primary baseline:** homepage mobile Performance 61 / Accessibility 89 /
Best Practices 100 / SEO 100; homepage LCP 11.3 s and approximately 10.5 MB;
blog mobile Performance 63 / Accessibility 100 / SEO 100; blog LCP 10.8 s.

## Global constraints

- Work phase by phase. Do not begin a later phase until the current phase has
  passed its production smoke checks, unless the later task is documentation-only.
- Preserve user changes in the worktree and check for concurrent sessions before
  every commit.
- This is Next.js 16.2.9 with project-specific behavior. Read the relevant guide
  in `node_modules/next/dist/docs/` before changing metadata, fonts, images,
  route handlers, or caching.
- Public headings, body copy, navigation, post links, and primary CTAs must remain
  useful without JavaScript.
- Do not make SEO claims by hiding content, creating doorway/tag permutations,
  fabricating author credentials, or changing dates without meaningful edits.
- Run tests with `npm test`, not plain `npx vitest`.
- Lint passes at zero errors; existing React Compiler warnings are expected.
- Preserve the existing homepage URL, article URLs, canonical URLs, and pricing
  anchors. Any URL change requires a redirect task that is not currently planned.
- Do not remove analytics or the live landing widget without explicit product
  approval; defer and verify them instead.
- Do not enforce CSP until report-only results have been reviewed against all
  third-party integrations.
- Accessibility changes are Phase 7. Earlier phases may make content visible or
  motion hydration-safe for performance, but formal contrast/keyboard/target
  remediation waits until Phase 7.

## Standard verification commands

Run after every implementation phase:

```bash
npm run typecheck
npm test
npm run lint
npm run build
```

Clean mobile Lighthouse, three times per route, against a production build or
production URL:

```bash
npx --yes lighthouse https://www.loqara.com/ \
  --output=json --output-path=/tmp/loqara-home.json \
  --chrome-flags="--headless --no-sandbox --disable-extensions" \
  --only-categories=performance,accessibility,best-practices,seo --quiet

npx --yes lighthouse https://www.loqara.com/blog \
  --output=json --output-path=/tmp/loqara-blog.json \
  --chrome-flags="--headless --no-sandbox --disable-extensions" \
  --only-categories=performance,accessibility,best-practices,seo --quiet
```

Use the median, not the best score. Preserve a short before/after record in the
phase's PR or commit notes.

---

## Phase 0 — Baseline, guardrails, and test fixtures

### Task 0.1: Create a reproducible public-site audit record

**Files:**

- Create: `docs/seo-performance-baseline-2026-07-20.md`
- Optionally create: `scripts/summarize-lighthouse.mjs`

- [x] Record the clean homepage and blog metrics from the design specification.
- [x] Record the Lighthouse version, mobile throttling profile, URL, timestamp,
      deployment SHA, and extension-free Chrome flags.
- [x] If adding the summary script, accept a Lighthouse JSON path and output
      category scores, FCP, LCP, TBT, CLS, transfer size, request count, image
      bytes, video bytes, script bytes, and font bytes. Keep it dependency-free.
- [x] Document that the supplied Best Practices 58 is invalid because an extension
      injected code; retain the supplied report only as historical evidence.

**Acceptance:** another developer can reproduce the same audit configuration and
compare a future run without manually exploring the Lighthouse HTML.

### Task 0.2: Add focused regression coverage for public SEO output

**Files:**

- Create: `tests/unit/public-seo.test.ts`
- Modify later in Phase 4 as route behavior is implemented

- [x] Add initial tests for sitemap URL uniqueness, canonical URL construction,
      and post `dateModified = updated ?? date` behavior.
- [x] Add fixtures for an article with and without `updated`.
- [x] Add a helper test ensuring all explicit `related` slugs resolve.
- [x] Keep route-render/header smoke tests separate if they require a running app.

**Acceptance:** tests fail for the known synthetic sitemap freshness and pass only
after Phase 4 implements real dates.

---

## Phase 1 — Critical rendering path and LCP

### Task 1.1: Make hero content visible in server HTML

**Files:**

- Modify: `components/landing/Hero.tsx`
- Modify as needed: `app/globals.css`
- Test: add a server-render assertion or Playwright smoke test

- [x] Replace `motion.h1`, `motion.p`, and the animated CTA wrapper with semantic
      elements whose initial rendered opacity is 1.
- [x] Remove hydration-dependent opacity from the eyebrow, heading, paragraph,
      and CTA.
- [x] If entrance motion is retained, use a CSS/progressive-enhancement approach
      that never hides content in server HTML and does not delay LCP.
- [x] Preserve heading hierarchy, current copy, responsive layout, and CTA behavior.
- [x] Verify the page with JavaScript disabled: heading, paragraph, CTA, pricing
      links, and navigation remain visible and usable.

**Acceptance:** Lighthouse's LCP element has no material client-side element-render
delay attributable to hydration; critical text is visible in no-JS screenshots.

### Task 1.2: Make reusable reveal components hydration-safe

**Files:**

- Modify: `components/landing/Reveal.tsx`
- Review callers: `components/landing/sections.tsx`, pricing, FAQ, and showcase

- [x] Change `Reveal` and `RevealSlide` so server-rendered children are visible.
- [x] Remove the reduced-motion branch that explicitly starts at opacity 0.
- [x] Retain transform enhancement only when it cannot leave content invisible if
      hydration, IntersectionObserver, or animation execution fails.
- [x] Test direct navigation to `/#pricing`, `/#faq`, and `/#how`.
- [x] Capture a full-page no-JS screenshot and confirm no blank sections.

**Acceptance:** all marketing content is readable without scrolling-triggered
JavaScript; the visual order and section spacing are unchanged.

### Task 1.3: Remove nonessential smooth-scroll runtime work

**Files:**

- Modify: `app/page.tsx`
- Remove or simplify: `components/landing/SmoothScroll.tsx`
- Modify as needed: `app/globals.css`
- Modify: `package.json` only if `lenis` becomes unused everywhere

- [x] Replace Lenis behavior with native anchor navigation and CSS
      `scroll-behavior: smooth` under `prefers-reduced-motion: no-preference`.
- [x] Add `scroll-margin-top` to anchored sections so the fixed navigation does
      not cover headings.
- [x] Confirm the signup hash still opens `GetStartedDialog` and is not captured
      as a normal scroll target.
- [x] Use `rg` to prove `lenis` has no remaining consumers before removing it.

**Acceptance:** all header anchors work, back/forward navigation remains native,
and no page-long Lenis RAF loop runs on the homepage.

### Phase 1 gate

- [x] Standard verification commands pass.
- [x] No-JS homepage contains and visibly renders all primary content.
- [x] Median clean mobile LCP improves from the 11.3 s baseline.
- [x] There is no regression in CTA/dialog behavior or CLS.

---

## Phase 2 — Homepage media, images, fonts, and deferred features

### Task 2.1: Implement an adaptive hero-media state machine

**Files:**

- Modify: `components/landing/HeroVideo.tsx`
- Modify: `components/landing/Hero.tsx` if the poster moves to server markup
- Add tests: `tests/unit/hero-media-policy.test.ts` for pure policy decisions

- [x] Render a responsive poster before any video source is assigned.
- [x] Add a pure policy helper for reduced motion, save-data, viewport class, and
      supported media variants; unit-test all branches.
- [x] Under reduced motion or save-data, remain poster-only.
- [x] Ensure only the intro video has a `src` during the initial video phase.
- [x] Create or assign the loop source only near/after intro completion; do not
      use two simultaneous `preload="auto"` elements.
- [x] On autoplay rejection, decode error, or missing asset, return to the poster.
- [x] Keep video decorative (`aria-hidden`, no focus, no essential information).
- [x] Verify route transitions clean up playback and listeners.

**Acceptance:** browser network logs show at most one hero video downloading at a
time; reduced-motion/save-data tests show no video requests.

### Task 2.2: Produce lightweight hero media variants

**Files:**

- Replace/add assets under `public/` with explicit desktop/mobile names
- Update: `components/landing/HeroVideo.tsx`
- Document source/encode command in `docs/LANDING.md`

- [x] Inventory resolution, duration, bitrate, codec, and size for current intro,
      loop, and posters.
- [x] Create a mobile crop/encode and a desktop encode. Preserve the seamless
      intro-to-loop handoff.
- [x] Target combined mobile intro+loop assets below 2 MB and each individual
      initial video request below 1 MB where acceptable quality allows.
- [x] Re-encode posters to responsive WebP/AVIF sizes and verify the fox/copy crop
      at 375 px, 768 px, 1440 px, and ultrawide.
- [x] Do not delete original source assets until `rg`, asset references, and a
      production smoke test confirm they are unused. Remove unused public copies
      in a separate, reviewable commit.

**Acceptance:** no single mobile hero request approaches the prior 3.9–4.1 MB
files, visual handoff remains acceptable, and the critical page budget passes.

### Task 2.3: Bound and optimize the chat-view showcase

**Files:**

- Modify: `components/landing/Showcase.tsx`
- Modify: `components/landing/ShowcaseFan.tsx`
- Modify: `components/ui/card-fan-carousel.tsx`
- Replace: `public/chatviews/*.png` with optimized WebP/AVIF equivalents

- [x] Convert all 11 screenshots to visually reviewed WebP or AVIF.
- [x] Preserve deterministic ordering and meaningful image alt text where the
      screenshot communicates content.
- [x] Mount only the active card and a bounded neighbor set; use placeholders for
      fan positions that do not need full-resolution images.
- [x] Use `next/image` with explicit dimensions/fill and accurate `sizes`.
- [x] Lazy-load all nonactive/non-neighbor images and prefetch only the next likely
      card after the main page is idle.
- [x] Verify carousel wrapping, swipe/click behavior, and no layout shift.

**Acceptance:** initial homepage load requests at most three showcase images and
the carousel still reaches every design.

### Task 2.4: Optimize remaining landing images

**Files:**

- Modify: `components/landing/sections.tsx`
- Review: all `components/landing/**/*.tsx`

- [x] Replace the three `HowItWorks` plain images with `next/image` and accurate
      responsive `sizes`.
- [x] Audit every landing `<img>` and classify it as eager LCP, normal lazy
      content, or decorative.
- [x] Ensure only a proven LCP image uses `preload`; do not preload below-fold
      images.
- [x] Verify intrinsic dimensions/aspect-ratio containers prevent CLS.
- [x] Compare image bytes and responsive candidates in the browser network panel.

**Acceptance:** Lighthouse image-delivery savings are no longer dominated by
landing screenshots/posters and no below-fold landing image appears in head
preloads.

### Task 2.5: Reduce global font preloads

**Files:**

- Modify: `app/layout.tsx`
- Potentially create: a route-scoped font module/layout
- Verify consumers: `lib/fonts.ts`, widget/configurator components

- [x] Keep global preload only for the true base UI font(s).
- [x] Set all chat-catalog families to `preload: false` unless a route-specific
      measurement proves one is critical.
- [x] Decide whether Plus Jakarta remains a marketing preload or the hero uses the
      base face; keep total public preloads at three or fewer.
- [x] Verify every selectable chat font still applies in configurator preview and
      embedded widget.
- [x] Compare homepage, blog, app, and embed font requests after the change.

**Acceptance:** homepage and blog each preload no more than three font files with
no broken font selection or visible layout shift.

### Task 2.6: Defer the live landing widget without changing `/present`

**Files:**

- Modify: `components/landing/WidgetEmbed.tsx`
- Modify: `app/page.tsx`
- Verify: `app/present/[botId]/page.tsx`

- [x] Add an explicit loading policy prop such as `immediate | idle | interaction`.
- [x] Use deferred loading on `/` and retain immediate loading on `/present`.
- [x] Ensure first user interaction with the launcher affordance loads and opens
      the widget reliably rather than requiring a second click.
- [x] Cancel idle callbacks/listeners on unmount and retain full widget cleanup.
- [x] Verify analytics events and the owner landing-bot toggle.

**Acceptance:** no widget iframe/config request is on the initial homepage critical
path; presentation demos remain immediate.

### Phase 2 gate

- [x] Standard verification commands pass.
- [x] At most one hero video request occurs concurrently.
- [x] Homepage initial transfer before deferred media is <= 2.0 MB.
- [x] Homepage median mobile Performance is >= 85 and lab LCP <= 3.5 s, or any
      shortfall is documented with the remaining dominant audit and a corrective task.
- [x] Desktop and mobile visual QA confirms no meaningful quality regression.

Phase 2 closed at median Performance 85, 0.94 MB, and 4.30-second simulated
LCP. The LCP element is server-visible text with only ~122 ms observed render
delay; the remaining simulated shortfall is led by two route CSS files (35 KB,
Lighthouse-estimated 410 ms savings). Corrective work is tracked in Task 6.5 so
indexing and crawl fixes can proceed without reopening the completed media budget.

---

## Phase 3 — Blog index performance and crawlable organization

### Task 3.1: Add server-rendered blog pagination

**Files:**

- Modify: `lib/blog.ts`
- Refactor: `app/blog/page.tsx`
- Create: `app/blog/page/[page]/page.tsx`
- Create: `components/blog/BlogIndexPage.tsx`
- Create: `components/blog/BlogPagination.tsx`
- Test: `tests/unit/blog-pagination.test.ts`

- [x] Add `BLOG_PAGE_SIZE = 12`, validated page slicing, and total-page helpers.
- [x] Keep `/blog` as page 1 and generate static pages 2..N.
- [x] Return 404 for page 1 under `/blog/page/1`, zero, negative, nonnumeric, or
      beyond-last pages to prevent duplicate/soft-404 URLs.
- [x] Add normal crawlable anchor links for previous, next, and nearby page numbers.
- [x] Add self-canonical and unique title/description for each paginated page.
- [x] Ensure all 51 posts are reachable by following links from `/blog`.
- [x] Decide whether pagination URLs belong in the sitemap; apply one consistent
      documented rule and test it.

**Acceptance:** `/blog` renders exactly 12 cards; every post is reachable within
the pagination graph; no client JavaScript is required to discover later posts.

### Task 3.2: Optimize blog card and article images

**Files:**

- Modify: `app/blog/page.tsx` or shared `BlogIndexPage.tsx`
- Modify: `app/blog/[slug]/page.tsx`
- Review: `components/blog/RelatedGuides.tsx`

- [x] Replace public-site plain image elements with `next/image` where appropriate.
- [x] Set card `sizes` for one-, two-, and three-column breakpoints.
- [x] Make only the first visible cover eligible for eager/high-priority loading;
      every remaining cover and avatar is lazy.
- [x] Avoid repeating an eager author headshot on every card. Retain author identity
      as text even if card avatars are removed.
- [x] Give the article hero accurate responsive sizes and preserve aspect ratio.
- [x] Verify existing generated WebP assets are not unnecessarily recompressed or
      enlarged by the optimizer.

**Acceptance:** `/blog` has no mass image preload list, no more than 16 initial
image requests, and no image-related CLS.

### Task 3.3: Remove nonessential client animation from the blog header

**Files:**

- Review/modify: `components/magicui/flickering-grid.tsx`
- Modify: shared blog listing/header component

- [x] Measure the grid's script/CPU contribution after pagination and image work.
- [x] If material, replace it on blog pages with a static CSS background or pause
      until after first interaction.
- [x] Preserve the visual hierarchy without making the H1 dependent on canvas.

**Acceptance:** the blog H1 and listing render without client animation; TBT stays
within budget on low-end mobile simulation.

### Phase 3 gate

- [x] Standard verification commands pass.
- [x] Blog median mobile Performance is >= 90 and lab LCP <= 3.5 s.
- [x] Blog transfer is <= 1.5 MB and only 12 cards render on page 1.
- [x] Pagination works with JavaScript disabled and returns correct canonicals/404s.

---

## Phase 4 — Indexing, metadata, sitemap, and structured data

### Task 4.1: Apply explicit `noindex` metadata to non-public route families

**Files:**

- Create: `app/(auth)/layout.tsx`
- Modify: `app/(client)/app/layout.tsx`
- Modify: `app/(owner)/owner/layout.tsx`
- Modify: `app/embed/[publicKey]/layout.tsx`
- Modify: `app/present/[botId]/page.tsx` or create a route layout
- Test: extend `tests/unit/public-seo.test.ts`; add running-app smoke checks

- [x] Export `robots: { index: false, follow: false }` from auth, client, owner,
      embed, and presentation route boundaries.
- [x] Confirm metadata exports remain in Server Components.
- [x] Verify with Googlebot-like curl/browser requests that each publicly reachable
      route returns a readable noindex tag or X-Robots header.
- [x] Verify public `/`, `/blog`, articles, Privacy, and Terms remain indexable.
- [x] Confirm authentication still protects private content independently of SEO.

**Acceptance:** every route family has an intentional, tested indexing state and
no private route relies only on robots disallow.

### Task 4.2: Simplify `robots.txt` around the noindex policy

**Files:**

- Modify: `app/robots.ts`
- Test: extend `tests/unit/public-seo.test.ts`

- [x] Keep APIs and other genuine crawl-waste endpoints disallowed.
- [x] Remove disallows that prevent crawlers from seeing required noindex metadata,
      unless authentication alone makes fetching impossible and the reason is
      documented.
- [x] Include `/present` in the reviewed policy rather than leaving it accidental.
- [x] Verify generated `/robots.txt` syntax, sitemap URL, and production host.

**Acceptance:** robots rules and route metadata do not contradict each other; the
generated file contains only deliberate entries.

### Task 4.3: Replace synthetic sitemap freshness with real dates

**Files:**

- Modify: `app/sitemap.ts`
- Modify: `lib/blog.ts` only if date helpers belong there
- Test: `tests/unit/public-seo.test.ts`

- [x] Use `updated ?? date` for every article sitemap entry.
- [x] Define real, stable modification dates for homepage/blog/static legal pages,
      or omit `lastModified` where no reliable source exists.
- [x] Do not instantiate `new Date()` merely because the sitemap was requested.
- [x] Validate unique URLs, valid ISO dates, and `updated >= date`.
- [x] Include new About/author/policy/methodology and topic-hub routes when they
      become public in Phase 5.

**Acceptance:** two unchanged sitemap requests/builds produce the same modification
dates and articles use their real latest meaningful edit.

### Task 4.4: Add route-specific social metadata

**Files:**

- Modify: `app/blog/page.tsx`
- Modify/create: paginated blog metadata
- Modify: `app/privacy/page.tsx`
- Modify: `app/terms/page.tsx`
- Review: `app/page.tsx`, `app/layout.tsx`, `app/blog/[slug]/page.tsx`

- [x] Add explicit Open Graph title, description, canonical URL, type, and image to
      every public non-article route.
- [x] Add matching Twitter metadata.
- [x] Add `modifiedTime` to article Open Graph data when `updated` exists.
- [x] Verify the root homepage image/URL no longer leaks onto Blog, Privacy, Terms,
      or paginated pages.
- [ ] Validate with raw HTML/head inspection and at least one social-card debugger.

**Acceptance:** every public route reports its own correct absolute OG URL, title,
description, and image.

### Task 4.5: Make legal-page update dates factual

**Files:**

- Modify: `app/privacy/page.tsx`
- Modify: `app/terms/page.tsx`

- [ ] Obtain actual substantive review dates from the owner/legal reviewer.
      _Interim: pages show 2026-07-02 — the last substantive content edit from
      git history (`LEGAL_UPDATED` in lib/site.ts). Owner must confirm or
      replace with a real legal-review date._
- [x] Replace `new Date().getFullYear()` with fixed reviewed dates.
- [x] Use the same dates in sitemap metadata and any structured/social metadata.
- [x] Do not imply legal review that did not occur; mark this task blocked pending
      owner input if dates cannot be verified.

**Acceptance:** visible and machine-readable dates remain stable until the documents
are meaningfully reviewed again.

### Task 4.6: Correct structured-data claims and validation

**Files:**

- Modify: `app/page.tsx`
- Modify: `app/blog/[slug]/page.tsx`
- Add tests: `tests/unit/structured-data.test.ts`

- [x] Preserve Organization, WebSite, SoftwareApplication, BlogPosting, and
      Breadcrumb structures only where their data is visible/accurate.
- [x] Keep supported-language and feature claims aligned with product configuration.
- [x] Ensure FAQ schema exactly mirrors visible FAQ questions/answers.
- [x] Remove comments or documentation that present FAQ schema as guaranteed rich
      results or a special AI-citation mechanism.
- [ ] Validate representative pages with Schema.org and Google's Rich Results Test;
      document expected ineligibility for Loqara FAQ rich results.

**Acceptance:** structured-data parsers report no errors and every claim maps to
current visible/product truth.

### Phase 4 gate

- [x] Standard verification commands pass.
- [x] SEO score remains 100 on public routes.
- [x] Sitemap, robots, canonical, noindex, OG, Twitter, and JSON-LD smoke matrix passes.
- [ ] Search Console sitemap is resubmitted after production deployment. _(owner: deploy is live as of 2026-07-21 — resubmit in GSC now)_

---

## Phase 5 — Content authority, topical structure, and GEO readiness

### Task 5.1: Establish public publisher and author identity

**Files:**

- Create: `app/about/page.tsx`
- Create: `app/authors/eimantas-kudarauskas/page.tsx`
- Create: `app/editorial-policy/page.tsx`
- Create: `app/review-methodology/page.tsx`
- Modify: footer/navigation as appropriate
- Modify: `app/blog/[slug]/page.tsx`
- Modify: `app/sitemap.ts`

- [x] Obtain and fact-check company description, founder role/experience, public
      profiles, editorial process, correction contact, and comparison methodology.
- [x] Add visible links among author bylines, author page, About, policy, and
      methodology pages.
- [x] List authored articles on the author page without loading all cover images.
- [x] Enrich article Person schema with canonical author URL, verified `sameAs`,
      `jobTitle`, and `worksFor` the existing Organization entity.
- [x] Add route-specific metadata, canonicals, social cards, and sitemap entries.
- [x] Add an honest AI-assistance disclosure policy if automation materially
      contributes to publication; do not add a performative disclosure unsupported
      by the actual workflow.

**Acceptance:** a reader and crawler can move from every article byline to verifiable
author/publisher/methodology information.

> Owner reviewed and approved the About/author/editorial-policy/review-methodology
> claims (incl. the AI-assistance disclosure) on 2026-07-21.

### Task 5.2: Add a controlled topic taxonomy and hub pages

**Files:**

- Modify: `lib/blog.ts` and BlogPost frontmatter type
- Modify: all `content/blog/*.md` frontmatter
- Create: `app/blog/topics/[topic]/page.tsx`
- Create: topic data/config module
- Modify: `app/sitemap.ts`, blog navigation/listing
- Test: `tests/unit/blog-topics.test.ts`

- [x] Define 4–6 stable topics based on actual product/audience intent, for example:
      AI customer support, ecommerce AI, platform integrations, voice AI, AI search
      visibility, and vendor comparisons.
- [x] Assign exactly one primary topic to each article and optional curated secondary
      relationships only where needed.
- [x] Give each hub a unique editorial introduction, pillar page, ordered supporting
      guides, and clear audience outcome.
- [x] Avoid generating hubs for arbitrary tags or exact-query variants.
- [x] Link hubs from the blog index and articles; add indexable canonicals/metadata.
- [x] Test that every post has a valid topic and every hub has enough distinct value.

**Acceptance:** every current article belongs to a deliberate topical cluster and no
hub is a thin duplicate listing.

### Task 5.3: Replace recency fallback with curated/topic-related guides

**Files:**

- Modify: `lib/blog.ts`
- Modify frontmatter for 28 posts listed in Appendix A
- Test: `tests/unit/blog-related.test.ts`

- [x] Add explicit `related` slugs to all current posts where editorial selection is
      possible.
- [x] Replace global-recency fallback with same-topic relevance as a defensive
      fallback for future drafts.
- [x] Reject nonexistent/self/duplicate related slugs in the audit/test suite.
- [x] Ensure related links are reciprocal when that helps readers, without forcing
      every relation to be symmetrical.

**Acceptance:** no published article shows unrelated guides merely because they are
newest; all 51 current posts have curated related content.

### Task 5.4: Repair the contextual internal-link graph

**Files:**

- Modify affected `content/blog/*.md`
- Add audit coverage in `scripts/audit-blog-content.mjs`

- [x] Add at least one meaningful inbound contextual link to each of the 12 orphaned
      posts in Appendix A.
- [x] Add a second relevant contextual outbound blog link to
      `ai-fraud-detection-ecommerce` and
      `measure-ai-search-visibility-ecommerce`.
- [x] Use descriptive anchors that accurately describe the destination; do not
      stuff exact-match keywords unnaturally.
- [x] Re-run a graph report and manually review that every link helps the reader's
      next step.

**Acceptance:** zero current posts have no contextual inbound link and all current
posts have at least two contextual outbound internal links or a documented editorial
exception.

### Task 5.5: Source and review the 29 uncited articles

**Files:**

- Modify the 29 posts listed in Appendix A
- Update `updated:` only after a meaningful review/edit

- [x] Review every statistical, legal/regulatory, product-capability, price, vendor,
      and time-sensitive claim.
- [x] Cite the nearest available primary source: official documentation, original
      research, regulations, standards, or first-party vendor pricing/features.
- [x] Remove, qualify, or label claims that cannot be verified.
- [x] Add original Loqara experience, screenshots, examples, or measured evidence
      where available; do not pad with citations to commodity summaries.
- [x] For review/comparison pages, state what was personally tested, what was
      researched, the review date, criteria, and Loqara's commercial relationship.
- [x] Check product-language claims against the current EN/LT support boundary.
- [x] Set a real `updated:` date only when the article has materially changed.

**Acceptance:** the 29-post list is human-reviewed; affected claims have adjacent
support, honest qualification, or removal. A citation count alone is not sufficient.

### Task 5.6: Add first-party evidence assets

> **Deferred 2026-07-21 (owner decision):** the product is too new for customer
> case studies, benchmarks, or Search Console demand data. Revisit once real
> usage exists; do not fabricate evidence in the meantime.

**Files:**

- Modify selected flagship posts and `public/blog/` assets
- Potentially create a case-study route/template after real customer approval

- [ ] Select 5–8 highest-value pillar/commercial pages using Search Console demand,
      business relevance, and current quality—not word count alone.
- [ ] Add original product screenshots, test transcripts, workflow diagrams,
      benchmark methodology/results, or verified case-study evidence.
- [ ] Use semantic figures, descriptive alt text, dimensions, lazy loading, and
      captions that explain what the evidence demonstrates.
- [ ] Obtain permission before naming a customer or publishing their metrics.
- [ ] Avoid generic decorative AI images as a substitute for proof.

**Acceptance:** selected flagship pages contain unique evidence that cannot be
recreated by merely summarizing public web pages.

### Task 5.7: Add an automated blog-quality audit

**Files:**

- Create: `scripts/audit-blog-content.mjs`
- Modify: `package.json` (`audit:blog`)
- Add fixture tests if parsing logic becomes nontrivial

- [x] Report duplicate slugs/titles/descriptions, invalid dates, missing images,
      broken internal links, broken related slugs, missing topics, low outbound
      internal links, zero inbound links, and missing required template sections.
- [x] Distinguish errors (objective broken state) from warnings (editorial review).
- [x] Fail the command only for objective errors; print actionable slugs for warnings.
- [x] Run the audit in the normal pre-release checklist and document it in
      `docs/seo-content-loop.md`.
- [x] Keep human source-support and helpfulness review explicit; do not claim the
      script can score E-E-A-T.

**Acceptance:** `npm run audit:blog` is deterministic, catches a deliberately broken
fixture, and passes the repaired content inventory with no errors.

### Task 5.8: Establish search/GEO measurement and update workflow

**External systems:** Google Search Console, Bing Webmaster Tools, analytics

- [ ] Verify domain ownership and sitemap status in Search Console and Bing.
- [ ] Export current indexed/not-indexed URLs and resolve genuine exclusions.
- [ ] Record query/page baselines: impressions, clicks, CTR, average position, and
      the current Generative AI performance report where available.
- [ ] Define a monthly prompt/query sample for brand/product-category visibility in
      AI search; record citations manually or through permitted provider tooling.
- [ ] Avoid automated scraping of Google results in violation of its terms.
- [ ] Update `docs/seo-content-loop.md` to prioritize refreshes, consolidation, and
      evidence work before net-new volume.
- [ ] Schedule 7-day and 28-day post-release checkpoints.

**Acceptance:** future decisions can be tied to Search Console/analytics outcomes,
not Lighthouse or article count alone.

### Phase 5 gate

- [x] Standard verification commands and `npm run audit:blog` pass.
- [x] Human editorial review approves identity/methodology claims and all 29 source
      remediation items.
- [x] Topic hubs and every article are reachable through crawlable internal links.
- [ ] Search Console/Bing baselines and monitoring dates are recorded.

---

## Phase 6 — Secondary delivery, security, and crawler compatibility

### Task 6.1: Delay analytics while preserving measurement

**Files:**

- Modify: `components/analytics/GoogleAnalytics.tsx`
- Add/update analytics tests or production debug checklist

- [ ] Decide with the owner whether GA is consent-gated or simply `lazyOnload`.
- [ ] Ensure initial GA download does not compete with hero rendering.
- [ ] Verify first page view, client route changes, CTA opens, signup submissions,
      and other conversion events after the loading change.
- [ ] Continue excluding `/embed/*` and nonproduction environments.
- [ ] Compare Lighthouse unused-JS and network results.

**Acceptance:** analytics remains accurate for agreed events and is absent from the
critical rendering path.

### Task 6.2: Add conservative public security headers

**Files:**

- Modify: `next.config.*` or the project's chosen header boundary
- Update: `docs/SECURITY.md`

- [ ] Add `X-Content-Type-Options: nosniff`, an appropriate Referrer Policy, and a
      minimal Permissions Policy after checking voice/camera/microphone needs.
- [ ] Disable `x-powered-by` if supported by this Next build.
- [ ] Draft CSP for all real integrations and deploy it as Report-Only first.
- [ ] Exercise homepage, auth, app, widget/embed, voice, Stripe, Supabase storage,
      analytics, and owner presentation flows.
- [ ] Promote CSP to enforcement only when violations are understood; do not use
      broad `*`/unsafe allowances merely to silence reports.

**Acceptance:** headers are present on production without breaking product flows;
CSP enforcement, if enabled, has a reviewed report-only record.

### Task 6.3: Submit only changed URLs to IndexNow

**Files:**

- Modify: `scripts/indexnow-ping.mjs`
- Modify build/release integration if necessary
- Test: add script unit fixtures

- [ ] Compare the deployed commit/range or a persisted content manifest to identify
      changed public URLs.
- [ ] Submit added/meaningfully updated URLs; submit deleted URLs when applicable.
- [ ] Do not submit all 55+ URLs after every unchanged production build.
- [ ] Preserve `--force` for intentional full resubmission.
- [ ] Log submitted URLs and API result without failing the main build on transient
      IndexNow errors, matching current deployment resilience.

**Acceptance:** an unchanged build submits zero URLs; editing one article submits its
URL and any genuinely changed hub/index URL.

### Task 6.4: Make `llms.txt` valid for consumers that expect Markdown links

**Files:**

- Modify: `public/llms.txt`
- Modify: `docs/wiki/blog-and-seo.md`

- [ ] Convert bare key-page and guide URLs to descriptive Markdown links.
- [ ] Keep the file curated; remove stale/duplicative entries rather than listing
      every URL automatically.
- [ ] Add a note to internal documentation that Google ignores `llms.txt` for
      rankings and generative Search eligibility.
- [ ] Verify pricing, supported languages, channels, and capability statements
      against product source-of-truth files.

**Acceptance:** the agentic audit recognizes links and internal documentation does
not elevate the file above crawlable HTML.

### Task 6.5: Reduce remaining public-route render-blocking CSS

**Files:**

- Review: `app/globals.css`, public route layouts, and generated route CSS chunks
- Modify only after measuring: route-scoped styles/layout boundaries

- [ ] Attribute the two homepage CSS chunks (currently ~35 KB combined) to their
      source layers and separate app/widget-only rules from public critical CSS.
- [ ] Keep hero typography/layout styles available in the first render; do not
      trade the current server-visible LCP text for a flash or hydration branch.
- [ ] Remove dead public selectors and route-scope non-public style bundles where
      Next's layout boundaries allow it.
- [ ] Re-run three mobile audits; target Lighthouse's current estimated 410 ms
      render-blocking saving without adding inline-style duplication.

**Acceptance:** public CSS transfer/render blocking is measurably lower, observed
LCP remains stable and visible, and no app/widget route loses required styles.

### Phase 6 gate

- [ ] Standard verification commands pass.
- [ ] Best Practices remains 100 in an extension-free run.
- [ ] Analytics conversions, headers, CSP policy, IndexNow delta behavior, and
      `llms.txt` links are verified in production.

---

## Phase 7 — Accessibility remediation (final phase)

### Task 7.1: Establish accessible brand color tokens

**Files:**

- Modify: `app/globals.css`
- Review all uses of `bg-primary text-white` and `text-primary` on light surfaces
- Add visual snapshots if available

- [ ] Measure current token combinations rather than changing isolated Lighthouse
      nodes one by one.
- [ ] Define separate tokens where needed: decorative brand orange, accessible
      orange text/link, accessible CTA background, hover, focus, and foreground.
- [ ] Ensure normal text contrast >= 4.5:1, large text >= 3:1, and UI component
      boundaries/states >= 3:1 where applicable.
- [ ] Verify homepage, blog, dialogs, app shell, and embedded widget before changing
      a global token that could affect the product.
- [ ] Preserve brand character while making contrast a hard requirement.

**Acceptance:** Lighthouse reports no color-contrast failures and manual token pairs
meet WCAG AA.

### Task 7.2: Remove low-opacity body-copy reveal

**Files:**

- Modify: `components/landing/ScrollRevealText.tsx`
- Review: feature section styles

- [ ] Replace the `[0.15, 1]` body-word opacity behavior with fully readable base
      text or a compliant color-to-color emphasis effect.
- [ ] Ensure the complete sentence is readable before its scroll animation.
- [ ] Under reduced motion, render a stable fully readable state.
- [ ] Re-test full-page screenshots and feature-section contrast.

**Acceptance:** all feature prose is readable at every scroll position and produces
no contrast violations.

### Task 7.3: Make inline links identifiable without color alone

**Files:**

- Modify: `components/landing/Faq.tsx`
- Review: `.article` inline links and public legal/about/policy pages

- [ ] Underline inline links by default or provide another persistent non-color cue.
- [ ] Preserve clear hover and visible keyboard-focus states.
- [ ] Distinguish navigation/button links from links inside prose so the treatment
      remains intentional.

**Acceptance:** Lighthouse link-in-text-block audit passes and inline links remain
obvious in grayscale.

### Task 7.4: Increase carousel and small-control hit targets

**Files:**

- Modify: `components/ui/card-fan-carousel.tsx`
- Review all homepage icon-only/small controls

- [ ] Keep the visual 8 px dot if desired, but place it inside at least a 24 px
      target, preferably 44 px where layout permits.
- [ ] Preserve accurate `aria-label` and `aria-current` state.
- [ ] Add visible focus styles and support Enter/Space activation.
- [ ] Verify swipe, arrow, dot, and keyboard behavior together.

**Acceptance:** Lighthouse target-size audit passes; controls are keyboard operable
and do not overlap adjacent targets.

### Task 7.5: Complete keyboard, screen-reader, and reduced-motion QA

**Routes:** `/`, `/blog`, one article, signup dialog, widget launcher

- [ ] Navigate every interactive element using only keyboard; verify logical order,
      visible focus, dialog focus trap/return, and no keyboard trap.
- [ ] Verify heading hierarchy, landmarks, link names, image alternatives, form
      labels/errors, carousel state, and dialog announcements with a screen reader.
- [ ] Verify reduced motion disables decorative hero video, marquee/ping, smooth
      scrolling, flicker, and reveal motion where appropriate.
- [ ] Verify 200% zoom and 320 CSS px width without lost content or horizontal
      scrolling except intentionally scrollable tables.
- [ ] Run axe on homepage, blog index, and one representative article.
- [ ] Add Playwright/axe regression checks if a compatible axe dependency is
      approved; otherwise document the repeatable manual + Lighthouse procedure.

**Acceptance:** Lighthouse Accessibility 100 on homepage/blog, zero serious or
critical axe violations, and the manual checklist passes.

### Phase 7 and program gate

- [ ] Standard verification commands pass.
- [ ] Final three-run Lighthouse median meets homepage and blog budgets.
- [ ] Public SEO/noindex/metadata/sitemap smoke matrix passes after all UI changes.
- [ ] Accessibility targets pass.
- [ ] Production conversion events and widget behavior pass.
- [ ] Record final before/after metrics, deployment SHA, Search Console annotation,
      and 7-day/28-day follow-up dates.
- [ ] Update the wiki with durable implementation decisions and close the plan.

---

## Appendix A — Current editorial remediation inventory

This inventory was generated from the repository on 2026-07-20. Re-run the blog
audit before execution because content may change.

### 29 posts with no external Markdown citations

- [x] `add-ai-agent-to-woocommerce`
- [x] `add-voice-ai-to-online-store`
- [x] `ai-chatbot-for-online-store`
- [x] `ai-chatbot-gdpr-data-privacy`
- [x] `ai-chatbot-human-handoff` — _editorial exception (2026-07-21): deliberately citation-free (operational/conceptual advice, no statistics); audit warning expected_
- [x] `ai-customer-service-small-stores`
- [x] `ai-product-recommendation-chatbot` — _editorial exception (2026-07-21): deliberately citation-free; audit warning suppressed via CITATION_EXCEPTIONS_
- [x] `best-ai-chatbot-for-ecommerce`
- [x] `best-ai-chatbot-for-shopify`
- [x] `best-ai-chatbot-for-woocommerce`
- [x] `best-chatbot-platforms`
- [x] `black-friday-ai-agent`
- [x] `capture-leads-with-conversational-chat` — _editorial exception (2026-07-21): deliberately citation-free (operational/conceptual advice, no statistics); audit warning expected_
- [x] `chatbot-roi-metrics-that-matter` — _editorial exception (2026-07-21): deliberately citation-free (operational/conceptual advice, no statistics); audit warning expected_
- [x] `chatgpt-for-customer-service`
- [x] `conversational-ai-vs-chatbot` — _editorial exception (2026-07-21): concept explainer with no statistics or vendor numbers; deliberately citation-free, audit warning expected_
- [x] `gorgias-alternatives-for-ecommerce`
- [x] `how-much-does-ai-chatbot-cost`
- [x] `how-to-choose-ai-support-agent`
- [x] `intercom-alternatives-for-ecommerce`
- [x] `multilingual-ai-customer-support`
- [x] `new-ai-chatbots-2026`
- [x] `recover-abandoned-carts-ai-chatbot`
- [x] `reduce-support-tickets-with-ai` — _editorial exception (2026-07-21): deliberately citation-free; audit warning suppressed via CITATION_EXCEPTIONS_
- [x] `tidio-alternatives-for-ecommerce`
- [x] `tidio-vs-zendesk`
- [x] `voice-ai-for-ecommerce-support` — _editorial exception (2026-07-21): deliberately citation-free; audit warning suppressed via CITATION_EXCEPTIONS_
- [x] `where-is-my-order-ai` — _editorial exception (2026-07-21): deliberately citation-free; audit warning suppressed via CITATION_EXCEPTIONS_
- [x] `zendesk-alternatives-for-ecommerce`

### 28 posts without explicit `related` frontmatter

- [ ] `add-ai-agent-to-woocommerce`
- [ ] `add-voice-ai-to-online-store`
- [ ] `ai-chatbot-for-online-store`
- [ ] `ai-chatbot-human-handoff`
- [ ] `ai-customer-service-small-stores`
- [ ] `ai-customer-service-statistics`
- [ ] `ai-voice-agents-explained`
- [ ] `best-ai-chatbot-for-ecommerce`
- [ ] `best-ai-chatbot-for-shopify`
- [ ] `best-ai-chatbot-for-woocommerce`
- [ ] `best-chatbot-platforms`
- [ ] `black-friday-ai-agent`
- [ ] `capture-leads-with-conversational-chat`
- [ ] `chatbot-roi-metrics-that-matter`
- [ ] `chatgpt-for-customer-service`
- [ ] `conversational-ai-vs-chatbot`
- [ ] `gorgias-alternatives-for-ecommerce`
- [ ] `how-much-does-ai-chatbot-cost`
- [ ] `how-to-choose-ai-support-agent`
- [ ] `intercom-alternatives-for-ecommerce`
- [ ] `new-ai-chatbots-2026`
- [ ] `reduce-support-tickets-with-ai`
- [ ] `tidio-alternatives-for-ecommerce`
- [ ] `tidio-vs-zendesk`
- [ ] `voice-ai-for-ecommerce-support`
- [ ] `where-is-my-order-ai`
- [ ] `zendesk-ai-review`
- [ ] `zendesk-alternatives-for-ecommerce`

### 12 posts with no contextual inbound article link

- [ ] `add-voice-ai-to-online-store`
- [ ] `ai-chatbot-for-magento`
- [ ] `ai-customer-service-small-stores`
- [ ] `ai-customer-service-statistics`
- [ ] `ai-for-ecommerce`
- [ ] `automate-returns-with-ai-chatbot`
- [ ] `best-chatbot-platforms`
- [ ] `chatgpt-for-customer-service`
- [ ] `new-ai-chatbots-2026`
- [ ] `prevent-ai-chatbot-hallucinations`
- [ ] `tidio-vs-zendesk`
- [ ] `zendesk-ai-review`

### Posts with fewer than two contextual outbound article links

- [ ] `ai-fraud-detection-ecommerce` — currently 1
- [ ] `measure-ai-search-visibility-ecommerce` — currently 1

## Appendix B — Production smoke matrix

| Route | Expected status | Index state | Canonical | Main verification |
|---|---:|---|---|---|
| `/` | 200 | index | `/` | hero text visible before hydration; one video max |
| `/blog` | 200 | index | `/blog` | 12 posts; crawlable pagination |
| `/blog/page/2` | 200 | index | self | unique metadata; previous/next links |
| `/blog/<slug>` | 200 | index | self | article/author/schema/date output |
| `/about` | 200 | index | self | Organization and publisher identity |
| `/authors/eimantas-kudarauskas` | 200 | index | self | Person identity and authored content |
| `/editorial-policy` | 200 | index | self | editorial/corrections disclosure |
| `/review-methodology` | 200 | index | self | comparison method/disclosure |
| `/privacy` | 200 | index | self | factual review date and own social metadata |
| `/terms` | 200 | index | self | factual review date and own social metadata |
| `/login` | 200 | noindex | n/a | robots meta visible |
| `/app` unauthenticated | redirect/login | noindex destination | n/a | no private content |
| `/owner` unauthenticated | redirect/login | noindex destination | n/a | no private content |
| `/embed/<valid-key>` | 200 | noindex | n/a | widget works; noindex visible |
| `/present/<id>` unauthorized | redirect/denied | noindex | n/a | owner-only; no search result eligibility |
| `/robots.txt` | 200 | n/a | n/a | deliberate rules + sitemap |
| `/sitemap.xml` | 200 | n/a | n/a | unique public URLs and real dates |
| `/llms.txt` | 200 | secondary | n/a | accurate facts + Markdown links |
