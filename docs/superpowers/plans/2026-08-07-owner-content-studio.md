# Owner Content Studio Implementation Plan

> **Branch:** `codex/owner-content-studio`
>
> **Spec:** `docs/superpowers/specs/2026-08-07-owner-content-studio-design.md`
>
> Implement in small reviewed commits. Do not touch or stage unrelated working-tree
> changes. This Next.js fork differs from standard Next.js; read the relevant guide
> under `node_modules/next/dist/docs/` before implementing each framework surface.

**Goal:** Give the platform owner one safe workspace to research, draft, preview,
quality-check, and publish Loqara blog articles through reviewable GitHub PRs.

**Architecture:** Supabase stores owner-only workflow state and private draft images.
Server-only provider adapters run source-backed research, structured draft generation,
and image generation. Existing blog rules are shared with the runtime studio audit.
Publishing creates an atomic Git commit on a content branch and opens a draft PR;
the existing Git/Vercel blog pipeline remains the public source of truth.

## Global constraints

- MVP targets only Loqara's own blog.
- No automatic publishing, merging, social posting, or client CMS integration.
- Every mutation independently calls `requireRole('owner')` before service-role access.
- Preserve the current public blog renderer and existing article URLs.
- Research citations must remain visible and clickable in the Owner UI.
- Regeneration cannot silently overwrite human edits.
- `npm run audit:blog` remains the final repository content gate.
- Use `npm test`, not direct `vitest`.
- Before editing Next.js routes/actions/caching, read the matching local Next docs.
- Before adding shadcn components, inspect the existing `components/ui` inventory.
- Do not stage the user's pre-existing modified/untracked files.

## Phase 1 — foundation and manual content workspace

### Task 1: Extract reusable blog contracts and deterministic audit functions

**Files:**

- Create: `lib/blog/frontmatter.ts`
- Create: `lib/blog/audit.ts`
- Create: `lib/blog/inventory.ts`
- Modify: `lib/blog.ts`
- Modify: `scripts/audit-blog-content.mjs`
- Test: `tests/unit/blog-frontmatter.test.ts`
- Test: `tests/unit/blog-audit.test.ts`

- [ ] Move frontmatter parsing/serialization into a pure module with a typed article draft shape.
- [ ] Preserve the exact current public parsing behavior; add round-trip tests using representative posts.
- [ ] Move deterministic per-post checks into pure functions that accept a virtual post and inventory.
- [ ] Keep repository-wide link-graph checks available to the CLI.
- [ ] Make `scripts/audit-blog-content.mjs` a thin caller of the shared rules.
- [ ] Add a compact inventory projection: slug, title, description, topic, headings, links, updated date.
- [ ] Verify `npm run audit:blog` produces no new errors and the public blog tests still pass.

### Task 2: Add owner-only workflow tables and private Storage policy

**Files:**

- Create: `supabase/migrations/<timestamp>_owner_content_studio.sql`
- Modify: `lib/types.ts`
- Test: `tests/unit/content-studio-lifecycle.test.ts`

- [ ] Create `content_items`, `content_sources`, and `content_generation_runs` per the spec.
- [ ] Add finite checks, timestamps, indexes, source URL uniqueness, and one-active-run protection.
- [ ] Enable RLS and add owner-only policies to all three tables.
- [ ] Create private `content-studio` Storage bucket and owner-only object policies.
- [ ] Add TypeScript row/status/input types; do not expose service credentials in shared client types.
- [ ] Implement/test a pure lifecycle transition validator.
- [ ] Apply the migration using the project's verified migration workflow; do not guess against production.

### Task 3: Add Content Studio routes and Owner navigation

**Read first:** local Next.js App Router project structure, layouts/pages, loading UI,
error handling, and forms/server-actions guides under `node_modules/next/dist/docs/01-app/`.

**Files:**

- Modify: `components/owner/OwnerSidebar.tsx`
- Create: `app/(owner)/owner/content/page.tsx`
- Create: `app/(owner)/owner/content/loading.tsx`
- Create: `app/(owner)/owner/content/error.tsx`
- Create: `app/(owner)/owner/content/new/page.tsx`
- Create: `app/(owner)/owner/content/[id]/page.tsx`
- Create: `components/owner/content-studio/ContentStudioShell.tsx`
- Test: `tests/unit/owner-sidebar-content-studio.test.tsx`

- [ ] Add top-level **Content Studio** navigation near LinkedIn using the established link behavior.
- [ ] Gate every page with `requireRole('owner')` even though the parent layout is gated.
- [ ] Build semantic page skeletons that reserve the final layout dimensions.
- [ ] Add accessible not-found/error states and predictable back navigation.
- [ ] Confirm collapsed sidebar tooltips, active state, and scroll behavior still work.

