# SEO/GEO playbook

The required standard for public pages and blog work. SEO earns search visibility;
GEO makes the same crawlable evidence easy for answer engines to understand and
cite. There is no separate “AI ranking” shortcut: both depend on useful content,
clear entities and claims, primary evidence, crawlability, and good delivery.

Use [blog-and-seo](blog-and-seo.md) for implementation mechanics. Use
`docs/seo-content-loop.md` for the GSC workflow, but treat this page as the quality
gate. The full remediation decisions and open work live in the linked
[specification](../superpowers/specs/2026-07-20-seo-geo-remediation-design.md) and
[execution plan](../superpowers/plans/2026-07-20-seo-geo-remediation.md).

## Non-negotiable principles

- **Help a defined reader complete one job.** One page owns one search intent.
  Audit existing posts before creating another URL; refresh, consolidate, or
  differentiate when the intended query overlaps an existing page.
- **Publish evidence, not search-engine-shaped filler.** Verify factual,
  statistical, legal, price, vendor-feature, and time-sensitive claims against
  current primary sources. Put citations beside the supported claim. Add Loqara
  screenshots, tests, examples, methodology, and limitations where available.
- **Be honest about identity and experience.** Use a real author, role, publisher,
  review method, and commercial relationship. Never invent credentials, customers,
  tests, dates, or “hands-on” experience.
- **The visible page is the source of truth.** Structured data must describe
  content a visitor can see. Do not hide keyword copy, create doorway/tag/query
  permutations, or use schema to claim facts absent from the page.
- **Server HTML comes first.** Headings, answers, body copy, article links,
  navigation, and primary CTAs must remain discoverable and useful without
  JavaScript. Animation may enhance them but must never reveal or unlock them.
- **Performance is relevance infrastructure.** Do not trade a useful page for a
  Lighthouse trick, but keep media, fonts, animation, third parties, and speculative
  prefetch out of the critical path.

## Before creating a post

1. Start with measured demand: GSC queries/pages, customer questions, sales/support
   evidence, or a documented emerging topic—not a request to “publish more.”
2. Record the primary query, search intent, audience, decision/job, and what this
   page will add that existing results and Loqara posts do not.
3. Search `content/blog/` for overlapping titles, headings, and claims. Assign one
   owner page per intent and plan links to complementary pages; the established
   clusters are recorded in [blog-and-seo](blog-and-seo.md).
4. Gather primary sources before drafting. Prefer official documentation,
   regulations/standards, original research, and first-party vendor pages. Use
   secondary sources only when they add reporting or analysis the primary source
   cannot provide.
5. Decide what first-party value the page contributes: an observed workflow,
   product screenshot, comparison method, test result, worked example, decision
   framework, or explicit expert judgment.

## Required article shape

- Frontmatter must have an accurate `title`, unique `description`, original
  publication `date`, real `author`/`authorRole`, and an existing `image`. Add
  explicit `related` slugs; otherwise the current fallback is merely recent posts
  (`lib/blog.ts:203-225`, `lib/blog.ts:278-296`).
- Add `updated` only after a meaningful review or material edit. It becomes
  `dateModified`; changing it to manufacture freshness is forbidden
  (`lib/blog.ts:10-30`, `app/blog/[slug]/page.tsx:51-68`).
- Open with the reader’s situation, then a visible
  `<blockquote class="quick-answer">` giving a self-contained 40–60 word answer.
  This improves comprehension and extractability; it does **not** guarantee an AI
  citation or search feature.
- Use a single descriptive H1 (provided by the title) and a logical H2/H3 hierarchy.
  Prefer question headings when they match real reader language, not mechanically
  on every section. The renderer creates stable H2/H3 anchors
  (`lib/blog.ts:105-124`).
- Explain the answer with concrete steps, trade-offs, prerequisites, exceptions,
  boundaries, and “when not to” guidance. Define products/entities unambiguously
  and attach dates or scope to claims that can change.
- Add at least two useful contextual links to complementary Loqara articles and
  ensure a relevant existing page links back. Use descriptive natural anchors;
  do not force exact-match phrases.
- Add a `## Frequently asked questions` section with genuine follow-up questions
  only when it helps the reader. The parser mirrors visible H3 Q&A into FAQ schema
  (`lib/blog.ts:136-179`, `app/blog/[slug]/page.tsx:77-90`). FAQ schema is machine-
  readable context—not a ranking factor, citation guarantee, or guaranteed Google
  rich result.
