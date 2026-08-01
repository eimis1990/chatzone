# Demand Radar

Per-bot merchant view that turns unresolved shopper conversations into ranked,
evidence-backed store opportunities.

## Route and navigation

- Client route: `/app/bots/[botId]/demand-radar`; it accepts only 7/30/90-day
  ranges and uses the authenticated client guard (`app/(client)/app/bots/[botId]/demand-radar/page.tsx:6`).
- The desktop bot navigation registers the route alongside Analytics
  (`components/client/AppSidebar.tsx:28`); mobile exposes it through More
  (`app/(client)/app/more/page.tsx:40`).

## Demand read model

- The opportunity detector remains schema-free. The server-only DAL checks bot
  visibility through the signed-in Supabase client, then reads at most 1,000
  conversations and fetches their messages in parallel 150-id batches
  (`lib/data/demand-radar.ts:10`, `lib/data/demand-radar.ts:27`,
  `lib/data/demand-radar.ts:40`, `lib/data/demand-radar.ts:50`).
- Only the minimal bot DTO and aggregated radar snapshot cross the Server →
  Client boundary; visitor metadata and full bot configuration do not
  (`lib/data/demand-radar.ts:13`).
- A signal is unresolved when the conversation had a fallback, negative answer
  feedback, a 1–3 success score, or a product-intent question produced no
  product cards (`lib/demand-radar.ts:272`). Similar questions are clustered by
  normalized token overlap (`lib/demand-radar.ts:319`).
- Clusters are classified as product gaps, knowledge gaps, or store limitations;
  daily values dedupe the same issue within one conversation
  (`lib/demand-radar.ts:191`, `lib/demand-radar.ts:409`).
- Evidence removes email addresses and order numbers before display and is
  capped at 180 characters (`lib/demand-radar.ts:198`).

## Actions and safety

- Opportunity type chooses relevant actions from: fix product attributes, add
  an FAQ, improve a description, create a collection, add a synonym, notify
  merchandising, and publish a correction (`lib/demand-radar.ts:227`).
- `Save & apply plan` is a real authenticated Server Action. It validates the
  full payload, re-checks bot visibility through RLS, persists the evidence,
  selected actions, drafts, and per-action outcomes, and is idempotent by the
  client-generated plan UUID (`lib/actions/demand-radar.ts:25`,
  `lib/actions/demand-radar.ts:78`, `lib/actions/demand-radar.ts:93`).
- **Add an FAQ is functional:** approval creates a normal `qa`
  `knowledge_sources` row and runs the existing ingestion pipeline. It becomes
  grounded bot knowledge only when the source reaches `ready`
  (`lib/actions/demand-radar.ts:132`).
- **Add a missing synonym is functional:** approval upserts a bot-scoped rule.
  Every shared commerce search rewrites approved shopper phrases before the
  semantic or provider search path; longer phrases win, matching is
  case-insensitive/Unicode-aware, and lookup failure falls back to the original
  query (`lib/actions/demand-radar.ts:170`, `lib/products/search.ts:91`,
  `lib/products/synonyms.ts:16`, `lib/products/synonyms.ts:34`).
- Fix attributes, improve description, create collection, and notify
  merchandising are **persisted review tasks only**. They do not edit product
  data, create a provider collection, or send a notification
  (`lib/actions/demand-radar.ts:60`). The UI states this before approval and
  shows each result afterward (`components/bot-views/DemandRadarView.tsx:580`,
  `components/bot-views/DemandRadarView.tsx:729`).
- Store publishing is visibly disabled until a supported write-back connection
  and approval endpoint exist (`components/bot-views/DemandRadarView.tsx:617`).
  Do not imply that a saved task has modified the connected store.

## Persistence and access

- `demand_action_plans` stores the immutable opportunity context plus mutable
  execution status/results; `product_search_synonyms` stores unique normalized
  phrase mappings per bot (`supabase/migrations/20260801181149_demand_radar_action_plans.sql:5`,
  `supabase/migrations/20260801181149_demand_radar_action_plans.sql:38`).
- Both tables are live in the linked Supabase project. RLS combines platform
  owner and bot-organization membership into one policy per table; anonymous
  users have no table privileges, while authenticated/service roles receive
  only SELECT/INSERT/UPDATE/DELETE
  (`supabase/migrations/20260801182444_harden_demand_action_grants.sql:5`,
  `supabase/migrations/20260801182444_harden_demand_action_grants.sql:17`).
- Integration coverage proves org isolation, cross-org write rejection, and
  anonymous denial (`tests/integration/rls.test.ts:145`).

## UI behavior

- Desktop uses a trend/chart + metrics + ranked-table workspace with a sticky
  evidence/action panel (`components/bot-views/DemandRadarView.tsx:504`).
- Selecting a table row changes the detail panel; Enter and Space are supported
  (`components/bot-views/DemandRadarView.tsx:336`).
- The review dialog reveals editable FAQ/synonym fields only when selected,
  validates before submission, keeps the body independently scrollable on
  mobile, and leaves the action footer reachable
  (`components/bot-views/DemandRadarView.tsx:420`,
  `components/bot-views/DemandRadarView.tsx:628`).
- The header's persistent blue **How it works** control matches the adjacent
  40px bot selector. Its compact dialog leads with the product-editing safety
  boundary, then separates the three-step workflow from the current capability
  levels (active / review task / not yet). The body scrolls independently above
  a fixed close action (`components/bot-views/DemandRadarView.tsx:786`,
  `components/bot-views/DemandRadarView.tsx:891`).
- Empty periods link merchants back to Conversations and Knowledge with 44px
  action targets instead of displaying an empty chart
  (`components/bot-views/DemandRadarView.tsx:754`).

Related: [commerce](commerce.md), [rag-and-knowledge](rag-and-knowledge.md),
[messaging-channels](messaging-channels.md).

_Last verified: 2026-08-01 (commit d99f74a + working tree)._
