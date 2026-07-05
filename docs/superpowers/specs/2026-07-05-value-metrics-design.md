# Proof-of-value analytics — design

**Date:** 2026-07-05 · **Status:** implemented

## Problem

Analytics showed activity (conversations, messages) but not *value*. Product
cards and answer links opened `target="_blank"` with no record, so the most
persuasive numbers for clients — "visitors clicked products the bot suggested,
worth €X" — didn't exist. Multi-bot orgs also had no side-by-side view.

## Decision

One `widget_events` table + one public endpoint, everything else computed at
query time from existing tables (matching the codebase's table-driven
analytics style; no rollup tables until query-time aggregation gets slow).

### Data

`widget_events` (migration `0035_widget_events.sql`, applied 2026-07-05):
`id, bot_id → bots, conversation_id → conversations (set null), message_id →
messages (set null), type (check: product_click | link_click |
suggested_question_click | widget_open), payload jsonb, created_at`.
Indexes on `(bot_id, created_at)` and `(bot_id, type, created_at)`. RLS:
`owner_all` + `member_select` via `bot_org_id`/`auth_org_ids` (same as
`leads`); inserts only via service role. `payload` snapshots the clicked
product (title/price/url) so metrics survive catalog changes.

### API

`POST /api/events` — public, modeled on `/api/feedback`: bot by `public_key`,
`isOriginAllowed` against `config.allowedDomains`, token-bucket rate limit
(30 cap / 2 per sec per bot), zod payload with size caps, conversation must
belong to the bot when provided.

### Widget

`ChatTransport.trackEvent?()` — optional so the configurator preview no-ops
and never pollutes real metrics. Live implementation uses `sendBeacon`
(keepalive-fetch fallback); tracking never delays or breaks navigation.
Hooks: product card/row links (`ProductCards`), delegated click on rendered
markdown (`.loqara-md`) + quick-action link buttons (`MessageList`),
`handleQuickAction` (suggested questions), `EmbedShell` mount (`widget_open`
— accurate because widget.js lazy-creates the iframe on first launcher click).
Only synced UUID message ids are sent.

### Dashboards

Per-bot (`AnalyticsSection`): product clicks + CTR (impressions =
`messages.products`, already stored), assisted value € (tolerant price parser
over clicked payloads, labeled estimate), link clicks, widget opens with
open→conversation %, after-hours share + hour histogram (from
`conversations.started_at` — works retroactively), top clicked products next
to top suggested. CSV export extended.

Org rollup (`/app/analytics`, sidebar "Analytics"): one row per bot —
conversations, leads, opens, product clicks, assisted value, link clicks,
after-hours %. Links into each bot's deep-dive.

### Known simplifications

- Business hours fixed Mon–Fri 9–18 Europe/Vilnius; per-org config when asked.
- Funnel top (widget *loads*) not tracked — high volume, bot-noise-prone.
- Prices parsed from display strings (no numeric price exists in the system).
- Rollup omits CSAT/fallback (needs per-bot message scans; per-bot page has them).

### Tests

`tests/unit/value-metrics.test.ts` — price parser (LT/EN formats, thousands
vs decimals, junk → null) and after-hours (weekday/evening/weekend, DST).
Endpoint smoke-tested live (accept/persist/reject) with rows cleaned up after.
