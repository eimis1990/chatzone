# LinkedIn content board

Owner-only planning workspace for moving posts from an angle to publish-ready copy.

## Board and persistence

- `LinkedInBoard` owns a normalized `idea` / `draft` / `posted` client state and
  renders the responsive three-column board (`components/owner/LinkedInBoard.tsx:158`).
- Pointer and keyboard sorting use dnd-kit. The `DndContext` has an explicit ID;
  without it, generated `aria-describedby` values can differ during SSR hydration
  (`components/owner/LinkedInBoard.tsx:340`).
- Drops update the board optimistically, then persist the complete ordered state.
  A failed server action restores the pre-drag snapshot
  (`components/owner/LinkedInBoard.tsx:235`,
  `app/(owner)/owner/linkedin/actions.ts:97`).
- The Move-to select is the non-drag fallback. Moving into `posted` stamps
  `posted_at`; moving back clears it.
- Each column is its own scroll viewport on desktop. Sortable cards must remain
  `shrink-0`, otherwise long columns compress every card instead of scrolling
  (`components/owner/LinkedInBoard.tsx:607`,
  `components/owner/LinkedInBoard.tsx:639`).

## Data and content assets

- `linkedin_posts.sort_order`, `image_url`, and `image_alt` are added and indexed
  by `supabase/migrations/20260711112234_linkedin_post_order_and_visuals.sql:2`.
- Draft visuals are local 1200×628 PNGs under `public/linkedin/`. The image URL
  and meaningful alt text live with each post so the editor can preview both.
- `scripts/generate-linkedin-visuals.mjs` deterministically rebuilds the branded
  “Loqara Field Notes” visual set. Exact-text editorial diagrams are preferred
  here over generic generated imagery so the feed stays consistent and credible.
- `scripts/seed-linkedin-content.mjs` is an idempotent content bootstrap, not a
  routine runtime command: rerunning it deliberately restores its 20 drafts and
  10 ideas, including their ordering and statuses.
- Copy follows a founder-led LinkedIn shape: a specific observation, short
  paragraphs, concrete evidence or a useful framework, and no engagement bait.
  Ideas stay brief; drafts contain complete publishable copy.

_Last verified: 2026-07-11 (1812b28 + working tree)._
