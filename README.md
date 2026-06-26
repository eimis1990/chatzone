# Loqara

A multi-tenant chatbot SaaS. As the **owner** you onboard **client** businesses; each client
configures an AI chatbot, trains it on a knowledge base, and embeds it on their website via a
copy-paste widget. Visitors get streaming, RAG-grounded answers.

## Stack

- **Next.js 16** (App Router, TypeScript strict) + **Tailwind v4** + **shadcn/ui**
- **Supabase** — Postgres, Auth, Storage, Row-Level Security, `pgvector`
- **OpenAI** via the **Vercel AI SDK** — `gpt-4o-mini` chat + `text-embedding-3-small`
- **Vitest** (unit + DB integration) and **Playwright** (E2E)

## Features (Cycle 1)

- Owner admin panel: clients, invites, platform + per-client stats
- Invite-only client portal: bot configurator with live preview
- Knowledge base ingestion: file upload (PDF/DOCX/TXT/MD), URL crawl, Q&A pairs, text paste
- RAG chat API with streaming, citations, configurable fallback + lead capture
- Embeddable widget (`<script>` loader → isolated iframe), domain allowlist, rate limiting
- Conversations/transcripts, leads with CSV export, analytics charts

**Cycle 2 — Voice:** bots can speak replies (ElevenLabs TTS, play button per message) and visitors
can speak (OpenAI Whisper STT, mic in the widget). Voice is opt-in per bot; the client picks a
voice in the configurator. Requires `ELEVENLABS_API_KEY` (degrades to text-only without it).

**Cycle 2.5 — Curated voices + test playground:** the owner manages a curated voice catalog at
`/owner/voices` (each tagged male/female); clients pick from a fast Men/Women grouped list. The
configurator's preview is an interactive **test chat** — talk to the bot using the current
(unsaved) config against its knowledge base, with text + voice (TTS/STT) and a Start-over button;
test chats are ephemeral (never logged).

**Cycle 3 — Real-time voice + language:** a live **"voice call"** (ElevenLabs Agents, WebRTC,
barge-in) in both the test playground and the widget — the agent uses the bot's voice and answers
from the knowledge base via a custom-LLM callback into our RAG. Per-bot **language** (English or
Lithuanian) steers text chat, ASR, and TTS. A short-lived conversation token is minted server-side
(`/api/{preview,widget}/voice-token`); the agent's brain is `/api/llm/[publicKey]`.

> **Live-call requirement:** ElevenLabs calls the custom-LLM endpoint server-to-server, so the live
> voice call only answers from the knowledge base when the app is **publicly reachable**
> (`NEXT_PUBLIC_APP_URL` = a deployed URL or a tunnel). On plain `localhost` the call connects and
> audio flows but the agent can't reach the LLM endpoint. Text chat + read-aloud TTS work locally.

> Deferred to later cycles: Stripe billing, human handoff, self-serve signup.

## Setup

### 1. Install

```bash
npm install
npx playwright install chromium   # only if you'll run E2E
```

### 2. Configure environment

Copy `.env.example` to `.env.local` and fill in your Supabase + OpenAI values:

```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
OPENAI_API_KEY=...
ELEVENLABS_API_KEY=...        # optional — enables voice (TTS); STT uses OpenAI Whisper
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 3. Apply database migrations

Link the Supabase CLI to your project and push:

```bash
export SUPABASE_ACCESS_TOKEN=<personal access token>
npx supabase link --project-ref <your-project-ref> --password <db password>
npx supabase db push
```

This creates all tables, RLS policies, the `match_chunks` RPC, the stats views, and the
`knowledge` storage bucket.

### 4. Seed your owner account

```bash
node --env-file=.env.local scripts/seed-owner.mjs you@example.com 'a-strong-password'
```

### 5. Run

```bash
npm run dev      # http://localhost:3000
```

Log in at `/login` with the owner credentials → you land on `/owner`.

## How it works

1. **Owner** creates a client at `/owner/clients` → gets an invite link to send.
2. **Client** opens the link, sets a password, and lands in `/app`.
3. Client creates a bot, configures it (`/app/bots/<id>/configure`), and adds knowledge
   (`/app/bots/<id>/knowledge`). Ingestion parses → chunks → embeds into `pgvector`.
4. Client copies the embed snippet (`/app/bots/<id>/embed`) into their site:
   ```html
   <script src="https://your-app/widget.js" data-bot-key="PUBLIC_KEY" async></script>
   ```
5. Visitors chat; `/api/chat` retrieves relevant chunks and streams a grounded answer.

## Testing

```bash
npm run test          # unit + DB integration (integration skips without .env.local)
npm run typecheck
RUN_LIVE_AI=1 npm run test -- tests/integration/rag.test.ts   # live OpenAI RAG check
E2E_OWNER_EMAIL=you@example.com E2E_OWNER_PASSWORD='...' npx playwright test
```

## Project structure

```
app/(auth|owner|client)   route groups (auth pages, owner panel, client portal)
app/embed/[publicKey]      widget chat UI (iframe content)
app/api/{chat,ingest,widget-config,lead,invites}   API routes
public/widget.js           embeddable loader script
lib/ai                     embeddings, retrieval, prompt assembly
lib/ingestion              parsers, chunker, ingestion pipeline
lib/supabase               server/browser/service clients + proxy session
lib/auth                   role guards + route policy
supabase/migrations        schema, RLS, RPC, storage
docs/superpowers           design spec + implementation plan
```

See [docs/DEPLOY.md](docs/DEPLOY.md) for production deployment.
