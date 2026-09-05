# Meta App Review — submission pack (Messenger v1)

Prepared 2026-08-22. Access verification: ✅ verified. Business verification: ✅.
Submit at App Dashboard → Review → App Review.

## Audit — 2026-09-05

- Meta submission `2453576515143984`: Verification and App settings show 100%;
  Allowed usage, Data handling, and Reviewer instructions show 0%. Not submitted.
- Requested permissions match the five below; `pages_read_engagement` is absent
  from the submission, but remains in `OAUTH_SCOPES` and connection scope metadata.
  Actual login uses Business Login configuration `981649717756252`, so inspect
  that configuration before changing the requested permissions or fallback code.
- Localhost 3IMIS dry run: Subscription → Connect Messenger → Facebook existing
  grant → Loqara Page list succeeds. Connect Page with Chatfox fails with
  `page_taken`: the Page belongs to another organization. Resolve the account
  mismatch before filming; do not remove the cross-organization guard.
  **Resolved with owner authorization:** moved the existing connection to 3IMIS /
  Chatfox, then completed Connect Page through the UI. Verified active status and
  non-null encrypted token; the original conversation stays on the Loqara bot.
- Live dry run now passed: customer question → AI reply; human request →
  acknowledgement and Needs human Inbox entry; Take over → staff reply delivered
  in Messenger; Resolve → subsequent customer question receives an AI reply.
  This was verification, not a recorded screencast.
- Meta marks `pages_manage_metadata` and `pages_messaging` API testing Completed.
- Recording walkthrough confirmed Business Login still requests “Read content
  posted on the Page,” alongside messaging, metadata, Page list, and business
  access. Reconcile this with the missing `pages_read_engagement` request.
- Messenger review form explicitly asks for a real Facebook account with the
  Tester role; App Roles-generated test users cannot receive bot messages.
  Keep this distinct from the dedicated Loqara portal reviewer login.
- Native computer control remained unavailable after permission/reset attempts.
  The owner started macOS recording manually; the complete browser walkthrough
  was repeated during that recording. The saved video has not yet been located
  or inspected, so no video has been uploaded.
- The Messenger card is enabled locally because development bypasses the channel
  entitlement gate. 3IMIS has no production Messenger entitlement; arrange a
  dedicated hosted reviewer account before supplying access instructions.
- The `business_management` rationale needs validation: current page listing
  calls `/me/accounts`, with no separate Business Manager asset discovery call.
  Verify why the configured grant needs it rather than treating portfolio
  ownership alone as demonstrated API usage.
- Reviewer access must use a reachable hosted URL, with a dedicated test login
  and appropriate channel entitlement. Localhost is not a reviewer access URL.
- The sequence below remains a proposed shot list; replace its timestamps after
  inspecting the actual recording. The live walkthrough included OAuth details,
  successful Page connection, customer question/AI reply, staff takeover and reply
  delivery, and bot resumption. Mask unrelated Messenger chat-list content before
  uploading. Do not alter or fabricate the demonstrated results.
- Saved draft explanations for pages_show_list, pages_manage_metadata, and
  pages_messaging in Meta; Loqara is selected as the review Page (confirmed on
  reopening the messaging dialog). Video, reviewer access, data handling, and
  allowed-usage confirmations remain incomplete. Nothing submitted.
- Corrected the data-handling guidance below: disconnect preserves transcripts;
  AI processing involves subprocessors.

## Before submitting

- Remove `pages_read_engagement` from the request list (trash icon). Nothing in
  the codebase calls an API that needs it, so its usage pre-check would show
  zero calls. Re-request later if we ever read Page content/followers.
- Permissions to submit: `pages_show_list`, `pages_messaging`,
  `pages_manage_metadata`, `business_management`, `public_profile`.
- Designate the **Loqara** Facebook Page (id 1271781096017184) wherever the
  form asks for a test Page for `pages_messaging`.
- Create a reviewer login for the Loqara app portal (a client-role user in a
  clean org with the Loqara bot duplicated) and put the credentials in the
  form's reviewer-instructions field. Never reuse a real client org.

## Per-permission use-case descriptions

Draft descriptions only. Replace proposed timestamps with actual timings after recording; do not submit unrecorded steps as evidence.

### pages_show_list

