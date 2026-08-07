# Owner Content Studio

Owner-only editorial workspace at `/owner/content` for Loqara's file-backed blog. It combines private AI-assisted research and drafting, deterministic quality gates, destination-specific draft copy, destination policy, proactive next-action recommendations, and a review-only GitHub publication handoff. It can create a dedicated content branch and draft pull request; it deliberately cannot merge, write to `main`, or post to social accounts.

## Current flow

1. `/owner/content/new` captures new-versus-refresh mode, reader outcome, query, intent, and topic.
2. New work starts with a generated slug. A refresh securely loads the selected `content/blog/<slug>.md` body and frontmatter into the draft; path-like slugs are rejected (`lib/blog.ts:78`, `app/(owner)/owner/content/actions.ts:27`).
3. `/owner/content/[id]` autosaves after 900 ms and exposes an explicit Save button. Every update compares `revision`, so a second stale session fails instead of overwriting newer work (`components/owner/content/ArticleWorkspace.tsx:81`, `app/(owner)/owner/content/actions.ts:73`).
4. Write/Preview use the same `renderBlogMarkdown` contract as the public article route, including heading anchors, responsive tables, and trusted article HTML (`lib/blog-render.ts:57`, `lib/blog.ts:94`).
5. **Generate article package** performs current web research, writes a complete article, stores source provenance, creates drafts for enabled text destinations, and then requests a private cover image. Regeneration requires confirmation because it replaces the generated article package (`components/owner/content/ArticleWorkspace.tsx:177`).
6. Status changes use the explicit lifecycle in `lib/content-studio/lifecycle.ts`. Required deterministic checks must pass before an article can enter review. Editing an article that was Ready sends it back to Review; PR-open and Published articles are locked against draft edits (`app/(owner)/owner/content/actions.ts:67`).
7. When proactive suggestions are enabled, the pipeline ranks failed work, review decisions, ready work, active drafts, new ideas, and incomplete destination setup. An idea can enter drafting and open in one click (`lib/content-studio/suggestions.ts:18`, `components/owner/content/ContentNextActions.tsx:27`).
8. A Ready article exposes one primary **Create draft PR** action. Confirmation states exactly what will happen and that no merge or production write is possible. Missing GitHub configuration disables the action and explains the required server-only settings (`components/owner/content/ArticleWorkspace.tsx:385`, `components/owner/content/ArticleWorkspace.tsx:564`).

## Researched generation

The server-only generator uses the OpenAI Responses API with live web search, strict structured output, `store: false`, and verified product context from `PRODUCT.md`. Research runs first and must produce at least three unique URL sources; only then may the drafting call create article Markdown and social variants (`lib/content-studio/generation.ts:161`). The article contract requires a Quick Answer, current citations, contextual internal links, useful long-form structure, FAQs, honest limitations, related slugs, and a text-free cover brief. Web material and existing draft content are explicitly treated as untrusted evidence rather than instructions.

The deterministic checks in `lib/content-studio/quality.ts` validate title/description, Quick Answer length, external citations plus saved sources, internal links, structure, FAQ coverage, related articles, cover brief, and unfinished placeholders. Required failures block the move to review; recommended failures stay visible for owner judgment.

One UI click intentionally invokes two Server Actions. The first completes and atomically saves the researched article, sources, destination drafts, and successful draft run. The second generates a WebP cover with `gpt-image-2`, uploads it to the private bucket, and advances the optimistic revision (`app/(owner)/owner/content/actions.ts:214`, `app/(owner)/owner/content/actions.ts:360`). This split is a durability boundary: live testing showed long-form research can take minutes, so a slow or failed image must never discard a finished article. The UI reports an image failure as a retryable warning while keeping the article available.

Only enabled destinations that accept `social_post` currently receive generated variants. That means LinkedIn, Facebook, and Instagram can receive reviewable copy; website publishing and video variants remain future work. Generated variants are drafts, not delivery attempts, and no provider connector exists yet (`lib/content-studio/generation.ts:61`).

## Automation and destination settings

`/owner/content/settings` configures the workflow default and one current account slot for each planned destination: the Loqara website, LinkedIn, Facebook, Instagram, YouTube, and TikTok. Each destination has:

- an enabled flag;
- account label/handle metadata;
- allowed content types (`article`, `social_post`, `video`) constrained per provider;
- its own `review` or `auto_publish` approval policy;
- connector readiness state (`not_connected`, `connected`, `error`).

Defaults are intentionally safe: proactive recommendations are on, every destination is disabled, and approval mode is `review` (`lib/content-studio/publication.ts:31`). Selecting auto-publish for either the global default or an existing destination requires explicit confirmation (`components/owner/content/ContentSettingsForm.tsx:80`, `components/owner/content/ContentSettingsForm.tsx:294`). The setting is future-facing while a connector is unavailable; the UI must never imply that content has been delivered merely because a policy is enabled.

