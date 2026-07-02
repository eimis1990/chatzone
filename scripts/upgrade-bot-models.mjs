// One-off: bump bots still on the old default chat model to the new default.
// Usage: node scripts/upgrade-bot-models.mjs [--dry]
import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) throw new Error('Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY')
const dry = process.argv.includes('--dry')
const db = createClient(url, key)

const { data: bots, error } = await db.from('bots').select('id, name, config')
if (error) throw error
let changed = 0
for (const bot of bots ?? []) {
  if (bot.config?.model !== 'gpt-4o-mini') continue
  changed++
  console.log(`${dry ? '[dry] ' : ''}${bot.name} (${bot.id}): gpt-4o-mini -> gpt-4.1`)
  if (!dry) {
    const { error: up } = await db
      .from('bots')
      .update({ config: { ...bot.config, model: 'gpt-4.1' } })
      .eq('id', bot.id)
    if (up) throw up
  }
}
console.log(`${changed} bot(s) ${dry ? 'would be ' : ''}updated`)
