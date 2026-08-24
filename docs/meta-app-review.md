# Meta App Review — submission pack (Messenger v1)

Prepared 2026-08-22. Access verification: ✅ verified. Business verification: ✅.
Submit at App Dashboard → Review → App Review.

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

Paste as-is; each names the visible step in the screencast.

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
message content is used only to generate the answer for that conversation and
to show the conversation to the store's own staff; Page tokens are stored
encrypted; no data is sold, no advertising use, no sharing with third parties;
data is deleted when a client disconnects the Page or deletes their account.

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
- Flip the Subscription Messenger card from "Coming soon" to available
  (components/client/BillingPanel.tsx — status, helper, connect link) and add
  the billing entitlement before announcing to clients.
- Instagram permissions (instagram_basic, instagram_manage_messages) go in a
  follow-up submission with their own short screencast of the Instagram flow.
