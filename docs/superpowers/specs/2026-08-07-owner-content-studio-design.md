# Owner Content Studio — design

Date: 2026-08-07 · Status: proposed for owner review

## Problem

Loqara already has a strong Git-backed public blog, an editorial quality gate,
image-generation tooling, sitemap/metadata support, IndexNow, and a documented
Search Console content loop. What it lacks is one owner-facing workspace that
turns a measured opportunity into a researched, reviewable, publishable article.

Today that work is spread across Search Console exports, prompts, local Markdown
files, image scripts, terminal audits, Git, and GitHub. Soro packages a similar
workflow, but its broad CMS integrations and automatic daily publishing are not
the parts Loqara needs most. Loqara needs editorial control, source traceability,
and a safe bridge into the repository.

## Goal

Add an owner-only **Content Studio** that supports this lifecycle:

1. Capture a manual topic or import a Search Console opportunity.
2. Research the topic and retain visible, clickable sources.
3. Generate an article brief, draft, metadata, links, and image direction.
4. Edit the Markdown while previewing the real Loqara article rendering.
5. Generate and approve a WebP cover image.
6. Run deterministic blog-quality checks.
7. Create a GitHub draft pull request containing the Markdown and assets.
8. Track the pull request and live article from the Owner portal.

The MVP succeeds when the owner can go from a target query to a reviewable draft
PR without copying content between tools, while no AI output can reach production
without an explicit human action.

## Scope decisions

### Loqara blog first

The first version publishes only to Loqara's own `/blog`. It is not a
multi-tenant feature for client sites and it is not a generic CMS connector.
This keeps the output contract aligned with the existing Markdown renderer,
topic vocabulary, visual system, and SEO/GEO playbook.

### Human approval is mandatory

There is no daily auto-publish switch in the MVP. AI-generated claims can be
inaccurate or stale, and the repository explicitly treats source verification
as a human editorial gate. Generation creates a draft; publication creates a
draft PR. Merging the PR remains a separate owner action.

### Git remains the public source of truth

The deployed Next.js application cannot persist writes to `content/blog/` or
`public/blog/`; a serverless filesystem is temporary. Draft state therefore
lives in Supabase and draft images in a private Storage bucket. Publishing uses
the GitHub API to create a branch, commit the final files, and open a draft PR.
After merge, the existing Vercel integration builds and deploys the article.

### Research must expose its sources

The research step uses a provider boundary. The first provider can use the
OpenAI Responses API with hosted `web_search`, which returns URL citations and
supports background execution for longer work. Every source used by a draft is
stored and shown in the UI. Generated prose must never turn an unsupported model
claim into an apparently sourced fact.

### Structured intermediate output, Markdown final output

Research and brief generation use schema-validated structured output. The final
article remains Markdown because that is the public blog's established content
format. Generated frontmatter is represented as typed fields in the database and
serialized only at publication time; the owner does not edit fragile YAML by hand.

### Existing rules are reused, not duplicated

The studio must reuse the topic registry, Markdown renderer, internal-link rules,
FAQ extraction, image conventions, and audit rules. Shared rules should be
refactored from scripts into importable server-safe modules where necessary,
with the CLI continuing to call the same source of truth.

## Explicit non-goals for the MVP

- Automatic publication or automatic merging to `main`.
- Posting to LinkedIn, Instagram, Facebook, Medium, or email.
- Publishing to client WordPress, Shopify, Wix, or other CMS accounts.
- Buying backlinks, submitting to directories, or manipulating rankings.
- Inventing keyword volume or difficulty without a real data provider.
- Replacing Search Console, analytics, or the existing public blog renderer.
- Letting the model silently choose and publish a target query.
- Generating multiple near-duplicate articles per day.

## Owner experience

### Navigation

Add a top-level **Content Studio** destination at `/owner/content`, near the
existing LinkedIn destination. Use a Lucide document/sparkles icon and preserve
the Owner sidebar's expanded/collapsed behavior, focus styles, and 44px targets.

### `/owner/content` — pipeline overview

The overview is a content-first operational dashboard, visually consistent with
the existing Owner portal rather than introducing a new dark theme or font.

Header:

- Title: **Content Studio**.
- Short explanation: research, draft, review, and publish Loqara articles.
- Primary action: **New article**.
- Secondary action: **Import GSC CSV**.

Summary row:

- Opportunities waiting.
- Drafts in progress.
- Ready for review.
- Published this month.

Primary tabs:

- **Pipeline** — active work, grouped by stage with search and filters.
- **Opportunities** — manual and GSC-derived query opportunities, ranked with
  transparent inputs rather than a mysterious SEO score.
- **Published** — live URL, publication date, target query, and PR link.