### Task 4: Implement owner-authorized CRUD and autosave

**Files:**

- Create: `app/(owner)/owner/content/actions.ts`
- Create: `lib/content-studio/validation.ts`
- Create: `lib/content-studio/repository.ts`
- Test: `tests/unit/content-studio-validation.test.ts`

- [ ] Define Zod schemas for intake, article fields, source verification, warning acceptance, and archive.
- [ ] Implement create/read/update/archive server actions with owner auth before service-client access.
- [ ] Validate status transitions server-side rather than trusting submitted UI state.
- [ ] Use optimistic concurrency (`updated_at` or revision integer) so two tabs cannot silently clobber work.
- [ ] Return typed conflict errors that let the UI reload/compare instead of dropping edits.
- [ ] Revalidate only Content Studio paths affected by each mutation.

### Task 5: Build the pipeline overview

**Files:**

- Create: `components/owner/content-studio/ContentPipeline.tsx`
- Create: `components/owner/content-studio/ContentItemCard.tsx`
- Create: `components/owner/content-studio/ContentFilters.tsx`
- Create: `components/owner/content-studio/ContentSummary.tsx`
- Test: `tests/unit/content-pipeline.test.tsx`

- [ ] Add Pipeline, Opportunities placeholder, and Published tabs with deep-linkable query state.
- [ ] Add status/search/type filters without hiding recovery errors.
- [ ] Render the four summary metrics from the loaded rows, not demo values.
- [ ] Give empty states one useful next action.
- [ ] Ensure status uses text/icons in addition to color and every row/card is keyboard reachable.
- [ ] Test 375/768/1024/1440 widths and avoid nested scroll traps.

### Task 6: Build progressive intake and the article workspace

**Files:**

- Create: `components/owner/content-studio/ArticleIntake.tsx`
- Create: `components/owner/content-studio/ArticleWorkspace.tsx`
- Create: `components/owner/content-studio/MarkdownEditor.tsx`
- Create: `components/owner/content-studio/ArticlePreview.tsx`
- Create: `components/owner/content-studio/SourcePanel.tsx`
- Create: `components/owner/content-studio/QualityPanel.tsx`
- Create: `components/owner/content-studio/CoverPanel.tsx`
- Test: `tests/unit/article-intake.test.tsx`
- Test: `tests/unit/article-workspace.test.tsx`

- [ ] Implement minimal required intake with progressive advanced fields.
- [ ] Load refresh candidates from the compact blog inventory.
- [ ] Add debounced autosave with visible saving/saved/error state and conflict recovery.
- [ ] Keep manual editor changes in a new revision before any regeneration replacement.
- [ ] Render preview through the same Markdown/table enhancement path as the public blog.
- [ ] Provide edit/preview tabs on narrow screens and optional side-by-side on wide screens.
- [ ] Warn before leaving/replacing a dirty unsaved editor state.
- [ ] Validate keyboard focus, labels, live-region announcements, and readable line length.

## Phase 2 — source-backed research and drafting

### Task 7: Add the research provider boundary and OpenAI adapter

**Read first:** current official OpenAI web-search, Structured Outputs, and background-mode docs.

**Files:**

- Create: `lib/content-studio/providers/types.ts`
- Create: `lib/content-studio/providers/openai-research.ts`
- Create: `lib/content-studio/schemas.ts`
- Create: `lib/content-studio/prompts/research.ts`
- Create: `app/api/owner/content/[id]/research/route.ts`
- Create: `app/api/owner/content/runs/[runId]/route.ts`
- Test: `tests/unit/content-research-schema.test.ts`
- Test: `tests/unit/content-research-route.test.ts`

- [ ] Define Loqara-owned structured research/brief schemas; do not store raw provider objects as domain state.
- [ ] Start a persisted idempotent research run and set the item to `researching`.
- [ ] Use Responses `web_search` with visible citations and request the source list.
- [ ] Use background mode for long runs; persist the provider response ID and poll by owner-only route.
- [ ] Supply the current article inventory and SEO/GEO capability boundaries to overlap analysis.
- [ ] Persist deduplicated sources and structured brief only after schema validation.
- [ ] Record usage/error metadata without storing hidden model reasoning.
- [ ] Handle incomplete/refused/cancelled/expired runs with actionable retry states.

### Task 8: Generate a typed draft package without overwriting edits

**Files:**

