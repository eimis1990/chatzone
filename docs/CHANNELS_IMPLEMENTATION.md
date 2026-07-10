# Channels implementation plan

This document is the implementation checklist for adding paid external messaging
channels to Loqara. Start with Facebook Messenger, prove the shared architecture,
then add Instagram and WhatsApp through provider adapters.

## Recommended Messenger v1 scope

- One paid Messenger connection connects one Facebook Page to one chatbot.
- Charge €19/month per connected Page. Use a Stripe subscription-item quantity
  if an organization connects multiple Pages.
- Support inbound and outbound text messages, AI replies, conversation history,
  and human takeover from the existing Inbox.
- Show connection health, pause, reconnect, and disconnect controls.
- Defer broadcasts, campaigns, attachments, reactions, rich templates, and
  product cards until the text workflow is reliable.

Messenger conversations must be initiated by the visitor. A normal response
must be sent within Meta's standard 24-hour messaging window. Do not build v1
around promotional or unsolicited messages.

## Client experience

### Subscription and connection states

The Channels screen should distinguish these states clearly:

1. **Locked** — the organization has not purchased the Messenger add-on.
2. **Ready to connect** — paid, but no Facebook Page is connected.
3. **Connecting** — authorization or setup is in progress.
4. **Active** — Page, permissions, webhook, and chatbot are healthy.
5. **Paused** — connected but automated responses are disabled.
6. **Action required** — permissions were revoked, the token is invalid, or the
   webhook subscription needs repair.

### Connection wizard

1. Client selects **Add Messenger**.
2. Confirm €19/month, one Facebook Page connection, proration, and cancellation.
3. Add the Stripe subscription item.
4. Return directly to `/app/channels/messenger/connect`, not the generic billing
   screen.
5. Client selects **Continue with Facebook**.
6. Facebook Login for Business asks the Page administrator to choose a Page and
   grant the required permissions.
7. Back in Loqara, the client chooses which chatbot should answer that Page.
8. Loqara automatically verifies the token, permissions, webhook subscription,
   chatbot status, and billing entitlement.
9. Show the connected Page name/avatar, selected chatbot, connection status,
   test instructions, and a link to open Messenger.

Never ask the client to copy Page IDs, access tokens, app secrets, webhook
secrets, or callback URLs manually.

## Meta preparation

Before offering Messenger to customers:

- Register and configure the Loqara Meta app.
- Add Messenger and Facebook Login for Business.
- Configure the production privacy policy, data-deletion instructions, domains,
  OAuth redirect URLs, and webhook callback.
- Implement and test Standard Access with a Loqara-owned Facebook Page.
- Request the permissions required by the current Messenger documentation. At
  the time this plan was written, Meta lists `pages_show_list`,
  `pages_manage_metadata`, `pages_messaging`, `pages_read_engagement`, and
  `business_management`.
- Complete Business Verification and request Advanced Access/App Review before
  connecting Pages owned by external clients.
- Record the App Review walkthrough showing the Page administrator selecting a
  Page, granting permissions, receiving a message, getting an automated reply,
  and using human takeover.

Re-check Meta's requirements immediately before implementation and submission:

