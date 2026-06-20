# Deploying ChatbotZone

Target: **Vercel** (Next.js app + widget) + **Supabase Cloud** (database, auth, storage).

## 1. Supabase

1. Create a project at [supabase.com](https://supabase.com/dashboard).
2. Apply migrations from your machine:
   ```bash
   export SUPABASE_ACCESS_TOKEN=<personal access token>
   npx supabase link --project-ref <project-ref> --password <db password>
   npx supabase db push
   ```
3. Confirm in the dashboard: tables exist, the `knowledge` storage bucket exists, RLS is enabled.

## 2. Vercel

1. Import the repository into Vercel (framework auto-detected as Next.js).
2. Set environment variables (Project → Settings → Environment Variables) for Production:
   | Variable | Value |
   | --- | --- |
   | `NEXT_PUBLIC_SUPABASE_URL` | your project URL |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon public key |
   | `SUPABASE_SERVICE_ROLE_KEY` | service_role secret (server-only) |
   | `OPENAI_API_KEY` | your OpenAI key (server-only) |
   | `NEXT_PUBLIC_APP_URL` | `https://your-domain.com` |
3. Deploy. The widget loader is served at `https://your-domain.com/widget.js`.

> `NEXT_PUBLIC_APP_URL` must be the public production URL — the embed snippet and the widget
> iframe are derived from it.

## 3. Seed the owner

Run once against production (use the production env values):

```bash
node --env-file=.env.production scripts/seed-owner.mjs you@example.com 'a-strong-password'
```

Then log in at `https://your-domain.com/login`.

## 4. Widget install (for clients)

Clients paste this into their site, before `</body>`:

```html
<script src="https://your-domain.com/widget.js" data-bot-key="THEIR_BOT_PUBLIC_KEY" async></script>
```

Set the bot's **allowed domains** in the configurator to restrict where the widget may run
(empty = allow all, useful only during setup).

## Notes & next steps

- **Ingestion runtime:** ingestion runs inside the `/api/ingest` route (`maxDuration` raised). For
  very large files or many URLs, move ingestion to a Supabase Edge Function or a queue.
- **Rate limiting** is in-memory (per serverless instance). For production scale, back it with
  Redis/Upstash.
- **Analytics** queries are computed per request; add materialized views if volume grows.
- Rotate any secrets that were shared during development.