> Loqara gives online stores an AI assistant that answers their customers'
> questions using the store's own content. When a store owner connects
> Facebook Messenger to Loqara, we show them a list of the Facebook Pages
> they manage so they can choose which Page to connect (shown at 0:45 in the
> screencast). We use pages_show_list only to display that selection list
> during setup and to show the connected Page's name and picture afterwards.

### pages_messaging

> After a store owner connects their Facebook Page, people who message that
> Page get an automatic answer written from the store's own content (FAQs,
> product and website information). The store's staff can also read those
> conversations in Loqara and reply personally instead of the assistant. We
> use pages_messaging to receive the Page's incoming messages and to send
> replies. Replies are only ever responses to a person who messaged the Page
> first, within Meta's standard messaging window — we do not send promotional
> or unsolicited messages. Shown from 1:20 in the screencast: a customer
> messages the Page and receives an answer; at 2:10 a staff member takes over
> and replies from Loqara's inbox.

### pages_manage_metadata

> When a store owner connects their Facebook Page, we subscribe that Page to
> our webhook so Loqara starts receiving its messages (this happens
> automatically at the "Connect Page" step, 1:05 in the screencast). We use
> pages_manage_metadata only to create and maintain that webhook
> subscription for the Pages our clients connect.

### business_management

> Many of our clients' Facebook Pages are owned by a business portfolio
> rather than a personal profile. We use business_management during the
> connection step so a store owner whose Page belongs to their business can
> see and connect it (0:45 in the screencast). We do not read or change any
> other business settings.

### public_profile

> Standard login identity for the person connecting their Facebook account
> during setup. Used only to complete Facebook Login.

## Data-use checkup

The checkup restates platform-policy commitments. Answer truthfully with:
message content is processed to generate replies and display conversations to
the store’s authorized staff. OpenAI processes prompts for AI responses and
Supabase stores application data; disclose applicable subprocessors truthfully
rather than claiming no third-party processing. OAuth Page tokens are encrypted
at rest; a legacy environment-token fallback also exists. Disconnect attempts
to unsubscribe the Page and removes its connection/token record, but **retains
past conversations**. Retention and organization deletion are separate flows;
verify their coverage before making deletion commitments. See
`lib/channels/processor.ts`, `lib/channels/disconnect.ts`,
`lib/channels/outbound.ts`, and `app/privacy/page.tsx`.

## Screencast script (~3 minutes, one video reused for every permission)

Record at 1080p, English UI, cursor visible. No cuts during the OAuth dialog.

1. **0:00** — Open loqara.com, log in as the reviewer test user. One sentence
   of context on screen or voiceover: "Loqara is an AI assistant for online
   stores; this connects a store's Facebook Page."
2. **0:20** — Navigate to `/app/channels/messenger/connect`. The page explains
   the three steps. Click **Continue with Facebook**.
3. **0:30** — Facebook Login for Business dialog: log in, show the permission
   review screen (this is where reviewers see every requested permission in
   context), approve.
4. **0:45** — Back in Loqara: the Page list appears (**pages_show_list**,
   **business_management**). Select the Loqara Page, choose the answering
   chatbot.
5. **1:05** — Click **Connect Page** → success screen ("Messenger is connected
   and answering"). Mention the webhook subscription happens here
   (**pages_manage_metadata**).
6. **1:20** — Click **Message the Page** (m.me link). As a customer, send a
   real question (e.g. "What does Loqara cost?"). Show the AI answer arriving
   in Messenger (**pages_messaging** receive + send).
7. **2:00** — Send "I want to talk to a human." Show the acknowledgment.
8. **2:10** — Switch to Loqara's Inbox: the conversation is there with a
   Messenger badge and "Needs human." Click **Take over**, type a personal
   reply, show it arriving in Messenger (**pages_messaging** via a human).
9. **2:40** — Click **Resolve**, send one more customer question, show the
   assistant answering again. End.

## After approval

- Publish the app (Publish → switch out of dev mode).
- Verify public availability and billing entitlement before announcing to clients.
  The 3IMIS test account already sees an available Messenger card and Connect
  Messenger link as of 2026-09-05; do not assume the card still needs enabling.
- Instagram permissions (instagram_basic, instagram_manage_messages) go in a
  follow-up submission with their own short screencast of the Instagram flow.
