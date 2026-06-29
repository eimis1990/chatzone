#!/usr/bin/env node
/**
 * Retrieval eval harness: measures recall@k for vector-only vs hybrid retrieval
 * against a real bot's ingested chunks, so changes to chunking / thresholds /
 * fusion can be judged with numbers instead of vibes.
 *
 * A case is a "hit" if ANY of its expected keywords appears (case-insensitively)
 * in the concatenated top-k chunk text.
 *
 * Run:
 *   node --env-file=.env.local scripts/eval-retrieval.mjs [--bot <uuid>] [--top-k 5]
 *
 * Env: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, OPENAI_API_KEY
 */
import { readFileSync } from 'node:fs'

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const OAI = process.env.OPENAI_API_KEY
if (!URL || !KEY || !OAI) {
  console.error('Missing env: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, OPENAI_API_KEY')
  process.exit(1)
}
const H = { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' }

const args = process.argv.slice(2)
const getArg = (name, def) => {
  const i = args.indexOf(name)
  return i >= 0 && args[i + 1] ? args[i + 1] : def
}
const TOP_K = Number(getArg('--top-k', '5')) || 5
const MIN_SIM = Number(getArg('--min-sim', '0.2')) || 0.2
let botId = getArg('--bot', null)
const casesFile = getArg('--file', 'scripts/retrieval-eval-cases.json')

async function rest(path) {
  const r = await fetch(`${URL}/rest/v1/${path}`, { headers: H })
  if (!r.ok) throw new Error(`${path}: ${r.status} ${await r.text()}`)
  return r.json()
}
async function rpc(fn, body) {
  const r = await fetch(`${URL}/rest/v1/rpc/${fn}`, { method: 'POST', headers: H, body: JSON.stringify(body) })
  if (!r.ok) throw new Error(`${fn}: ${r.status} ${await r.text()}`)
  return r.json()
}
async function embed(input) {
  const r = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: { Authorization: `Bearer ${OAI}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'text-embedding-3-small', input }),
  })
  if (!r.ok) throw new Error(`embed: ${r.status} ${await r.text()}`)
  return (await r.json()).data[0].embedding
}
const keywordHit = (text, keywords) => {
  const lower = text.toLowerCase()
  return keywords.some((k) => lower.includes(String(k).toLowerCase()))
}

// Auto-detect the bot with the most chunks if none given.
if (!botId) {
  const rows = await rest('document_chunks?select=bot_id&limit=10000')
  const counts = {}
  for (const r of rows) counts[r.bot_id] = (counts[r.bot_id] || 0) + 1
  botId = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0]
  if (!botId) { console.error('No chunks found in any bot.'); process.exit(1) }
  console.log(`Auto-selected bot ${botId} (${counts[botId]} chunks)`)
}

const cases = JSON.parse(readFileSync(casesFile, 'utf8'))
console.log(`Eval: ${cases.length} cases · top-k=${TOP_K} · min-sim=${MIN_SIM}\n`)

let vecHits = 0
let hybHits = 0
for (const c of cases) {
  const e = await embed(c.query)
  const [vec, hyb] = await Promise.all([
    rpc('match_chunks', { p_bot_id: botId, p_query_embedding: e, p_match_count: TOP_K, p_min_similarity: MIN_SIM }),
    rpc('match_chunks_hybrid', { p_bot_id: botId, p_query_embedding: e, p_query_text: c.query, p_match_count: TOP_K, p_min_similarity: MIN_SIM }),
  ])
  const vecText = vec.map((r) => r.content).join('\n')
  const hybText = hyb.map((r) => r.content).join('\n')
  const v = keywordHit(vecText, c.expect)
  const h = keywordHit(hybText, c.expect)
  if (v) vecHits++
  if (h) hybHits++
  const mark = (ok) => (ok ? '✓' : '✗')
  console.log(`${mark(v)}vec ${mark(h)}hyb  "${c.query}"`)
}

const pct = (n) => `${n}/${cases.length} (${Math.round((100 * n) / cases.length)}%)`
console.log(`\n── recall@${TOP_K} ──`)
console.log(`vector-only: ${pct(vecHits)}`)
console.log(`hybrid:      ${pct(hybHits)}`)
