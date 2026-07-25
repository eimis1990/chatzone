# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

**Primary: the self-serve e-commerce operator.** An owner or marketer at a small-to-mid
online store who signs up, connects their store, uploads/crawls their own content, and
configures a chat + voice agent themselves — without an agency. They are not designers or
engineers; they are busy operators evaluating whether this will answer their customers
correctly. Design decisions default to this person.

**Second, first-class: the concierge-onboarded client.** Higher-touch clients whose bot is
configured *for* them by the platform owner (`/owner/clients/[orgId]/...`, and demo bots in
`/owner/demos`). After handover they mostly *read* results — inbox, leads, analytics — and
edit rarely. Their portal must stay legible to someone who never sat through setup.

**Third: the platform owner (single operator).** Runs the whole platform from `/owner`:
clients, invites, signups, curated voices, the system-prompt library, sales/LinkedIn
pipelines, and platform stats. Back-office density is acceptable here in a way it is not in
the client portal.

**Fourth: the end visitor.** The store's own shopper, in the embedded widget — the only
audience who never chose Loqara and never logs in. They arrive mid-task, often on mobile.

## Product Purpose

Loqara is an AI chat and voice agent for e-commerce stores. A store connects its catalog and
knowledge, and gets an embeddable widget whose answers are grounded in that store's own
material: streaming RAG answers with citations, live product search with real price and
stock, order lookup, lead capture, and optional voice.

Success is a visitor question answered correctly without a human — and the store operator
being able to see that it was answered correctly.

## Positioning

**Chat, voice, and product visualization in one widget.** The differentiator is breadth
inside a single embed that competitors cover only in parts:

- text chat grounded in the store's knowledge base (hybrid retrieval);
- **voice** — the visitor speaks, the agent speaks back, and answers still come from the same
  knowledge base via a `search_knowledge` tool;
- **live catalog search** with hydrated price/stock across WooCommerce, Shopify, Magento,
  Verskis, and generic feeds;
- **order lookup**, identity-gated by order id + billing email (WooCommerce and Magento only);
- **"see it in your room"** — the visitor picks products from chat recommendation cards,
  uploads a room photo, and gets an AI render of those products placed in their room.

Supporting, not the headline: it is self-serve and priced without a mandatory setup fee
(concierge setup exists but is explicitly optional).

## Operating Context

- **Install is copy-paste.** A `<script>` loader mounts an isolated iframe on the store's own
  site; the operator's real integration work is pasting one snippet and allowlisting a domain.
- **Two markets, equal weight.** Lithuania and English-speaking e-commerce both matter; no
  product or content decision privileges one. Bots support `en` and `lt` today (adding a
  language is one registry entry). Content is *not* English-anchored — a bot can be
  Lithuanian-only.
- **Content is the operator's homework.** Value depends on ingestion: file upload (PDF/DOCX/
  TXT/MD), URL crawl, Q&A pairs, pasted text. Empty and thin knowledge bases are the normal
  starting state, not an edge case.
- **The widget lives on someone else's page**, next to a design Loqara does not control, on
  a viewport Loqara does not choose.
- **Public site doubles as the SEO/GEO surface** — landing, pricing, blog, author and
  editorial-policy pages. Public content is governed by
  [`docs/wiki/seo-geo-playbook.md`](docs/wiki/seo-geo-playbook.md).

## Capabilities and Constraints

- **Stack:** Next.js 16 App Router (TypeScript strict), Tailwind v4, shadcn/ui, Supabase
  (Postgres, Auth, Storage, RLS, pgvector), OpenAI via the Vercel AI SDK, ElevenLabs voice,
  Gemini for room renders, Stripe billing (live).
- **Route groups define the audiences:** `(auth)`, `(client)` at `/app`, `(owner)` at
  `/owner`, `/embed/[publicKey]` for the widget, plus the public marketing/blog routes.
- **Plans** (EUR/month, annual billed at 10×): Free €0 / 100 conversations · Starter €149 /
  1,500 · Growth €249 / 4,000 · Scale €449 / 12,000 · Enterprise on request. Add-ons: Voice
  agent €49, Product visualizer €29. Limits are enforced server-side; UI gates are UX only
  ([`lib/entitlements.ts`](lib/entitlements.ts),
  [`docs/wiki/plans-and-entitlements.md`](docs/wiki/plans-and-entitlements.md)).
- **Free tier is deliberately narrow:** 1 bot, 1 language, no lead capture, badge stays.
- **Terminology:** *owner* and *client* are roles, not adjectives — an owner runs the
  platform, a client is an onboarded business. A *bot* belongs to an org. Same-named bots in
  different orgs are different bots.
- **Security invariants are not negotiable:** RLS is column-blind and `profiles.role` is
  locked by trigger; any server-side fetch of a user-supplied URL goes through the SSRF guard;
  cron fails closed. See [`docs/wiki/access-model.md`](docs/wiki/access-model.md).
- **Voice degrades to text-only** without `ELEVENLABS_API_KEY`; order lookup is unavailable
  on Shopify/Verskis/feed. Neither gap may be papered over in UI copy.

## Brand Commitments

- **Name:** Loqara. Public origin `https://www.loqara.com`.
- **Public contact:** `hello@loqara.com` (forwarding, receive-only). Never expose a personal
  inbox in public copy.
- **Single named author/founder:** Eimantas Kudarauskas, Founder — the byline on the blog,
  the face on `/about`.
- **Voice: honest and concrete.** Stated capability matches shipped behaviour; limits are
  named rather than smoothed over ("Free to start · add voice when you're ready" is the
  register). No invented metrics, customers, or benchmarks — an existing editorial policy
  page commits to this publicly.

## Evidence on Hand

- **Real product surfaces** to screenshot or demo: the client portal, the owner panel, the
  widget, and the presentable demo bots (`/owner/demos`, `/present/[botId]`).
- **A seeded demo org** ("Aurora Living") exists in production behind the Features
  screenshots — real product, staged content.
- **Documented competitor comparison:** [`docs/loqara-vs-parnidia.md`](docs/loqara-vs-parnidia.md).
- **Own SEO baseline** from Google Search Console: [`docs/wiki/seo-baselines.md`](docs/wiki/seo-baselines.md).
- **A 24-page internal wiki** ([`docs/wiki/index.md`](docs/wiki/index.md)) is the authority on
  how each subsystem behaves.
- **Absences future work must not fabricate:** no customer testimonials, no named logos, no
  case studies, no accuracy/uptime/ROI numbers, no funding or team-size claims. If a page
  needs proof, it gets a real product demonstration, not a manufactured quote.

## Product Principles

1. **Grounded or silent.** An answer comes from the store's own knowledge and live catalog,
   with citations and an honest fallback. A confident invention is the worst outcome.
2. **The operator must be able to verify the machine.** Inbox, transcripts, citations, and
   analytics exist so a non-technical person can check the agent's work.
3. **Self-serve must actually be servable.** Every step an operator has to complete alone —
   connect, ingest, configure, embed — is a place the product can lose them.
4. **The widget is a guest.** It behaves on a page it does not own: modest footprint,
   mobile-first, no layout theft.
5. **Say the limit.** Unsupported providers, tier caps, missing keys, thin knowledge bases —
   named plainly in the UI, not discovered after purchase.

## Accessibility & Inclusion

No product-specific standard has been established yet — treat as an open decision. Known
constraints that will shape it: the widget renders inside an iframe on third-party pages, and
voice interaction must never be the only way to complete anything.
