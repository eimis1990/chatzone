# Security & data handling

This documents how Loqara handles data, who processes it, and the technical
controls in place — plus a SOC 2 readiness checklist. (Certification is an audit
process, separate from these controls.)

## Data flows

- **Visitor → widget → `/api/chat`**: visitor messages are stored in
  `messages`, scoped to a `conversation` which belongs to a `bot` → `organization`.
- **RAG**: the latest visitor turn is embedded (OpenAI) and matched against the
  bot's `document_chunks` (pgvector) to ground the answer.
- **Voice**: the browser gets a short-lived ElevenLabs WebRTC token from
  `/api/widget/voice-token`; speech-to-text, the conversation LLM, and
  text-to-speech run on ElevenLabs. The `search_products` client tool calls our
  public `/api/widget/search`.
- **Analytics**: thumbs feedback (`messages.feedback`) and per-conversation
  summaries/topics (`conversations.summary/topics`) power the owner dashboards.

## Subprocessors

| Vendor | Purpose |
| --- | --- |
| Supabase | Postgres, auth, storage, pgvector (EU region) |
| OpenAI | Chat completions, embeddings, conversation analysis |
| ElevenLabs | Real-time voice (STT, agent LLM, TTS) |
| Vercel | App hosting + CDN + cron |

## Technical controls

- **Tenant isolation**: Postgres Row-Level Security. Members can only read their
  organization's rows; cross-org access is impossible from the client. The
  service-role key is used only in trusted server routes that scope every query.
- **Secrets**: provider keys and the service-role key live in server-only env /
  `bots.config` and are never included in the public widget config
  (`lib/widget-config.ts`) or shipped to the browser.
- **Widget origins**: bots can restrict the embeddable widget to an allowlist of
  domains (`config.allowedDomains`); requests from other origins are rejected.
- **Encryption**: all traffic is over HTTPS/TLS; Supabase encrypts data at rest.
- **Rate limiting**: public endpoints (chat, lead, feedback, search, voice token)
  are rate-limited per bot.
- **Retention**: `organizations.retention_days` drives a daily cron
  (`/api/cron/retention`, secured by `CRON_SECRET`) that permanently deletes
  conversations + messages older than the window.
- **Data rights**: owners can export (`/api/account/export`) and erase
  (Settings → Delete) their organization's data on demand.

## SOC 2 readiness checklist

- [ ] Centralized access logging / audit trail (`audit_log` table) for admin
      actions (export, delete, config changes).
- [ ] Documented least-privilege review of who can access production + Supabase.
- [ ] Vendor (subprocessor) security review records.
- [ ] Incident response runbook + on-call contact.
- [ ] Backup + restore tested for the Supabase database.
- [ ] Change management: PR review + CI gates (typecheck, tests, build) before
      deploy — partially in place.
- [ ] Data Processing Agreement (DPA) template for customers.
- [ ] Formal data-residency statement and retention defaults.

## Reporting

Security issues: contact the operator of this deployment.
