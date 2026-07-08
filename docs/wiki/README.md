# Project Wiki — how it works

A living, repo-committed knowledge base for anyone (human or AI agent) working on
Loqara. It exists so we don't re-derive the same understanding every session:
you read the relevant page first, and you leave the wiki a little better than you
found it. Adapted from Karpathy's "LLM wiki" pattern.

## The three layers

1. **Raw sources** (source of truth, not owned by the wiki): the codebase, git
   history, `node_modules/next/dist/docs/`, the other `docs/*.md`, and external
   docs. The wiki never contradicts these — it *points into* them.
2. **The wiki** (`docs/wiki/*.md`): concise, interlinked pages that synthesize how
   this project actually works — subsystems, conventions, decisions, and gotchas.
   Agents own this layer.
3. **The schema** (this file + the protocol in `AGENTS.md`): the rules below.

## What a good page looks like

- **Signposts, not essays.** Point to the real code (`file.ts:line`) and say the
  non-obvious thing. The code is the source of truth; the page saves the reader
  from rediscovering it.
- **Concise.** Bullets over prose. A page a reader can hold in their head.
- **Interlinked.** Link related pages with relative markdown links, e.g.
  `[entitlements](plans-and-entitlements.md)`. Liberal linking is the point.
- **Honest about certainty.** Mark anything unverified with `> ⚠️ verify:` so the
  next reader knows to confirm it against the code.
- **Dated at the bottom:** `_Last verified: YYYY-MM-DD (commit short-sha)._`

## The three operations

**Ingest** — you learned something durable (how a subsystem behaves, a sharp
edge, a decision and its why): add it to the right page (or create one), add a
one-liner to [index.md](index.md) if it's a new page, and append a line to
[log.md](log.md). Do this as part of finishing the work, not as a separate chore.

**Query** — before non-trivial work, skim [index.md](index.md) and read the
pages that touch what you're about to change. Cheaper than rediscovering it.

**Lint** — periodically (or on request) audit for staleness: claims that no
longer match the code, contradictions between pages, orphan pages nothing links
to, and gaps worth filling. Fix what you can; log the rest.

## Conventions

- **Location:** every wiki page lives in `docs/wiki/`. Filenames are
  `kebab-case.md`.
- **index.md** is the catalog: every page, grouped by area, with a one-line "what
  you'll find here." Keep it current when you add/rename/remove a page.
- **log.md** is append-only and chronological. One line per entry, prefixed with
  an ISO date and a tag: `INGEST`, `LINT`, `DECISION`, `FIX`. Newest at the bottom.
- **Don't duplicate** the other `docs/*.md` (DEPLOY, SECURITY, ROADMAP, …) or code
  comments — link to them.
- **Small is fine.** A wiki that grows one honest page at a time beats a big one
  written up front and left to rot.

## Scope

This wiki is for *us* (the people and agents building Loqara). It is not
user-facing, not marketing, and not the product knowledge base a bot answers
from. Keep secrets out — it's committed to the repo.
