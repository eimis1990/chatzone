#!/usr/bin/env node
/**
 * One-time backfill: derive the MAIN product color from the product photo for
 * indexed products whose doc has no color field, append it as a "Color: …"
 * attribute, and re-embed the doc. New/changed products get this automatically
 * at sync time (lib/products/enrich.ts aiColorEnrich); this script covers rows
 * whose raw hash is unchanged and therefore never re-enrich.
 *
 * Run: node --env-file=.env.local scripts/backfill-product-colors.mjs --bot <uuid> [--dry] [--limit N]
 *
 * ponytail: the vision call mirrors lib/products/enrich.ts (plain node can't
 * import the TS module through '@/' path aliases) — keep the two prompts in sync.
 */
import { createClient } from '@supabase/supabase-js'

const URL_ = process.env.NEXT_PUBLIC_SUPABASE_URL
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const OAI = process.env.OPENAI_API_KEY
if (!URL_ || !KEY || !OAI) {
  console.error('Missing env: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, OPENAI_API_KEY')
  process.exit(1)
}
const arg = (name) => {
  const i = process.argv.indexOf(`--${name}`)
  return i >= 0 ? process.argv[i + 1] : undefined
}
const BOT = arg('bot')
const DRY = process.argv.includes('--dry')
const LIMIT = Number(arg('limit') ?? Infinity)
if (!BOT) {
  console.error('Usage: --bot <uuid> [--dry] [--limit N]')
  process.exit(1)
}

const db = createClient(URL_, KEY, { auth: { autoRefreshToken: false, persistSession: false } })

// Mirrors the RPC's boundary-anchored main-color extraction (migration
// 20260802120000): "Porankių Spalva"/"Kojų spalva" are component colors.
const HAS_COLOR = /(^|\n|; |Attributes: )(Spalva|Colou?r): /

async function fetchRows() {
  const rows = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await db
      .from('product_embeddings')
      .select('external_id, title, doc, image_url')
      .eq('bot_id', BOT)
      .range(from, from + 999)
    if (error) throw new Error(error.message)
    rows.push(...(data ?? []))
    if (!data || data.length < 1000) break
  }
  return rows
}

const BATCH = 6
const CONCURRENCY = 8

async function classifyBatch(batch) {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${OAI}` },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'product_colors',
          strict: true,
          schema: {
            type: 'object',
            additionalProperties: false,
            required: ['items'],
            properties: {
              items: {
                type: 'array',
                items: {
                  type: 'object',
                  additionalProperties: false,
                  required: ['id', 'colors'],
                  properties: {
                    id: { type: 'string' },
                    colors: { type: 'array', items: { type: 'string' } },
                  },
                },
              },
            },
          },
        },
      },
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text:
                'Each numbered product below is followed by its photo. For each, return the ' +
                "PRODUCT'S OWN main visible color(s) — 1-3 simple lowercase color words in the " +
                "CATALOG'S language, judged from the products' titles and categories (for a " +
                'Lithuanian catalog: "balta", "pilka", "ruda" — never English words there, even ' +
                'when a title is a bare product code). Judge only the product itself, never ' +
                'packaging, background, or props. Return [] when the color is unclear, a busy ' +
                'multicolor print, or not a meaningful buying attribute for this product type ' +
                '(e.g. consumables, cosmetics contents). Return exactly one entry per product id.',
            },
            ...batch.flatMap((p) => [
              {
                type: 'text',
                text: `[${p.external_id}] ${p.title} — ${p.doc?.match(/\nCategories: ([^\n]*)/)?.[1] ?? ''}`,
              },
              { type: 'image_url', image_url: { url: p.image_url, detail: 'low' } },
            ]),
          ],
        },
      ],
    }),
  })
  if (!res.ok) throw new Error(`vision HTTP ${res.status}`)
  const json = await res.json()
  return JSON.parse(json.choices[0].message.content).items
}

async function embedDocs(docs) {
  const out = []
  for (let i = 0; i < docs.length; i += 100) {
    const res = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${OAI}` },
      body: JSON.stringify({ model: 'text-embedding-3-small', input: docs.slice(i, i + 100) }),
    })
    if (!res.ok) throw new Error(`embeddings HTTP ${res.status}`)
    const json = await res.json()
    out.push(...json.data.map((d) => d.embedding))
  }
  return out
}

function docWithColor(doc, colors) {
  const line = `Color: ${colors.join(', ')}`
  if (/\nAttributes: /.test(doc)) return doc.replace(/\n(Attributes: [^\n]*)/, `\n$1; ${line}`)
  return `${doc}\nAttributes: ${line}`
}

const rows = await fetchRows()
const todo = rows
  .filter((r) => r.image_url && r.doc && !HAS_COLOR.test(r.doc))
  .slice(0, LIMIT)
console.log(`${rows.length} indexed, ${todo.length} lack a main color and have a photo`)
if (!todo.length) process.exit(0)

const batches = []
for (let i = 0; i < todo.length; i += BATCH) batches.push(todo.slice(i, i + BATCH))
const colorsById = new Map()
let next = 0
let done = 0
await Promise.all(
  Array.from({ length: Math.min(CONCURRENCY, batches.length) }, async () => {
    while (next < batches.length) {
      const batch = batches[next++]
      try {
        for (const it of await classifyBatch(batch)) {
          if (it.colors.length) colorsById.set(it.id, it.colors.slice(0, 3))
        }
      } catch (err) {
        console.error(`batch failed (${batch[0].external_id}…): ${err.message}`)
      }
      done += batch.length
      if (done % 60 < BATCH) console.log(`classified ${done}/${todo.length}`)
    }
  }),
)

const updates = todo
  .filter((r) => colorsById.has(r.external_id))
  .map((r) => ({ id: r.external_id, title: r.title, doc: docWithColor(r.doc, colorsById.get(r.external_id)) }))
console.log(`${updates.length} products got a color`)

if (DRY) {
  for (const u of updates.slice(0, 20)) {
    console.log(`- ${u.title.slice(0, 60)} → ${u.doc.match(/Color: [^;\n]*/)?.[0]}`)
  }
  console.log('(dry run — nothing written)')
  process.exit(0)
}

const embeddings = await embedDocs(updates.map((u) => u.doc))
let written = 0
let w = 0
await Promise.all(
  Array.from({ length: 8 }, async () => {
    while (w < updates.length) {
      const i = w++
      const { error } = await db
        .from('product_embeddings')
        .update({ doc: updates[i].doc, embedding: embeddings[i] })
        .eq('bot_id', BOT)
        .eq('external_id', updates[i].id)
      if (error) console.error(`update ${updates[i].id} failed: ${error.message}`)
      else written++
    }
  }),
)
console.log(`updated ${written}/${updates.length} rows`)