The schema keys targets by `(owner_id, provider, slot_key)`, leaving room for multiple accounts per provider. The current screen exposes the `default` slot only; add/remove-account UI should arrive with real OAuth connector discovery rather than accepting arbitrary unverified accounts (`supabase/migrations/20260807125037_content_studio_automation_settings.sql:14`).

## Guided Studio UI

Content Studio uses one shared visual grammar across the pipeline, intake, settings, and article workspace: a compact header followed by an orange guidance ribbon that names the safest next action and shows the five-stage Brief → Draft → Review → PR → Live lifecycle (`components/owner/content/ContentStudioChrome.tsx:11`, `components/owner/content/ContentStudioChrome.tsx:83`). The ribbon is guidance, not decoration: its action is derived from the actual article status, and publishing states retain the review-only GitHub boundary (`components/owner/content/ArticleWorkspace.tsx:362`).

The pipeline is an editorial board rather than a grid of dashboard panels. Ideas, Writing, and Review & publish are separated by gutters and hairline dividers; each article remains a standalone linkable card with query, topic, status, and updated date (`components/owner/content/ContentPipeline.tsx:27`, `components/owner/content/ContentPipeline.tsx:143`). The brief, destination settings, and editor reuse the same header/ribbon hierarchy so users always see both their current stage and the next safe action.

The article workspace uses page-level scrolling for its forms, previews, Destinations, and 24rem review rail rather than clipping those panels. The one deliberate nested scroller is the long Markdown body textarea: shadcn's default `field-sizing-content` must be overridden with `field-sizing-fixed`, and its height is capped to roughly one viewport so a full article cannot stretch the whole workspace. Research sources use an explicit show-all control. Preview can open as a focus-trapped, Escape-dismissable full-window reading surface using the exact same renderer as the inline preview (`components/owner/content/ArticleWorkspace.tsx:81`, `components/owner/content/ArticleWorkspace.tsx:480`, `components/owner/content/ArticleWorkspace.tsx:513`, `components/owner/content/ArticleWorkspace.tsx:611`).

The pipeline hydrates active generation runs alongside articles, labels cards with their current operation, and subscribes to owner-visible `content_items` plus `content_generation_runs` changes. Direct row events move cards immediately; an eight-second refresh plus window-focus refresh reconciles missed events or unavailable Realtime connections. The server derives a version key from item timestamps and active runs so a reconciled snapshot resets client state only when its data actually changed (`app/(owner)/owner/content/page.tsx:23`, `components/owner/content/ContentPipeline.tsx:46`, `components/owner/content/ContentPipeline.tsx:122`).

At widths below 768 px the owner sidebar automatically starts as its icon rail, leaving the Content workspace usable while preserving the normal manual expand/collapse control (`components/owner/OwnerSidebar.tsx:168`). The lifecycle is horizontally scrollable on narrow screens rather than compressing or hiding stages (`components/owner/content/ContentStudioChrome.tsx:57`). Browser QA must check both the full owner shell and the content-only region because the selected Content concept did not include the existing sidebar.

## Data and security

Migration `supabase/migrations/20260807121527_owner_content_studio.sql` creates:

- `content_items` — private draft, editorial state, optimistic revision, future image/PR pointers.
- `content_sources` — future research provenance.
- `content_generation_runs` — future research/draft/image/publish run history, with a partial unique index preventing duplicate active operations.
- private `content-studio` Storage bucket for future generated assets.

All three public tables have RLS enabled, authenticated access is owner-only through `public.is_owner()`, and `anon` table privileges are revoked (`supabase/migrations/20260807121527_owner_content_studio.sql:79`). Server actions still call `requireRole('owner')` before using the service-role client (`app/(owner)/owner/content/actions.ts:27`); service role bypassing RLS never replaces action-level authorization.

Migration `supabase/migrations/20260807125037_content_studio_automation_settings.sql` adds the owner settings singleton and per-account publication targets. Both tables are owner-readable, but direct authenticated writes are revoked: settings mutations must pass through the owner-authorized server action, which deliberately cannot alter connector status (`app/(owner)/owner/content/actions.ts:149`). Migration `20260807130028_content_target_provider_types.sql` adds the database-level provider/content-type compatibility check so a future service-role job cannot, for example, schedule an article for YouTube.

Migration `20260807132336_content_distribution_drafts.sql` adds owner-readable, server-managed `content_variants` and the service-role-only `apply_content_generation_result` function. The function performs the revision-checked article update, source upserts, variant replacement, and run completion in one database transaction. Direct authenticated writes to variants and function execution are revoked; integration tests exercise the transaction plus owner/client/anonymous isolation.

Migration `20260807143000_content_github_publication.sql` adds the durable PR number, branch, head commit, and base commit identifiers. Its service-role-only `apply_content_publication_result` function atomically advances a revision-checked Ready item to PR Open and completes the publish run. If GitHub succeeds but this database transaction fails, retry finds the deterministic open PR and records it instead of creating another (`supabase/migrations/20260807143000_content_github_publication.sql:11`, `lib/content-studio/publish/github.ts:140`).

