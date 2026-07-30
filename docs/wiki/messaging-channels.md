# Messaging channels

## Product state

- The paid Channels card is still disabled and marked **Coming soon**
  (`components/client/BillingPanel.tsx:513`).
- The Meta webhook route is LIVE in production
  (`app/api/channels/meta/webhook/route.ts`): GET verify handshake, timing-safe
  signature validation (`lib/channels/meta.ts`), fixed-reply spike from the
  env Page token (`META_APP_SECRET` / `META_WEBHOOK_VERIFY_TOKEN` /
  `META_PAGE_ACCESS_TOKEN`). No connection tables, OAuth routes, or Inbox
  delivery yet. Architecture and delivery order live in
  [`../CHANNELS_IMPLEMENTATION.md`](../CHANNELS_IMPLEMENTATION.md).
- The shared v1 boundary is one external Page/account connected to one bot.
  Prove Messenger first, then reuse the adapter boundary for Instagram and
  WhatsApp (`docs/CHANNELS_IMPLEMENTATION.md:3-16`,
  `docs/CHANNELS_IMPLEMENTATION.md:124-126`).

## Meta app state (checked 2026-07-30)

- Meta app **Loqara** exists with Messenger and Instagram use cases; it is
  unpublished and not yet attached to a Loqara Business Portfolio.
- **Loqara app_id: `2452581401910162`** (dev_mode, category ALL, created
  2026-07-30). Audited via the Meta DevTools MCP
  (`https://mcp.facebook.com/devtools`, registered in local Claude config as
  `meta_developer_tools`; OAuth expires per client restart — re-auth via
  `/mcp`). Findings: App Review `NO_SUBMISSION`, zero approved privileges;
  compliance `compliant`, no violations; **zero webhook subscriptions**;
  contact email `hello@loqara.com` is **unverified**; privacy/terms/data-
  deletion URLs all null; no app icon, no OAuth redirect URIs, no app domains.
- Webhook wiring for v1: `page` topic (fields `messages`,
  `messaging_postbacks`, `messaging_optins`, `messaging_referrals`,
  `message_deliveries`, `message_reads`) and `instagram` topic (fields
  `messages`, `messaging_postbacks`, `messaging_seen`). The MCP's
  `devtools_webhook_manage`/`devtools_webhook_test` can subscribe and send
  test payloads once a live HTTPS callback URL exists.
- Messenger has testing access for `business_management`,
  `pages_manage_metadata`, `pages_messaging`, and `pages_show_list`.
  `pages_read_engagement` is not added yet. App-level `page` webhook is
  subscribed (fields `messages`, `messaging_postbacks`) to
  `https://www.loqara.com/api/channels/meta/webhook`, and the Loqara-owned
  test Page is connected with a generated Page token and page-level
  `subscribed_apps`. Gotcha: `POST /me/subscribed_apps` succeeds with the
  dashboard-generated Page token but the GET read-back needs
  `pages_manage_metadata` on the user grant.
- Instagram is using the **Instagram Login** setup path. Its checklist still
  needs `instagram_business_basic`, `instagram_business_manage_comments`, and
  `instagram_business_manage_messages`, plus a tester account, webhook, and
  business-login configuration.
- App-level publish blockers: privacy-policy URL is blank; Terms and
  user-data-deletion URLs still contain placeholder Facebook URLs; app domain,
  icon, and category are unset. The existing Loqara legal pages are
  `app/privacy/page.tsx` and `app/terms/page.tsx`, but privacy copy does not yet
  describe Meta/social-message processing (`app/privacy/page.tsx:23-28`).
- External client assets require the production approval path: Loqara Business
  Portfolio, Business Verification, Tech Provider/access verification, Advanced
  Access/App Review, then publish. Testing before that is limited to app roles
  and Loqara-owned/test assets.
- Business Portfolio creation is temporarily blocked by Meta's account limit.
  Three old portfolios were scheduled for deletion on 2026-07-30; retry after
  the 24-hour deletion window. One remaining portfolio cannot be deleted while
  it owns a Pixel.

## Critical path

1. Build the Loqara-owned Messenger spike and public webhook endpoint.
2. Add signed OAuth, encrypted token storage, connection health, idempotency,
   the shared AI processor, and Inbox outbound delivery.
3. Complete Meta app URLs/settings and connect Loqara-owned test assets.
4. Add the Instagram adapter/login path against the same connection model.
5. Finish billing, retention/export/deletion, diagnostics, and review evidence.
6. Complete Meta verification/App Review and run a limited external-client
   pilot.

Keep the 24-hour user-initiated Messenger rule and server-side entitlement
checks from `docs/CHANNELS_IMPLEMENTATION.md:18-20` and
`docs/CHANNELS_IMPLEMENTATION.md:185-202`.

_Last verified: 2026-07-30 (ff4a0a9)._
