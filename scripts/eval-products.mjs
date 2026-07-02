#!/usr/bin/env node
/**
 * Product-search recall eval against the hybrid match_products RPC.
 * A case passes when: results are non-empty, ANY expected substring appears in
 * a returned title/doc (case-insensitively; skipped when expect is empty), and
 * no wrong-audience row is returned when audience is set.
 *
 * Run: node --env-file=.env.local scripts/eval-products.mjs --bot <uuid> [--file scripts/product-eval-cases.json] [--k 8]
 */
import { readFileSync } from 'node:fs'

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const OAI = process.env.OPENAI_API_KEY
if (!URL || !KEY || !OAI) {
  console.error('Missing env: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, OPENAI_API_KEY')
  process.exit(1)
}
const arg = (name, dflt) => {
  const i = process.argv.indexOf(`--${name}`)
  return i > -1 && process.argv[i + 1] ? process.argv[i + 1] : dflt
}
const botId = arg('bot')
if (!botId) throw new Error('--bot <uuid> required')
const k = Number(arg('k', '8'))
const cases = JSON.parse(readFileSync(arg('file', 'scripts/product-eval-cases.json'), 'utf8'))

async function embed(text) {
  const r = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: { Authorization: `Bearer ${OAI}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'text-embedding-3-small', input: text }),
  })
  if (!r.ok) throw new Error(`embeddings: ${r.status}`)
  return (await r.json()).data[0].embedding
}

async function match(query, audience) {
  const r = await fetch(`${URL}/rest/v1/rpc/match_products`, {
    method: 'POST',
    headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      p_bot_id: botId,
      p_embedding: await embed(query),
      p_query_text: query,
      p_k: k,
      p_audience: audience ?? null,
    }),
  })
  if (!r.ok) throw new Error(`match_products: ${r.status} ${await r.text()}`)
  return r.json()
}

let pass = 0
for (const c of cases) {
  const rows = await match(c.query, c.audience)
  const hay = rows.map((r) => `${r.title} ${r.doc}`.toLowerCase()).join(' | ')
  const kwOk = !c.expect?.length || c.expect.some((e) => hay.includes(e.toLowerCase()))
  const audOk =
    !c.audience || rows.every((r) => !r.audience || r.audience === 'unisex' || r.audience === c.audience)
  const ok = rows.length > 0 && kwOk && audOk
  if (ok) pass++
  const top = rows.slice(0, 3).map((r) => r.title).join('; ')
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${c.query}  (${rows.length} rows)${ok ? '' : ` — top: ${top}`}`)
}
console.log(`\nproduct recall@${k}: ${pass}/${cases.length}`)
