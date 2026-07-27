# Widget component library — provider folders + per-bot variants

Date: 2026-07-27 · Status: approved by owner

## Problem

The widget's rich chat components (product cards, order status, lead form,
room visualizer, …) are gated implicitly in code (`lib/commerce/capabilities.ts`)
with no visibility or control. The owner wants: provider "folders" showing which
components are available per provider, and — like prompt versions — per-bot
choice between component *variants* so clients aren't forced onto one look.

## Decisions

- **Versions are variants**: parallel alternatives coexisting in code (e.g.
  product-cards `default` / `compact`), not a linear timeline. Bots pick one.
- **Assignment is enforced at runtime**, layered on top of hard capabilities
  (folders can only narrow what code allows, never widen).
- **Core folder** for provider-independent components (lead form, room
  visualizer), alongside one folder per `CommerceProvider`.
- Client gets a **Components** page per bot: assigned components rendered live,
  "Change" opens a variant drawer with rendered previews. No preview/live split
  — seeing the render is the test.

## Three layers

1. **Registry (code)** — `lib/widget-components/registry.tsx`: entries
   `{ key, name, description, core?, variants: [{ id, name, description, preview }] }`.
   New component/variant = code change; appears in all screens automatically.
   Initial: product-cards (default + compact), order-status, lead-form,
   room-visualizer.
2. **Provider folders (DB)** — `provider_components (provider, component_key)`,
   unique pair, owner-only RLS; `provider` ∈ CommerceProvider ∪ 'core'
   (validated in app — folders derive from the code union, auto-appearing for
   new providers).
3. **Bot variant choice (config)** — `config.components?: Record<key, variantId>`,
   client-editable; unknown key/variant falls back to the first variant.

## Screens

- **Owner `/owner/components`** (sidebar: Versioning → Components): grid of
  provider folders (Uiverse folder hover design, brand colors) with assigned
  counts → folder page `/owner/components/[provider]`: grid of assigned
  components rendered from registry previews + remove; "Add components" card →
  right-side drawer, unassigned components rendered in a grid, multi-select.
- **Client `/app/bots/[botId]/components`** (+ sidebar section; owner twin
  route under `/owner/clients/[orgId]/bots/[botId]/components`): components
  assigned to the bot's provider (+ Core), rendered with the current variant,
  Change → variant drawer → saves `config.components` via a dedicated action
  that validates key/variant against registry + availability.

## Runtime enforcement

- `lib/widget-components/availability.ts` — assigned set for a provider
  (provider rows + core rows, service client).
- Chat routes: `product-cards` unassigned → response stays text-only (suppress
  products chunk); `order-status` unassigned → order-lookup tool not offered.
- Widget-config route: `room-visualizer` / `lead-form` unassigned → stripped
  from the public config (existing plan/quota gates still apply first).
- Widget rendering: MessageList/ChatWindow pick the variant from
  `config.components` (flows through PublicBotConfig).

## Migration / backfill

`provider_components` + backfill of today's implicit reality so nothing turns
off: product-cards → all five providers; order-status → woocommerce + magento;
lead-form + room-visualizer → core. Existing bots render exactly as before with
variant `default`.

## Skipped deliberately

Per-bot availability overrides, variant analytics, drag-and-drop between
folders, preview/live split for variants.
