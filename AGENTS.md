<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Project wiki — read it, keep it current

`docs/wiki/` is our shared, compounding knowledge base about how this codebase
works — subsystems, conventions, decisions, and the gotchas that have bitten us.
It exists so we don't re-derive the same understanding every session.

**Before non-trivial work:** skim [`docs/wiki/index.md`](docs/wiki/index.md) and
read the pages that touch what you're about to change. Start with
[`gotchas.md`](docs/wiki/gotchas.md) and [`conventions.md`](docs/wiki/conventions.md).

**After you learn something durable** (how a subsystem behaves, a sharp edge, a
decision and its why): update the relevant wiki page (or add one), add a line to
[`docs/wiki/index.md`](docs/wiki/index.md) if it's new, and append an entry to
[`docs/wiki/log.md`](docs/wiki/log.md). Treat this as part of finishing the work.

**Occasionally, or when asked, lint the wiki:** flag claims that no longer match
the code, contradictions, orphan pages, and gaps.

Conventions for pages (concise, interlinked, cite `file.ts:line`, mark unverified
claims with `⚠️ verify`) are in [`docs/wiki/README.md`](docs/wiki/README.md). The
code is always the source of truth; the wiki points into it.
