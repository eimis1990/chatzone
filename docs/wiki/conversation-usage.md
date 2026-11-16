# Conversation usage sessions

Text allowance counts successful automated **sessions**, separately from chat
history. A new unit starts after 24 hours without eligible AI interaction, or on
the first eligible interaction in a new UTC month. Web and Messenger use the
same resolver; visitor identities remain bot/channel scoped. Human-only
exchanges, preview, empty opens and future voice calls do not consume text units.
Voice retains its existing minute billing ([voice](voice.md)).

## Reservation and commit

`lib/conversation-sessions.ts:21` calls service-only Postgres functions in
`20261116090332_conversation_usage_sessions.sql:31`. The reservation locks the
organization row, counts committed + unexpired pending units plus purchased
credits, and holds a ten-minute lease before AI work. An already active session
can continue at quota. Concurrent work for the same pending session is busy.
Database errors fail closed; a failed read is never treated as zero usage.

- A generated text/card or grounded fallback commits the web session; failure
  before any delivered content releases it. Partial successful output counts
  (`lib/ai/commerce-tool.ts`, `app/api/chat/route.ts`). Explicit human requests
  bypass AI reservation, so eligible paid support remains available at quota.
- Messenger journals its reservation before work and Meta's returned message ID
  before accounting commit (`lib/channels/usage-delivery.ts:7`). Duplicate event
  IDs do not resend. A failed send releases the reservation; a confirmed send
  with failed accounting retains the journal for review. **Do not blindly
  replay failed events:** a network disconnect can leave external delivery
  uncertain. Inspect `channel_webhook_events` receipt/error and the usage row;
  repair accounting once if delivery is confirmed. The lease prevents a crash
  from consuming unconfirmed capacity indefinitely. This is an audited recovery
  path, not an automatic message outbox.
- Service-only tables are not directly accessible to anonymous/authenticated
  clients. Usage survives transcript/bot deletion; deleting an entire org
  cascades its ledger. Display totals use committed units only.

## Cutover and payments

The initial current-month baseline preserved 371 old conversation rows, including
historical voice rows; it did not retrospectively recalculate customer usage.
A compatibility trigger mirrors old writer inserts until deployment. New writers
mark `metadata.usage_v2=true`; future voice/preview inserts are excluded.

Top-ups add their actual purchased quantity for the UTC month payment succeeds.
Replay and tier changes cannot change that quantity/expiry. Warnings trigger at
80% of the effective base allowance plus credits, at most once per org/month
(`lib/usage.ts:58`). Free is 40/50; Basic is 320/400 before purchases.

Hosted Postgres testing admitted exactly one of twelve simultaneous requests at
399/400. SQL tests cover leases, duplicate/resumed sessions, month/inactivity
boundaries, failure release, credit capacity, deletion, voice exclusion and
handoff guards (`tests/integration/conversation-sessions-sql.test.ts:1`).

See [entitlements](plans-and-entitlements.md), [billing](stripe-billing.md), and
[release runbook](../superpowers/plans/2026-11-16-basic-plan-and-free-tier.md).

_Last verified: 2026-11-16._