- [Messenger Platform overview](https://developers.facebook.com/docs/messenger-platform/overview)
- [Messenger Platform API collection](https://www.postman.com/meta/messenger-platform-api/documentation/iyp204x/messenger-platform-api)

## Architecture

```text
Messenger visitor
    -> Meta webhook
    -> verify + deduplicate event
    -> resolve Page connection and chatbot
    -> save inbound conversation/message
    -> shared Loqara message processor
    -> Messenger provider adapter / Send API
    -> save outbound result

Loqara Inbox
    -> human reply
    -> shared outbound provider adapter
    -> Messenger visitor
```

Do not call the public widget HTTP endpoint internally or duplicate its AI
logic. Extract a channel-independent message processor from `app/api/chat/route.ts`
and let both the web widget and Messenger call it.

Suggested interface:

```ts
processIncomingMessage({
  bot,
  channel,
  externalUserId,
  conversationId,
  message,
})
```

Create a small provider boundary from the beginning:

```ts
interface ChannelProvider {
  sendText(input: SendTextInput): Promise<SendResult>
  markSeen?(input: RecipientInput): Promise<void>
  startTyping?(input: RecipientInput): Promise<void>
  stopTyping?(input: RecipientInput): Promise<void>
}
```

Messenger implements this first. Instagram and WhatsApp can implement the same
Loqara-facing contract later without forcing provider details into the AI or
Inbox code.

## Database changes

Create migrations rather than storing channel credentials in `bots.config`.
Every new public table needs explicit RLS, grants, indexes, and membership-based
policies.

### `channel_connections`

Suggested columns:

- `id`
- `org_id`
- `bot_id`
- `provider` (`messenger` initially)
- `external_account_id` (Facebook Page ID)
- `display_name`
- `avatar_url`
- encrypted Page access token or server-side secret reference
- granted scopes
- `status` (`connecting`, `active`, `paused`, `action_required`, `disconnected`)
- `token_expires_at`
- `last_health_check_at`
- `last_error_code` and a safe, non-secret error summary
- timestamps

Add a unique constraint on `(provider, external_account_id)` so the same Page
cannot be connected to multiple organizations accidentally.

### `channel_contacts`

- `channel_connection_id`
- provider-scoped user ID (Messenger Page-scoped ID)
- optional display/profile metadata
- first/last-seen timestamps

Use a unique constraint on `(channel_connection_id, external_user_id)`.

### `channel_webhook_events`

- connection/provider identifiers
- provider event or message ID
- processing status and attempt count
- received/processed timestamps
- minimal payload or encrypted payload where troubleshooting requires it
- safe error details

This table provides idempotency, retries, and an operational audit trail. Set a
short retention period for raw webhook payloads.

### Existing conversation changes

- Extend `ConversationChannel` and the database constraint with `messenger`.
- Add `channel_connection_id` to `conversations`.
- Treat provider thread/message identifiers as connection-scoped. Replace any
  globally unique `external_id` assumption with a composite uniqueness rule.
- Add channel/Page labels to conversation and Inbox queries.

## Billing and entitlement

Reuse the Voice add-on pattern in `lib/stripe/manage.ts`, `lib/stripe/sync.ts`,
and the subscription page server actions.

1. Create the recurring Messenger price in Stripe.
2. Add its price ID to validated server environment configuration.
3. Add/update the subscription item with proration.
4. If multiple Pages are permitted, keep its quantity equal to the number of
   billable active connections.
5. Mirror the entitlement/quantity into the organization during Stripe webhook
   synchronization.
6. Reconcile from Stripe on return from Checkout so the UI unlocks immediately.
7. Verify entitlement server-side when connecting a Page and when processing
   inbound/outbound events. UI locking alone is not authorization.
8. Define cancellation behavior explicitly: pause delivery immediately or at
   period end, then retain the disconnected record without retaining an active
   access token longer than necessary.

## OAuth and connection flow

1. Start OAuth from an authenticated server action/route scoped to the client's
   organization.
2. Create a signed, short-lived `state` value containing the organization,
   initiating user, intended chatbot, and nonce.
3. Redirect to Facebook Login for Business.
4. Validate `state` on callback and exchange the authorization code server-side.
5. Fetch only Pages the user can administer and let the client select one when
   several are available.
6. Obtain the Page access token and required Page metadata.
7. Encrypt the token before persistence; never expose it to browser code or
   logs.
8. Subscribe the Page/app to the required webhook fields.
9. Run the health check and activate the connection transactionally.
10. On failure, keep a recoverable `action_required` connection and show a
    plain-language next step.

## Webhook processing

Create a Node.js route for Meta verification and events.

### Verification request

- Validate Meta's verification token.
- Return the supplied challenge exactly when valid.
- Reject invalid verification attempts.

### Event request

1. Read the raw request body before parsing.
2. Validate Meta's webhook signature with the app secret using a timing-safe
   comparison.
3. Reject invalid signatures.
4. Persist/deduplicate the provider event.
5. Acknowledge Meta quickly; process expensive AI work asynchronously where the
   deployment/runtime permits it.
6. Resolve the Page ID to an active, paid `channel_connection`.
7. Ignore echo, delivery, read, and unsupported events unless their state is
   intentionally handled.
8. Find or create the channel contact and conversation.
9. Save the inbound message before invoking AI.
10. Apply usage limits, retrieval, fallback, commerce tools, and handoff through
    the shared message processor.
11. Send `mark_seen`/typing indicators where appropriate.
12. Send the response through the Messenger adapter and persist its provider
    message ID/delivery result.
13. Retry transient failures with backoff; do not retry permanent permission or
    reply-window failures blindly.

## Inbox and human takeover

The existing Inbox server actions currently persist a human message locally.
For external channels, the same action must also send through the channel
provider.

Add:

- Messenger badge and connected Page name.
- Visitor name/avatar where permission and policy allow it.
- Sent, delivered, and failed state.
- Standard reply-window status and clear disabled/error states outside it.
- AI/human ownership state.
- Provider errors translated into actionable client language.
- A safe send sequence that avoids showing a locally successful human reply
  when Meta rejected delivery.

Keep Loqara's existing handoff behavior: while a conversation is requested or
live, persist visitor messages but do not generate automatic bot replies.

## Security and privacy checklist

- Keep the Meta app secret and Page access tokens server-only.
- Encrypt stored access tokens or use a managed secret store.
- Never place tokens in `bots.config`, client props, analytics, error reporting,
  or logs.
- Validate webhook signatures using the raw body.
- Protect OAuth against CSRF with signed state and a nonce.
- Apply RLS to every channel table and verify organization ownership in server
  actions.
- Collect only profile data needed for support.
- Include channel data in account export, retention, and deletion workflows.
- Document Meta as a subprocessor/data recipient where legally required.
- Delete or invalidate credentials on disconnect and organization deletion.
- Add an incident path for leaked/revoked tokens.

## Reliability and observability

- Deduplicate webhook deliveries.
- Record safe processing states and retry counts.
- Retry transient Graph API/network failures with bounded exponential backoff.
- Run periodic connection health checks.
- Notify the client when permissions are revoked or reconnection is required.
- Add owner diagnostics for Page, bot, entitlement, scopes, last event, last
  successful send, and safe last error.
- Track received, answered, failed, handed-off, response-time, and reconnect
  metrics by provider.
- Alert on webhook error rate, processing backlog, repeated auth errors, and
  send failures.

## Testing checklist

### Unit tests

- OAuth state signing/validation and replay prevention.
- Signature validation with valid, invalid, and malformed headers.
- Webhook parsing, echoes, unsupported events, and missing fields.
- Event idempotency and concurrent duplicate delivery.
- Connection-scoped external IDs.
- Provider error classification and retry policy.
- Entitlement/quantity enforcement.
- 24-hour reply-window UI and send behavior.

### Integration tests

- Inbound webhook -> conversation/message persistence -> AI -> outbound send.
- Existing conversation continuation.
- Human takeover and return to bot.
- Revoked permissions and reconnect.
- Subscription added, quantity changed, canceled, and webhook delayed.
- Disconnect and organization deletion cleanup.

### Manual pilot

- Connect a Loqara-owned Page with Standard Access.
- Test desktop/mobile Messenger and Facebook Page Inbox coexistence.
- Test duplicate webhooks, delayed events, rapid messages, Unicode, links, and
  long responses.
- Pilot with two or three cooperative clients after Advanced Access is granted.

## Recommended delivery order

1. Build a Loqara-owned Page technical spike: inbound text -> fixed reply.
2. Add outbound adapter, signature verification, and idempotent storage.
3. Extract and connect the shared AI message processor.
4. Store Messenger conversations in the existing transcript system.
5. Extend Inbox human takeover and external delivery.
6. Build OAuth/Page selection and connection health UI.
7. Add Stripe entitlement and quantity synchronization.
8. Complete privacy/export/deletion and operational diagnostics.
9. Run the end-to-end test matrix.
10. Submit Meta App Review/Business Verification.
11. Run a limited client pilot, address real-world permission and delivery
    failures, then release generally.

## Definition of done for Messenger v1

- A subscribed external client can connect a Page without copying credentials.
- A visitor message creates or continues the correct Loqara conversation.
- The selected chatbot answers using the same grounded pipeline as the widget.
- Replies reach Messenger and delivery failures are visible/recoverable.
- A team member can take over and reply from the Loqara Inbox.
- Duplicate events do not create duplicate messages or replies.
- Expired/revoked access becomes `action_required` with a reconnect path.
- Billing, permissions, RLS, retention, export, and deletion are enforced
  server-side.
- Monitoring is sufficient to diagnose a client report without viewing secrets.

## Rough effort

- Loqara-owned Page prototype: approximately 5–8 engineering days.
- Reliable client-facing Messenger MVP: approximately 3–5 engineering weeks.
- Meta review and Business Verification are external and should not be included
  in a promised engineering delivery date.

These estimates assume the current Stripe add-on, conversation/message, AI,
handoff, and Inbox foundations remain available.