- Create: `lib/content-studio/providers/openai-draft.ts`
- Create: `lib/content-studio/prompts/draft.ts`
- Create: `app/api/owner/content/[id]/draft/route.ts`
- Test: `tests/unit/content-draft-schema.test.ts`
- Test: `tests/unit/content-draft-route.test.ts`

- [ ] Require an approved/complete brief before draft generation.
- [ ] Generate typed metadata, Markdown, related slugs, source mapping, cover direction, and uncertainties.
- [ ] Reject nonexistent internal links/topics and duplicate slug/title conflicts.
- [ ] Store generated output as a proposed revision if human-edited Markdown already exists.
- [ ] Give the owner Compare/Accept/Discard controls; never overwrite silently.
- [ ] Track prompt/schema version and usage for every run.

### Task 9: Generate, normalize, and approve cover images

**Files:**

- Create: `lib/content-studio/providers/openai-image.ts`
- Create: `lib/content-studio/images.ts`
- Create: `app/api/owner/content/[id]/cover/route.ts`
- Modify: `package.json` if runtime `sharp` must move to dependencies
- Test: `tests/unit/content-cover.test.ts`

- [ ] Generate text-free editorial art from the approved cover direction.
- [ ] Validate decoded size/type, normalize to 1200×800 WebP, and strip temporary source bytes.
- [ ] Store immutable revisions in the private bucket and return signed preview URLs.
- [ ] Require meaningful alt text and explicit owner approval before `ready`.
- [ ] Keep the previous approved image on generation/upload failure.
- [ ] Add generation cap/idempotency tests.

### Task 10: Add runtime quality checks and readiness gate

**Files:**

- Create: `lib/content-studio/audit.ts`
- Create: `app/api/owner/content/[id]/audit/route.ts`
- Modify: `components/owner/content-studio/QualityPanel.tsx`
- Test: `tests/unit/content-studio-audit.test.ts`

- [ ] Build a virtual post from typed fields + Markdown and run the shared blog checks.
- [ ] Add studio-specific checks: source mapping, verified-source coverage, approved cover, accepted warnings.
- [ ] Persist audit version/result so any content edit invalidates readiness.
- [ ] Block `ready` and PR creation on errors; warnings need explicit per-code acceptance.
- [ ] Show cause + recovery action for every error rather than a generic failure banner.

## Phase 3 — GitHub PR publishing

### Task 11: Add a server-only GitHub publishing adapter

**Files:**

- Create: `lib/content-studio/publish/types.ts`
- Create: `lib/content-studio/publish/github.ts`
- Modify: `lib/env.ts`
- Modify: `.env.example`
- Test: `tests/unit/content-github-publisher.test.ts`

- [x] Add server-only `GITHUB_CONTENT_TOKEN`, repository, and base-branch configuration.
- [x] Derive/validate all branch and file paths from the canonical slug.
- [x] Recheck current `main` for slug conflicts immediately before publishing.
- [x] Create one atomic tree/commit with Markdown and approved image bytes.
- [x] Open a draft PR and return branch/SHA/PR identifiers.
- [x] Make retries idempotent: reuse the item's branch/PR or stop with a clear conflict.
- [x] Scrub tokens and authorization headers from errors/logs.
- [x] Mock all GitHub calls in tests; no test may mutate the live repository.

### Task 12: Wire the publication gate and reconciliation

**Files:**

- Modify: `app/(owner)/owner/content/actions.ts`
- Modify: `components/owner/content/ArticleWorkspace.tsx`
- Modify: `components/owner/content/ContentPipeline.tsx`
- Test: `tests/unit/content-github-publisher.test.ts`
- Test: `tests/unit/content-publication-status.test.ts`

- [ ] Require owner role, latest passing audit, approved cover, and `ready` status.
- [x] Serialize deterministic frontmatter + Markdown and invoke the publisher once.
- [x] Persist PR metadata before returning success to the browser.
- [ ] Link to both the PR and Vercel preview when available.
- [x] Reconcile closed/unmerged, open, and merged PRs without destructive state loss.
- [x] Mark published only after merge plus live URL verification.
- [x] Do not expose merge/auto-merge controls in the MVP.

## Phase 4 — measured opportunities and feedback

### Task 13: Add Search Console CSV imports and opportunity ranking

**Files:**

- Create: `supabase/migrations/<timestamp>_content_gsc_imports.sql`
- Create: `lib/content-studio/gsc/csv.ts`
- Create: `lib/content-studio/gsc/opportunities.ts`
- Create: `app/api/owner/content/gsc-import/route.ts`
- Create: `components/owner/content-studio/OpportunityTable.tsx`
- Test: `tests/unit/gsc-csv.test.ts`
- Test: `tests/unit/content-opportunities.test.ts`

