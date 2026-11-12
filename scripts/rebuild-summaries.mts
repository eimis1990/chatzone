/**
 * Rebuild a bot's canonical summary pages with the CURRENT prompt in
 * lib/ingestion/canonical.ts (same as the "Rebuild summaries" button, but
 * runnable before a deploy). Optionally re-ingest named sources first.
 * Usage: set -a; source .env.local; set +a
 *        npm exec --yes --package=tsx -- tsx scripts/rebuild-summaries.mts <botId> [--reingest <sourceId>]...
 */
import { createClient } from '@supabase/supabase-js'
import { generateCanonicalPages } from '@/lib/ingestion/canonical'
import { ingestSource, makeServiceRepo } from '@/lib/ingestion/pipeline'
const [BOT, ...rest] = process.argv.slice(2)
if (!BOT) throw new Error('usage: rebuild-summaries.mts <botId> [--reingest <sourceId>]...')
const svc = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } })
for (const [i, a] of rest.entries()) {
  if (a !== '--reingest') continue
  await ingestSource(rest[i + 1], { repo: makeServiceRepo(svc) })
  console.log('re-ingested', rest[i + 1])
}
console.log(await generateCanonicalPages(BOT, svc))
