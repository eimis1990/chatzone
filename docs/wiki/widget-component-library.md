# Widget component library

Provider-scoped availability + per-bot variants for the widget's rich chat
components. Shipped 2026-07-27 (spec:
`docs/superpowers/specs/2026-07-27-component-library-design.md`).

## Three layers

1. **Registry (code)** — `lib/widget-components/meta.ts` (server-safe metadata)
   + `lib/widget-components/registry.tsx` (`'use client'` rendered previews,
   keyed `${componentKey}:${variantId}` — the two files MUST stay in sync).
   Components: product-cards (default + compact), order-status, lead-form,
   room-visualizer. Variants are parallel alternatives, not a timeline.
2. **Provider folders (DB)** — `provider_components (provider, component_key)`,
   migration `20260727150000` (applied to prod, backfilled to match the old
   implicit gating). `provider` ∈ `CommerceProvider` ∪ `'core'`; folder list
   derives from `lib/widget-components/folders.ts`, whose `satisfies
   Record<CommerceProvider, string>` makes a new provider a compile error until
   labeled — that's how folders "auto-create".
3. **Bot variant choice** — `config.components: Record<key, variantId>`;
   unknown ids fall back to the first variant (`variantIdFor`).

## Enforcement (narrows code capabilities, never widens)

- `assignedComponents(svc, provider)` (`lib/widget-components/availability.ts`)
  merges the provider folder + core. **Fails open** on read errors so a DB
  hiccup can't strip live widgets.
- `/api/chat` + `/api/preview/chat`: no `product-cards` → `suppressProducts`
  (text-only reply, tools still run); no `order-status` → order tool not
  offered (`makeProductTools` last param); no `lead-form` → fallback-trigger
  header suppressed.
- `/api/widget-config`: strips `roomVisualizer` / disables `leadCapture` when
  unassigned; passes `config.components` through to `PublicBotConfig`.
- Rendering: `MessageList` `componentVariants` prop picks the product-cards
  variant (`ProductCards variant="compact"`).

## Screens

- Owner: `/owner/components` (Versioning → Components) — Uiverse folder cards
  (`components/owner/ProviderFolders.tsx`) → `/owner/components/[provider]`
  grid + add-drawer (`FolderComponentsView.tsx`).
- Per bot: client `/app/bots/[botId]/components` + owner twin
  `/owner/clients/[orgId]/bots/[botId]/components` (tab in OwnerBotTabs), both
  rendering `BotComponentsView` → variant drawer →
  `setComponentVariant` (`lib/actions/component-variants.ts`; RLS for clients,
  service for owner, validates availability).

## Gotchas

- Adding a variant: implement it in the widget component, add meta.ts entry,
  add a `key:variant` preview in registry.tsx, AND (if it needs render-time
  switching) extend the variant pick in `MessageList.tsx` — the pick is
  per-component, not generic.
- Previews render real widget components with sample data
  (`pointer-events-none` wrappers); LeadForm/RoomTray need noop handlers.

_Last verified: 2026-07-27._