Pipeline items show title/working title, target query, stage, last activity,
source count, image state, audit state, and any recoverable error. Cards/rows are
fully keyboard-operable; drag-and-drop is not required to advance an article.

### `/owner/content/new` — progressive intake

Keep the first screen small:

- Target query or topic (required).
- Reader/job-to-be-done (required).
- Content type: new article or refresh existing article.
- Existing article selector when refresh is chosen.
- Optional notes and must-use sources.

Advanced controls such as language, topic, commercial intent, excluded claims,
and research depth live under progressive disclosure. Creating the item saves it
as an idea; **Research topic** is the single primary action.

### `/owner/content/[id]` — article workspace

Desktop uses a stable two-area workspace:

- Main area: Markdown editor and rendered preview tabs, with a side-by-side mode
  available on wide screens.
- Context rail: research sources, brief, SEO/GEO checklist, cover image, and
  publication status.

Mobile/tablet collapse these areas into tabs; there must be no nested horizontal
scroll. The article preview uses the real `.article` rendering styles and keeps
long-form lines within a readable measure.

Workspace header:

- Back to pipeline.
- Editable title and lifecycle badge.
- Autosave state (`Saving…`, `Saved`, actionable error).
- Stage-specific primary action: Research, Generate draft, Mark ready, or Create PR.
- Regenerate and destructive actions live in an overflow menu and require clear
  confirmation when they would overwrite edited work.

Research panel:

- Source title, publisher/domain, URL, retrieval date, and which draft claims use it.
- Visible verification checkbox/state owned by the human reviewer.
- Warnings for citations that are present in prose but absent from the source list.
- Clickable citations whenever web-search-derived content is displayed.

Image panel:

- Reserved 3:2 preview area to avoid layout shift.
- Prompt/direction, alt text, generation state, and regenerate/replace controls.
- Draft images use private signed URLs; the final approved WebP is committed to
  `public/blog/<slug>.webp` by the publisher.

Quality panel:

- Errors and warnings separated visually and semantically.
- Errors block PR creation; warnings require review but can be explicitly accepted.
- Checks include required frontmatter, real ISO dates, topic vocabulary, unique
  title/description/slug, image presence, internal-link validity, related slugs,
  quick answer, citations, and link-graph warnings.

Long-running generation:

- Starting a run immediately creates a persisted run record.
- The UI shows explicit phases such as Researching, Building brief, Drafting,
  Checking links, and Preparing image direction.
- The owner can leave and return; a frozen browser screen is never the job state.
- Failures name the failed phase and provide Retry from phase.

## Lifecycle

`idea -> researching -> brief -> drafting -> review -> ready -> pr_open -> published`

Additional terminal/recovery states:

- `failed`: the current operation failed; the content item remains editable and retryable.
- `archived`: intentionally removed from the active pipeline without deletion.

Lifecycle changes are server-validated. For example, `ready` requires a draft,
approved cover image, and no blocking audit errors; `pr_open` requires a recorded
GitHub PR; `published` requires the PR to be merged and the live URL to resolve.

## Data model

### `content_items`

- `id uuid primary key`
- `kind text` — initially `article`; leaves room for future repurposed content.
- `mode text` — `new` or `refresh`.
- `status text` — lifecycle above.
- `target_query text`
- `reader_job text`
- `search_intent text`
- `working_title text`
- `slug text`
- `description text`
- `topic text`
- `author text`
- `language text default 'en'`
- `brief jsonb`
- `markdown text`
- `related_slugs text[]`
- `refresh_slug text null`
- `cover_storage_path text null`
- `cover_prompt text null`
- `cover_alt text null`
- `cover_approved_at timestamptz null`
- `audit_result jsonb`
- `accepted_warning_codes text[]`
- `github_branch text null`
- `github_pr_number integer null`
- `github_pr_url text null`
- `published_url text null`
- `published_at timestamptz null`
- `created_by uuid`
- `created_at`, `updated_at`

Add checks for the finite status/mode/kind values and indexes on
`(status, updated_at desc)` and `published_at`.

### `content_sources`

- `id uuid primary key`
- `content_item_id uuid references content_items on delete cascade`
- `url text`
- `title text`
- `publisher text`
- `published_on date null`
- `retrieved_at timestamptz`
- `citation_note text`
- `used_in_sections text[]`
- `verified_at timestamptz null`
- `verified_by uuid null`

Deduplicate by `(content_item_id, url)`.

### `content_generation_runs`

- `id uuid primary key`
- `content_item_id uuid references content_items on delete cascade`
- `operation text` — `research`, `brief`, `draft`, `image`, `audit`, `publish`.
- `status text` — `queued`, `in_progress`, `completed`, `failed`, `cancelled`.
- `phase text`
- `provider text`
- `provider_job_id text null`
- `attempt integer`
- `input_snapshot jsonb`
- `usage jsonb`
- `error_code text null`
- `error_message text null`
- `started_at`, `finished_at`, `created_at`