Migration `20260807162044_content_studio_realtime.sql` idempotently adds `content_items` and `content_generation_runs` to the `supabase_realtime` publication. Realtime still honors the existing owner-only RLS policies; it does not broaden table access (`supabase/migrations/20260807162044_content_studio_realtime.sql:1`).

## Publication boundary

The deployed Vercel filesystem is not a durable content store. Final website publishing therefore uses a reviewable GitHub branch/PR and lets the existing merge-to-main deployment publish the files. Direct runtime writes to `content/blog` or `public/blog` are not valid production behavior.

The GitHub adapter is server-only and requires dedicated `GITHUB_CONTENT_TOKEN`, `GITHUB_CONTENT_REPOSITORY`, and `GITHUB_CONTENT_BASE_BRANCH` settings. The token is never exposed to the browser. A publish attempt reloads current `main`, rejects a new-article slug collision, serializes deterministic frontmatter, normalizes the approved cover to 1200×800 WebP, creates both blobs in one tree/commit, and opens a draft PR from `content/<date>-<slug>-<item-prefix>` (`lib/content-studio/publish/github.ts:115`, `lib/content-studio/publish/files.ts:19`, `lib/content-studio/publish/cover.ts:6`). Refreshes require the base article to still exist, preserve its original `date`, and add `updated` when appropriate.

The publication gate re-runs all required deterministic checks and validates the topic, cover/alt text, internal links, and related slugs immediately before any GitHub mutation (`lib/content-studio/publish/readiness.ts:4`). The owner action is revision-checked and records an in-progress publish run. Retries reuse an already-open PR for the item branch. GitHub errors are sanitized before they reach run history or the UI.

PR status reconciles read-only on article load and via **Refresh PR status**: open remains PR Open; closed without merge returns to Ready; merged stays PR Open until `/blog/<slug>` responds successfully; only then does the item become Published (`app/(owner)/owner/content/actions.ts:611`, `lib/content-studio/publish/reconcile.ts:9`). There are no merge or auto-merge controls. ⚠️ A real repository pilot is still required after a dedicated fine-grained token is configured; automated tests mock every GitHub mutation and have not changed the live repository.

OAuth connectors, scheduling, social delivery, GSC opportunity import, and Vercel preview discovery remain later phases. Saved `auto_publish` means “use this policy once connector execution exists,” not “social publishing works now.”

## Migration status

The first five Content Studio migrations (`20260807121527`, `20260807125037`, `20260807130028`, `20260807132336`, and `20260807143000`) are applied to the linked Supabase project and aligned in migration history. The first migration had originally been applied as raw SQL; `supabase migration repair --linked --status applied 20260807121527` reconciled its history before the later migrations were pushed. Migration `20260807162044` must also be applied wherever the live pipeline should receive Postgres Changes; the UI retains focus and eight-second refresh fallbacks when it is not. Docker is still required for fully local Supabase development, but linked-project integration tests cover the policies, atomic generation/publication functions, and constraints.

## Tests

- `tests/unit/content-studio.test.ts` — lifecycle, validation, slugging, safe publication defaults, provider compatibility, and recommendation ranking.
- `tests/unit/content-settings.test.tsx` — destination rendering and mandatory auto-publish confirmation.
- `tests/unit/content-pipeline.test.tsx` — pipeline/published separation, filtering, active-run feedback, and Realtime card movement.
- `tests/unit/content-generation.test.ts` and `content-quality.test.ts` — prompt contract and deterministic article gates.
- `tests/unit/article-workspace-generation.test.tsx` — one-click article/destination/cover workflow, full-screen preview, plus draft-PR confirmation and result UI.
- `tests/unit/content-github-publisher.test.ts` — deterministic files, atomic tree/commit, draft PR, retry reuse, refresh date preservation, slug conflicts, and credential scrubbing with all GitHub calls mocked.
- `tests/unit/content-publication-readiness.test.ts`, `content-cover.test.ts`, and `content-publication-status.test.ts` — final gate, image normalization, and PR/live reconciliation decisions.
- `tests/unit/blog-contract.test.ts` — frontmatter round-trip, shared renderer, refresh source/path rejection.
- `tests/integration/rls.test.ts` — owner visibility, client/anonymous isolation, atomic package/publication persistence, server-managed writes, and live provider/content-type constraint.
- `tests/integration/content-generation-live.test.ts` — opt-in, paid live web-research/article/social/image smoke test (`RUN_LIVE_CONTENT_GENERATION=true`).
- `tests/e2e/content-studio.spec.ts` — authenticated Chromium coverage for the pipeline, all six branded destination settings, and the disabled missing-GitHub-configuration state on a Ready article.
- Existing blog table and Owner sidebar tests guard the extracted renderer and navigation.
