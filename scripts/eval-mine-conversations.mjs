#!/usr/bin/env node
/**
 * Mine real visitor questions from a bot's conversations into an eval-case
 * skeleton (JSON on stdout). Curate the output (fill mustInclude) and feed it
 * to eval-answers.mjs.
 *
 * Run: node --env-file=.env.local scripts/eval-mine-conversations.mjs --bot <uuid> [--limit 200]
 */
import { createClient } from '@supabase/supabase-js'

const arg = (name, dflt) => {
  const i = process.argv.indexOf(`--${name}`)
  return i > -1 && process.argv[i + 1] ? process.argv[i + 1] : dflt
}
const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) throw new Error('Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY')
const db = createClient(url, key)
const botId = arg('bot')
if (!botId) throw new Error('--bot <uuid> required')

const { data: convs, error: cErr } = await db.from('conversations').select('id').eq('bot_id', botId)
if (cErr) throw cErr
const ids = (convs ?? []).map((c) => c.id)
if (!ids.length) {
  console.error('No conversations for that bot')
  process.exit(1)
}

const { data: msgs, error: mErr } = await db
  .from('messages')
  .select('content, created_at')
  .in('conversation_id', ids)
  .eq('role', 'user')
  .order('created_at', { ascending: false })
  .limit(Number(arg('limit', '200')))
if (mErr) throw mErr

const seen = new Set()
const out = []
for (const m of msgs ?? []) {
  const q = (m.content ?? '').trim()
  const dedupeKey = q.toLowerCase()
  if (q.length < 4 || seen.has(dedupeKey)) continue
  seen.add(dedupeKey)
  out.push({ question: q, mustInclude: [], language: /[ąčęėįšųūž]/i.test(q) ? 'lt' : 'en' })
}
console.log(JSON.stringify(out, null, 2))
console.error(`\n${out.length} unique questions mined — fill in mustInclude before using.`)