Only one active run per `(content_item_id, operation)` should be allowed. Use an
idempotency key or partial unique index so double-clicks cannot start duplicate
research/image charges.

### `content_gsc_imports` (phase after the core draft flow)

Store import metadata and normalized query/page rows, not the original owner file
forever. MVP GSC support starts with CSV because it requires no Google OAuth
credentials. Direct Search Console API authorization can replace or supplement it
later without changing the opportunity UI.

### Storage

Create a private `content-studio` bucket. Paths are owner-independent because this
is an owner-only Loqara feature:

`articles/<content-item-id>/cover-<revision>.webp`

Serve previews with short-lived signed URLs. Never point a public article at this
bucket; publication copies the approved bytes into the repository.

## Generation architecture

### Provider boundary

`lib/content-studio/providers/` owns narrow interfaces:

- `researchTopic(input) -> provider job id or structured research`
- `getResearch(jobId) -> status + structured research`
- `generateDraft(input) -> typed draft package`
- `generateCover(input) -> image bytes`

The rest of the application works with Loqara-owned schemas, not provider response
objects. Provider/model identifiers are configuration, not lifecycle logic.

### Research

The first implementation can use the OpenAI Responses API with `web_search`.
Longer searches run in background mode; `content_generation_runs.provider_job_id`
stores the response ID, and a status endpoint retrieves/persists the result.
Request the complete source list and retain the citation annotations.

The research prompt receives:

- Target query, reader job, and intent.
- Existing post inventory (slug, title, description, topic, headings).
- Loqara capability boundaries from the SEO/GEO playbook.
- Owner-provided must-use or excluded sources.
- Instructions to prefer primary/current sources and identify uncertainty.

Research output is structured: recommended intent owner, overlap risks, outline,
claims/evidence, primary sources, internal-link candidates, exclusions, and an
image concept. Research never directly modifies article Markdown.

### Draft generation

The draft request uses the approved brief, verified sources, selected existing
articles, and the article format contract. It returns a schema-validated package:

- Title, description, slug, topic, date, related slugs.
- Markdown body.
- Source-to-section mapping.
- Cover prompt and alt text.
- Warnings/uncertainties that require human review.

The server validates every slug/topic/link and rejects references to nonexistent
internal pages. A source URL in Markdown must match a stored source or be added as
an explicitly unverified source warning.

### Image generation

Reuse the current article art direction: text-free 1200×800 WebP, meaningful alt
text, explicit dimensions, and an optional distinct explanatory figure only when
it materially helps. Runtime generation should use a server-only image provider
and normalize output with `sharp`; if `sharp` is imported at runtime it must move
from `devDependencies` to `dependencies`.

### Audit

Refactor deterministic checks from `scripts/audit-blog-content.mjs` into shared
pure functions. The CLI remains the pre-release repository audit, while the studio
runs equivalent checks against a virtual post plus the current repository inventory.
The PR build remains the final authority because it checks the complete proposed tree.

## Publishing architecture

### Why a pull request

`main` auto-deploys to production and there is no staging gate. A draft PR gives:

- A durable Git record.
- Vercel preview/build validation.
- A readable diff of generated prose.
- An explicit final human merge action.
- Safe rollback through ordinary Git history.

### Publish operation

1. Re-run the studio audit and refuse on errors.
2. Reconfirm the target slug does not exist on current `main` (unless refresh mode).
3. Serialize frontmatter + Markdown using a deterministic serializer.
4. Read the approved WebP bytes from private Storage.
5. Create `content/<yyyy-mm-dd>-<slug>` from the current `main` SHA.
6. Create one Git tree/commit containing the Markdown and all assets atomically.
7. Open a draft PR with the target query, source checklist, accepted warnings,
   and generated-cost summary in the body.
8. Persist branch/PR identifiers and move the item to `pr_open`.

Do not write directly to `main`, enable auto-merge, or merge from the MVP portal.

### GitHub credentials

Use a dedicated fine-grained credential restricted to `eimis1990/chatzone`, with
only the repository contents and pull-request permissions required. Store it only
as a server-side Vercel secret. A GitHub App installation is the stronger long-term
credential model; it is not required to prove the MVP workflow.

The publisher must be server-only and callable only after `requireRole('owner')`.
Every branch name and repository path is derived from a validated slug, never raw
user input.

### Publication reconciliation

On the overview/detail page, reconcile `pr_open` items against GitHub:

- Open draft/ready PR: retain `pr_open` and show preview/PR links.
- Closed unmerged PR: return to `ready` with a non-destructive explanation.
- Merged PR: verify `https://www.loqara.com/blog/<slug>` resolves after deployment,
  then set `published` and `published_at`.