- End with a proportionate next step. Commercial pages must state what Loqara can
  and cannot do; never imply unsupported integrations or autonomous actions.

## Evidence and GEO quality

- Make each important claim quotable without stripping away its subject, scope,
  date, units, or caveat. Tables, definitions, short answer blocks, and labelled
  processes should remain meaningful outside the surrounding paragraph.
- Cite the closest primary source and distinguish sourced fact from Loqara’s
  inference or recommendation. Do not cite a source that only mentions the topic.
- For comparisons/reviews, state the criteria, review date, what was personally
  tested, what was desk research, limitations, and Loqara’s commercial interest.
- Prefer original evidence over generic decorative AI imagery. AI-assisted prose
  and visuals require human factual and editorial review; they are not experience.
- Keep publisher/author identity, policies, and methodology internally consistent.
  Phase 5 of the remediation plan owns the still-missing identity/methodology pages;
  do not fabricate their contents in article schema meanwhile.
- `llms.txt` is a curated orientation file, not an indexing/ranking control. Google
  eligibility comes from crawlable pages and normal index controls; never publish a
  URL only in `llms.txt`.

## Images and page delivery

- Generate text-free WebP covers under `public/blog/`; diagrams must add explanatory
  value rather than restate the hero. Give every informative image descriptive alt
  text, dimensions/aspect ratio, and a caption when interpretation is not obvious.
- Keep archive delivery invariants: 12 posts per page (`lib/blog.ts:46-53`), only
  the first visible cover eager/high-priority, later covers lazy, accurate responsive
  `sizes`, no repeated card headshots, and no archive-link prefetch storm
  (`components/blog/BlogIndexPage.tsx:16-54`).
- Article heroes use responsive `next/image`; in-body explanatory figures stay
  lazy with explicit dimensions (`app/blog/[slug]/page.tsx:145-158`).
- Do not attach canvas/RAF animation, hydration-gated opacity, large client bundles,
  or unrelated font/media preloads to the article title or archive header.
- Current blog release budget: mobile Performance >= 90, lab LCP <= 3.5 s,
  transfer <= 1.5 MB, no more than 16 initial image requests, and CLS 0. The Phase 3
  checkpoint is 91 / 3.46 s / 0.41 MB / 13 images / 0 CLS.

## Indexing and URL rules

- Preserve published slugs unless a reviewed redirect is part of the change. Every
  indexable page needs a unique title/description, self-canonical, 200 response,
  useful server content, and crawlable internal links.
- `/blog` owns archive page 1; `/blog/page/2..N` are canonical archives. Page 1,
  malformed, and beyond-last numbered routes must hard-404
  (`app/blog/page/[page]/page.tsx:14-51`).
- The sitemap lists canonical articles, not archive pagination. Article URLs are
  generated automatically (`app/sitemap.ts:5-20`); keep `llms.txt` selective.
- Private app, owner, API, embed, and auth surfaces remain excluded from crawling
  (`app/robots.ts:4-19`) and must also enforce noindex/authorization at their route
  boundary. Robots disallow alone is not privacy.
- Do not trust the current sitemap freshness as final: Phase 4 still owns factual
  `lastModified`, `updated ?? date`, stable static-page dates, and uniqueness.

## Release gate

Before publishing or materially refreshing content:

- Manually verify every external claim, citation destination, internal link,
  related slug, image path/alt, capability statement, author detail, and date.
- Review the rendered page at mobile and desktop sizes; check headings, tables,
  overflow, image crop, and that the primary answer is visible without JavaScript.
- Run `npm run typecheck`, `npm test`, `npm run lint`, and `npm run build`. Use
  `npm test`, never plain `npx vitest` ([conventions](conventions.md)).
- Run the focused blog pagination/SEO browser tests and a clean mobile Lighthouse
  production-build audit when templates, delivery, metadata, or shared styles change.
- After deployment, smoke the canonical/status/schema/sitemap output, then monitor
  GSC page/query/index coverage and conversions at 7 and 28 days. Measure GEO with
  a stable manual prompt/query sample and recorded citations; do not scrape Google.
- Refresh, consolidate, or improve evidence when results are weak. Do not respond
  to poor performance by mass-producing near-duplicate articles.

Accessibility remediation is scheduled last in the current program, but new work
must not add accessibility debt: keep semantic headings/landmarks, meaningful alt,
identifiable links, keyboard access, readable contrast, and reduced-motion-safe
enhancements from the start.

_Last verified: 2026-07-21 (cdfbd62)._
