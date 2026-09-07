/**
 * Re-ingest every URL source of a bot (e.g. after an ingestion fix, so old
 * chunks pick up nav/footer stripping). Re-embeds; costs OpenAI credits.
 * Usage: set -a; source .env.local; set +a
 *        npm exec --yes --package=tsx -- tsx scripts/reingest-bot.mts <botId> [--dry]
 */
import { createClient } from '@supabase/supabase-js'
import { ingestSource, makeServiceRepo } from '@/lib/ingestion/pipeline'
const BOT = process.argv[2]; const DRY = process.argv.includes('--dry')
const svc = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } })
const { data: bot } = await svc.from('bots').select('name').eq('id', BOT).single()
const { data: sources } = await svc.from('knowledge_sources').select('id,name,status,metadata').eq('bot_id', BOT).eq('type', 'url').order('created_at')
console.log(`bot ${bot?.name}: ${sources?.length} url sources${DRY ? ' (dry run)' : ''}`)
for (const s of sources ?? []) {
  const before = (await svc.from('document_chunks').select('id', { count: 'exact', head: true }).eq('source_id', s.id)).count
  if (DRY) { console.log(`  ${s.name}  chunks=${before}`); continue }
  const t = Date.now()
  await ingestSource(s.id, { repo: makeServiceRepo(svc) })
  const after = await svc.from('knowledge_sources').select('status,error_message').eq('id', s.id).single()
  const cnt = (await svc.from('document_chunks').select('id', { count: 'exact', head: true }).eq('source_id', s.id)).count
  console.log(`  ${s.name}  ${before} -> ${cnt} chunks  status=${after.data?.status}${after.data?.error_message ? ' ERR ' + after.data.error_message : ''}  ${Math.round((Date.now() - t) / 1000)}s`)
}
