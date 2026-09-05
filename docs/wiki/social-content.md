# Facebook and Instagram content board

Owner-only planning workspace at `/owner/social`, with separate Facebook and
Instagram tabs backed by independent queues.

## Model and workflow

- `social_posts` mirrors the LinkedIn board fields and adds `platform` plus an
  optional `source_linkedin_post_id`. The unique platform/source pair allows the
  same topic and artwork to develop different captions, order, and publication
  state without drifting into duplicates
  (`supabase/migrations/20260903054518_owner_meta_posts.sql`).
- The table is not available to `anon`. Authenticated owner sessions have
  RLS-protected read access, while owner-guarded Server Actions mutate through
  the service role (`app/(owner)/owner/social/actions.ts`).
- `/owner/social` loads both platform queues once; `SocialBoards` switches them
  through the same full-width segmented-tab treatment as Sales Leads and reuses
  the same DnD board implementation as LinkedIn. The selector sits below the
  active platform title/subtitle so the page hierarchy reads before navigation
  (`app/(owner)/owner/social/page.tsx`,
  `components/owner/SocialBoards.tsx`).
- The shared board changes platform labels, body limits, copy behavior, and
  image guidance. Facebook copying includes the supporting link; Instagram
  copying deliberately excludes it because caption URLs are not the CTA surface
  (`components/owner/LinkedInBoard.tsx`).

## Initial cross-platform slate

- `scripts/seed-social-posts.mjs` imports all 56 LinkedIn topics. The six
  undeveloped LinkedIn ideas remain Ideas; every LinkedIn draft or posted item
  becomes a fresh Draft, yielding 50 Drafts + 6 Ideas per platform.
- Facebook and Instagram have distinct priority lists. Facebook leads with
  relatable small-team and customer-friction posts; Instagram leads with clear
  visual contrasts and saveable ecommerce/CX ideas. Unranked items retain a
  deterministic source order.
- Artwork and alt text are reused unchanged. The 1.91:1 assets are feed-safe on
  both platforms; Reels and Stories require a later native 9:16 visual pass.
- Developed captions remove the LinkedIn hashtag footer, add a topic-aware
  discussion question, and then apply the platform rule: Facebook remains
  link-friendly and hashtag-light; Instagram stays below 2,200 characters and
  retains at most three source hashtags.
- The script is a dry run by default. `--apply` intentionally restores the
  imported caption and order baseline, so do not rerun it after manual board
  edits unless that reset is wanted.

_Last verified: 2026-09-03 (live database and local owner UI)._
