#!/usr/bin/env node
/**
 * One-time migration: upgrade every bot's config from the pre-multilanguage
 * shape (top-level greeting/suggestedQuestions/fallbackMessage/language,
 * voice.voiceId) to the per-language shape (content.{lang}, languages[],
 * voice.voices). Idempotent.
 *
 *   node --env-file=.env.local scripts/migrate-config-langs.mjs
 */
import { createClient } from '@supabase/supabase-js'

const DEFAULT_VOICE = '21m00Tcm4TlvDq8ikWAM'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
})

function normalize(cfg) {
  if (!cfg || typeof cfg !== 'object') return cfg
  const c = { ...cfg }
  if (!c.content) {
    const lang = c.language === 'lt' ? 'lt' : 'en'
    const legacy = {
      greeting: c.greeting ?? 'Hi! How can I help you today?',
      suggestedQuestions: c.suggestedQuestions ?? [],
      fallbackMessage:
        c.fallbackMessage ?? "I'm not sure about that — let me take your details so someone can follow up.",
    }
    c.content = lang === 'lt' ? { en: legacy, lt: legacy } : { en: legacy }
  }
  if (!c.languages) c.languages = c.language === 'lt' ? ['en', 'lt'] : ['en']
  if (c.voice && typeof c.voice === 'object' && !c.voice.voices) {
    c.voice = { ...c.voice, voices: { en: c.voice.voiceId ?? DEFAULT_VOICE } }
    delete c.voice.voiceId
  }
  delete c.greeting
  delete c.suggestedQuestions
  delete c.fallbackMessage
  delete c.language
  return c
}

const { data: bots, error } = await db.from('bots').select('id, name, config')
if (error) {
  console.error('Failed to load bots:', error.message)
  process.exit(1)
}

let migrated = 0
for (const bot of bots ?? []) {
  if (bot.config?.content && bot.config?.languages && bot.config?.voice?.voices) {
    console.log(`  skip (already new): ${bot.name}`)
    continue
  }
  const next = normalize(bot.config)
  const { error: upErr } = await db.from('bots').update({ config: next }).eq('id', bot.id)
  if (upErr) console.error(`  FAIL ${bot.name}: ${upErr.message}`)
  else {
    migrated++
    console.log(`  migrated: ${bot.name}`)
  }
}
console.log(`\nDone. Migrated ${migrated}/${(bots ?? []).length} bots.`)
