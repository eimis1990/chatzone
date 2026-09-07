# Lead capture: typed forms, AI trigger, delivery

**Date:** 2026-09-07 · **Status:** approved (owner), implemented same day

## Why

Taujėnų dvaras (and most non-commerce clients: venues, clinics, salons) have a
"Rezervacija" form on their site: name, email, phone, service, guest count, date,
message. Our lead form already stores arbitrary fields as JSON, but it only
rendered text/email inputs, only opened on fallback / after N messages / a quick
action, and only delivered leads to the portal + admin email. Closing those three
gaps generically means we never write a per-client reservation flow.

Principle (see `commerce-provider-profiles.md`): client variation is **config**,
not code branches. Everything below is bot config validated by `botConfigSchema`.

## 1. Typed fields

`LeadField` gains `type` and `options`:

```ts
type LeadFieldType = 'text' | 'email' | 'tel' | 'number' | 'date' | 'textarea' | 'select'
interface LeadField { key; label; required; type?: LeadFieldType; options?: string[] }
```

- `type` defaults to `text`; a field with key `email` still renders as email
  (backwards compatible with existing configs).
- `options` only for `select` (1–20 short strings).
- `LeadForm.tsx` renders the matching **native** input in both variants
  (`<input type=date>`, `<textarea>`, `<select>`). No picker libraries.
- `LeadForm` accepts `initialValues` so the AI can prefill (see §2).

## 2. AI trigger (`open_lead_form` tool)

New config: `leadCapture.offerOnIntent: boolean` (default false) and
`leadCapture.intentHint?: string` (≤200 chars, e.g. "hall rental, accommodation
or event booking requests").

- `lib/ai/lead-tool.ts` `makeLeadTools(config, sink)` returns one tool,
  `open_lead_form({ prefill })`. `prefill` keys are filtered to configured field
  keys; the tool pushes `{ prefill }` to `sink` and returns a short instruction
  ("form opened — tell the visitor to complete it, don't re-ask for these").
- Offered from `/api/chat` and `/api/preview/chat` when `enabled &&
  offerOnIntent && fields.length && lead-form component allowed && lane !== fast`
  (fast lane is tool-less by definition). Merged with product tools; independent
  of commerce.
- `ndjsonChatResponse` gets `leadFormSink`; when non-empty after the stream it
  emits one `{ t: 'lead_form', v: { prefill } }` line.
- `ChatWindow` handles the event: clears `leadDismissed`, stores prefill, shows
  the form. Existing triggers (fallback header, after-N, manual quick action) are
  unchanged; `trigger` stays a single select, `offerOnIntent` is additive.
- `buildSystemPrompt` adds one line when the tool is on: call it once when the
  visitor wants to book / order a service / be contacted, then point them to the
  form instead of collecting details turn by turn.

## 3. Delivery

New config `leadCapture.delivery?: { emails?: string[]; webhookUrl?: string }`.

`lib/lead-delivery.ts` `deliverLead(svc, bot, lead)` (fire-and-forget from
`/api/lead`, never throws):

1. `notifyLeadCaptured` — unchanged (org admins, pref-gated).
2. Extra `emails` (≤5) get the same `leadEmail` template, NOT pref-gated
   (explicitly configured destination).
3. `webhookUrl` — `assertPublicUrl` (SSRF), `POST` JSON
   `{ event:'lead.created', botId, botName, leadId, conversationId, createdAt, fields }`,
   5 s timeout, failures logged. No signing (add HMAC when a client asks).

## 4. Config UI (`ConfigForm` → Lead capture card)

Groups, in order:

1. **Capture status** — existing switch.
2. **When the form appears** — trigger select (existing) + switch "Let the
   assistant open it when a visitor wants to book or leave a request" +
   `intentHint` input shown when on.
3. **Form** — title; **template picker** ("Contact details", "Reservation
   request") seeds localized fields (LT/EN by bot language); field rows: Label,
   Type select, Required, Options (select only), Key auto-derived from label
   when empty (`slugify`), remove.
4. **Where leads go** — note that leads land in the Leads screen and admin
   email; extra emails input (comma separated → array); webhook URL.

`TestChat` (live preview) passes `type`/`options` through so the preview matches.

## Testing

- `botConfig.test.ts`: typed field + delivery parse; legacy field (no type) OK.
- `lead-form.test.tsx`: date/number/textarea/select render; prefill applied.
- `lead-tool.test.ts`: prefill filtered to configured keys; sink receives it.
- `lead-delivery.test.ts`: webhook posts JSON; internal URL rejected; failures
  swallowed.

## Out of scope

Multi-step forms, file uploads, conditional fields, CRM connectors, webhook
signing, per-field placeholders. Each is a follow-up if a client asks.