- [ ] Accept the documented GSC query/page CSV shapes with size and row caps.
- [ ] Normalize rows and discard the original upload after successful import.
- [ ] Calculate gaps, striking distance, cannibalization, and emerging-query candidates.
- [ ] Show the exact metrics/reason behind every opportunity score.
- [ ] Let the owner create, dismiss, or link an opportunity to an existing content item.
- [ ] Never display invented search volume/difficulty.

### Task 14: Add post-publication checkpoints

**Files:**

- Modify: `lib/content-studio/gsc/opportunities.ts`
- Modify: `components/owner/content-studio/ContentPipeline.tsx`
- Test: `tests/unit/content-checkpoints.test.ts`

- [ ] Show 7-day and 28-day follow-up states for published articles.
- [ ] Compare imported page/query metrics to the pre-publication baseline when available.
- [ ] Keep analytics observational; never trigger automatic rewrites from a short-term dip.
- [ ] Add optional refresh suggestion with transparent evidence and human acceptance.

## Phase 5 — optional repurposing, not social auto-posting

### Task 15: Generate a LinkedIn-board draft from a published article

**Files:**

- Create: `lib/content-studio/repurpose.ts`
- Modify: `app/(owner)/owner/linkedin/actions.ts`
- Modify: `components/owner/content-studio/ArticleWorkspace.tsx`
- Test: `tests/unit/content-repurpose.test.ts`

- [ ] Require a published article and fetch its canonical Markdown from repository/domain state.
- [ ] Generate a founder-led LinkedIn draft, supporting link, visual direction, and alt text.
- [ ] Insert it as `draft` into the existing `linkedin_posts` board with owner confirmation.
- [ ] Deduplicate by source content item/article URL.
- [ ] Keep actual LinkedIn publication manual; do not request social account OAuth in this task.

## Phase 6 — hardening, documentation, and rollout

### Task 16: Accessibility, responsive, and failure-path verification

**Files:**

- Create: `tests/e2e/owner-content-studio.spec.ts`
- Modify affected Content Studio components as findings require

- [ ] Keyboard-test intake, tabs, editor, source verification, image approval, audit, and PR action.
- [ ] Verify focus placement after validation errors and route transitions.
- [ ] Test reduced motion and long/loading/error content at 375/768/1024/1440 widths.
- [ ] Confirm no content is hidden behind fixed actions and no page-level horizontal scroll appears.
- [ ] Exercise provider timeout, invalid structured output, failed image, audit blocker,
  GitHub partial failure, stale revision, and closed-unmerged PR recovery.

### Task 17: Verification and production-safe pilot

- [x] `npm run typecheck`
- [x] `npm test`
- [x] `npm run lint` — zero errors; known warnings are allowed per wiki.
- [x] `npm run audit:blog`
- [x] `npm run build`
- [ ] Run the full flow with mocked providers locally.
- [ ] Configure the minimum server-only production credentials.
- [ ] Run one real low-risk article into a **draft PR**; do not merge during automated verification.
- [ ] Confirm Vercel preview, content audit, image rendering, and PR diff.
- [ ] After explicit owner review/merge, confirm live URL, sitemap inclusion, and IndexNow delta.

### Task 18: Keep the wiki current

**Files:**

- Create: `docs/wiki/content-studio.md`
- Modify: `docs/wiki/index.md`
- Modify: `docs/wiki/blog-and-seo.md`
- Modify: `docs/wiki/log.md`

- [x] Document actual implemented routes, tables, lifecycle, provider/publish boundaries, and recovery gotchas.
- [x] Link the new page from the wiki index.
- [ ] Update blog mechanics only where implementation changed shared audit/frontmatter code.
- [x] Append a concise log entry citing the final files and migration.
- [x] Mark unverified production behavior with `⚠️ verify` until the pilot confirms it.

## Suggested commit boundaries

1. `refactor(blog): share frontmatter and audit contracts`
2. `feat(content-studio): owner workflow schema and lifecycle`
3. `feat(content-studio): pipeline and article workspace`
4. `feat(content-studio): source-backed research and drafts`
5. `feat(content-studio): cover generation and readiness audit`
6. `feat(content-studio): publish through draft pull requests`
7. `feat(content-studio): Search Console opportunity imports`
8. `feat(content-studio): published-article LinkedIn repurposing` (optional)
9. `docs(content-studio): document owner content workflow`