A GitHub webhook can make this immediate later; polling on owner page load is
sufficient for the first release.

## GSC opportunity logic

The system must not pretend it has Ahrefs/Semrush-style search volume. It ranks
only from inputs it actually has:

- Impressions.
- Clicks/CTR.
- Average position.
- Recent trend when two comparable ranges are imported.
- Whether a dedicated Loqara page already owns the query.
- Commercial relevance selected by the owner/model and shown as a reason.

Opportunity types mirror the established loop: keyword gap, striking distance,
cannibalization, and emerging query. Each recommendation shows the calculation and
can become a content item; dismissal is retained so it is not suggested repeatedly.

## Social repurposing (post-MVP)

After an article is published, a **Repurpose** action may generate:

- A LinkedIn draft and image direction, inserted into the existing
  `linkedin_posts` board for manual copy/paste publication.
- Short Facebook/Instagram copy variants for export.
- Optional email/newsletter copy.

This is transformation and planning, not automatic social posting. Direct social
account APIs require separate OAuth, permissions, review, scheduling, and failure
handling and should be designed as their own product boundary.

## Security and reliability invariants

- Every page, action, and route requires the owner role independently.
- New tables use RLS with owner-only policies; service-role access occurs only
  behind an explicit owner authorization check.
- Draft Storage is private; signed URLs are short-lived.
- No arbitrary filesystem paths; slugs and extensions are allowlisted.
- No arbitrary server-side URL fetching for owner-entered sources without the
  existing SSRF protections. Linking to a source does not require fetching it.
- Generation runs are idempotent and cost-capped; duplicate clicks do not double-spend.
- Provider errors preserve the previous human-edited draft and image revision.
- Regeneration never silently overwrites owner edits; it creates a proposed revision.
- Provider prompts and schemas are versioned in code and the version is recorded per run.
- Raw provider reasoning is not stored; only usable research, citations, output,
  operational identifiers, and usage metadata are retained.
- GitHub credentials never reach Client Components or browser logs.

## UI quality constraints

- Match the current Owner portal tokens, typography, surfaces, and Lucide icon style.
- One primary CTA per lifecycle stage; secondary/retry/regenerate actions are subordinate.
- 44px minimum interactive targets and visible keyboard focus.
- Do not rely on status color alone; always include text/icon labels.
- Autosave and long-running job status use accessible live regions without stealing focus.
- Reserve media space, lazy-load noncritical previews, and avoid layout shift.
- Respect reduced motion; motion communicates drawer/tab/state continuity only.
- Preserve unsaved work and warn before replacing edited content or dismissing a dirty form.
- Test at 375px, 768px, 1024px, and 1440px with no horizontal page scroll.

The UI/UX planning search suggested a generic dark, green, code-font data dashboard.
That visual direction is deliberately rejected: consistency with the established
Owner shell is more important. Its applicable guidance—content-first hierarchy,
explicit loading feedback, readable line lengths, accessibility, and progressive
disclosure—is retained.

## Testing strategy

- Unit: lifecycle transitions, slug/frontmatter serialization, research/draft
  schema parsing, audit rules, GSC opportunity scoring, GitHub path/branch derivation.
- Action/route: owner authorization, RLS-safe CRUD, idempotent run start, provider
  polling, image limits, audit blockers, GitHub failure recovery.
- Component: intake validation, autosave states, editor/preview, source verification,
  audit errors vs warnings, overwrite confirmation.
- Playwright: keyboard and mobile pipeline flow; create idea -> research fixture ->
  draft fixture -> edit -> approve image -> audit -> mocked PR creation.
- Production smoke: real owner auth, one low-risk test draft PR, Vercel preview,
  merge, live URL reconciliation, and IndexNow delta behavior.

## Rollout

1. Ship behind an owner-only `CONTENT_STUDIO_ENABLED` flag if provider/GitHub
   credentials are not yet configured.
2. Prove manual topic -> draft -> PR with fixture-backed tests.
3. Run one real article through the full workflow and compare it to the playbook.
4. Add GSC CSV opportunity import after draft quality is acceptable.
5. Add optional LinkedIn-board repurposing only after the core article flow is stable.

## Open decisions before implementation reaches publishing

- Fine-grained GitHub token for the MVP versus installing a GitHub App immediately.
- Whether the first real run uses the Responses API directly or adds the official
  OpenAI SDK alongside the existing AI SDK.
- Exact generation model/cost caps; keep them configuration-driven rather than
  hard-coding a product promise into the data model.
- Whether refresh-mode PRs may edit only one existing Markdown file or also update
  inbound links from related posts in the same atomic commit.
