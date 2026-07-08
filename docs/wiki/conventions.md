# Conventions

House rules that aren't obvious from the code.

## Testing

- **Run tests with `npm test`** (optionally `npm test -- <path>` for one file).
  The script sets `NODE_OPTIONS=--experimental-require-module` (Node 22.9). Plain
  `npx vitest run` fails with `ERR_REQUIRE_ESM` — always go through the npm script.
- Unit tests live in `tests/unit/*.test.ts`; a few integration tests under
  `tests/integration/` are skipped without live services.
- Prefer tests that assert real behavior over mocks. TDD for non-trivial logic.

## Deploy

- **Push to `main` → Vercel auto-deploys** (Git integration since 2026-07-02).
  `vercel deploy --prod` via CLI is just the fallback. See `docs/DEPLOY.md`.
- There is no staging gate; `main` is production. Verify (`tsc`, `npm test`,
  lint) before pushing.

## Git

- Branch for multi-step features; hotfixes/small changes go straight to `main`
  (that's the deploy path). Commit messages end with the
  `Co-Authored-By: Claude ...` trailer.
- Heads-up: this working copy is sometimes touched by more than one session at
  once — check `git status`/`git log` before assuming state.

## Framework

- **Next.js is a modified fork** — read `node_modules/next/dist/docs/` before
  writing framework code. Server actions can be passed to client components as
  props (see the inline `'use server'` closure pattern in
  `app/(client)/app/inbox/page.tsx` and the owner bot-create dialog).

## Content / markdown

- The blog and `.article` CSS render markdown via `marked`. **Inside a raw HTML
  block** (e.g. `<blockquote>`, `<div class="...">`) marked does **not** parse
  markdown — use HTML tags (`<strong>`, `<em>`) there, not `**`/`_`. See
  [blog-and-seo](blog-and-seo.md).

## Config & schema

- Bot config is validated by `botConfigSchema` (`lib/validation/schemas.ts`) with
  a `normalizeBotConfig` preprocess for legacy shapes. Plan limits are enforced
  server-side, never trusted from the browser — see
  [plans-and-entitlements](plans-and-entitlements.md).

_Last verified: 2026-07-08 (66f6bb8)._
