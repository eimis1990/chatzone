# Order lookup quick action — design

**Goal:** a welcome-screen quick action ("Track your order") that opens a small
two-field form (order number + email) in the widget; a successful lookup appends
the existing `OrderStatusCard` as an assistant message in the chat.

## Why fixed fields

Every provider with order lookup (WooCommerce, Magento) takes exactly
`{ orderId, email }` (`lib/commerce/types.ts` `OrderLookupParams`). A field
builder would let clients add fields the backend cannot use. No builder.

## Config

- `SuggestedQuestionAction` gains `'order'` (`lib/types.ts`,
  `lib/validation/schemas.ts`, `sqAction`/`sqMode` in `lib/widget-config.ts`).
- `ConfigForm` quick-action editor: new mode "Track an order", disabled with a
  hint unless `orderLookupEnabled(commerce)` (mirrors the lead option).
- `PublicBotConfig` exposes `orderLookup: boolean` so the widget hides the
  action if credentials are removed later.
- No new title/label/color fields. Built-in EN/LT strings.

## Widget

- `components/widget/OrderLookupForm.tsx`: order number, email, "Track order"
  button, dismiss, inline error. Rendered in the lead-form slot in `ChatWindow`,
  mutually exclusive with the lead form.
- Theme: background = `theme.backgroundColor`, 1px `bubbleBorderColor` border,
  radius = `bubbleRadius`, button = `primaryColor` with `readableTextColor`.
- Submit → `transport.lookupOrder` (existing `/api/widget/order`, origin-checked
  + rate-limited; preview transport hits `/api/preview/order`).
  - found → append assistant message `{ content: '', order }`, close form.
  - not found → inline error, form stays open.
  - request failure → inline "temporarily unavailable".
- `OrderStatusCard` gets `backgroundColor` + `borderColor` props so the card
  matches the widget theme instead of hardcoded white/gray.

## Not doing

- Model-triggered form open (lead-tool pattern) — add when asked.
- Persisting `order` on the assistant message row (transcript replay) — separate fix.

## Tests

- `tests/unit/quick-actions.test.ts`: `'order'` mode recognised; schema accepts it.
- `tests/unit/order-lookup-form.test.tsx`: found → onFound called; not found → error shown.
