# Messaging channels

## Product state

- Subscription shows one card per channel; all three read **Coming soon**.
  Messenger is fully built but its card stays disabled because the Meta app is
  `dev_mode`/`is_live: false` — Facebook Login only works for people holding a
  role on the Meta app, so a real client clicking Connect would hit a Facebook
  error. Helper copy says "Waiting on Facebook app approval". Flip that card to
  `status="available"` + a Link to `/app/channels/messenger/connect` (plus the
  billing entitlement) once the app is published. ⚠️ Never label a paid add-on
  free — the €19/month price stands.
- The connect page stays reachable by URL while the card is disabled:
  `/app/channels/messenger/connect` (breadcrumb back to Subscription).
- Messenger AI replies are LIVE in production (verified end-to-end
  2026-07-30): `app/api/channels/meta/webhook/route.ts` verifies signatures
  (`lib/channels/meta.ts`), dedupes by message id via
  `channel_webhook_events`, resolves the Page through `channel_connections`,
  persists contacts/conversations/messages (`channel='messenger'`), and
  answers via `lib/channels/processor.ts` — the widget's grounding pipeline
  without streaming/commerce/handoff-escalation. Migration
  `20260730220000_channel_connections.sql` (service-role-only RLS).
- Inbox ⇄ Messenger loop is wired (2026-07-31): handoff intent escalates from
  the Messenger path (`lib/channels/processor.ts`), agent replies deliver via
  `lib/channels/outbound.ts` — Meta send happens BEFORE the local insert, so a
  rejected reply (24h window, dead token) surfaces as a toast + restored draft
  instead of a phantom sent message. Both inbox surfaces share
  `deliverAgentMessage`; Messenger badges in Inbox + Conversations views.
- OAuth connect flow shipped 2026-08-20: signed HMAC state (org+user+bot+
  nonce+10-min exp), code exchange → long-lived user token in an encrypted
  httpOnly cookie, Page + bot selection, page tokens AES-256-GCM encrypted into
  `access_token_cipher` (`CHANNEL_TOKEN_KEY`), auto page-subscribe, and a
  one-Page-one-org guard (`lib/channels/oauth.ts`, `lib/channels/crypto.ts`).
  Webhook and Inbox outbound resolve tokens per connection
  (`connectionPageToken`), falling back to the env token for the legacy spike row.
- Still missing: billing entitlement/quantity sync, connection health checks and
  the paused/action-required UI, abuse guard on the Messenger path. Delivery
  order lives in [`../CHANNELS_IMPLEMENTATION.md`](../CHANNELS_IMPLEMENTATION.md).
- The shared v1 boundary is one external Page/account connected to one bot.
  Prove Messenger first, then reuse the adapter boundary for Instagram and
  WhatsApp (`docs/CHANNELS_IMPLEMENTATION.md:3-16`,
  `docs/CHANNELS_IMPLEMENTATION.md:124-126`).
- The Subscription add-on grid gives every channel its own card illustration:
  Messenger uses the blue lightning chat mark, Instagram the gradient camera
  mark, and WhatsApp the green phone bubble (`components/client/BillingPanel.tsx:812-856`,
  `public/addons/fox-addon-{messenger-v2,instagram-v2,whatsapp}.webp`). Keep new
  channel art in the same 1000×1000 fox-doodle system rather than sharing a
  generic messaging image.

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
- Production approval path (2026-07-31 state): **Loqara Business** portfolio
  created (ID `1577119393903065`), Loqara Page added to it, app attached to the
  portfolio, and the app is irreversibly designated a **Tech Provider**
  (required to serve client Pages; adds Business verification → Access
  verification → App Review gates before publish). `pages_read_engagement`
  added — all five Messenger permissions now "Ready for testing".
- Remaining before external clients — the gate is now COMPANY REGISTRATION:
  Loqara has no legal entity yet (owner plans an MB/UAB later), and Meta's
  Business Verification requires registration documents. Chain: register
  MB/UAB → Business Verification → Access verification (~5-day Meta review) →
  App Review with screencast → publish. Start registration a few weeks before
  wanting paying channel clients. Contact-email verification is NOT currently
  a Meta required action (checked 2026-07-31) — it only blocks publish;
  hello@loqara.com had received nothing (check spam/ImprovMX log before
  re-triggering). Dev on Loqara-owned assets is unaffected.

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
