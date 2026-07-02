#!/usr/bin/env node
/**
 * Delete the "Aurora Living" demo account created for the Features screenshots
 * (2026-07-02). Removes, in order:
 *   1. the bot's ElevenLabs voice agent (provisioned during the voice-call shot)
 *   2. the organization (cascades: bots → conversations/messages, sources → chunks, leads, membership)
 *   3. the auth user demo@loqara.com (cascades its profile)
 *
 * Usage: node --env-file=.env.local scripts/demo-cleanup.mjs
 * Idempotent — safe to run if parts were already removed.
 */
import { createClient } from '@supabase/supabase-js'

const ORG_ID = '2eaef6b8-977c-4fb9-b226-9226a09bcea9'
const USER_ID = 'a3860d1f-5b89-4411-89e0-f28402e9367d'
const USER_EMAIL = 'demo@loqara.com'

const s = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } },
)

// 1. ElevenLabs agents for this org's bots
const { data: bots } = await s
  .from('bots')
  .select('id, name, elevenlabs_agent_id')
  .eq('org_id', ORG_ID)
for (const bot of bots ?? []) {
  if (!bot.elevenlabs_agent_id) continue
  const res = await fetch(
    `https://api.elevenlabs.io/v1/convai/agents/${bot.elevenlabs_agent_id}`,
    { method: 'DELETE', headers: { 'xi-api-key': process.env.ELEVENLABS_API_KEY } },
  )
  console.log(`elevenlabs agent ${bot.elevenlabs_agent_id} (${bot.name}):`, res.status)
}

// 2. Organization (cascades everything org-scoped)
const { error: orgErr } = await s.from('organizations').delete().eq('id', ORG_ID)
console.log('organization:', orgErr ? orgErr.message : 'deleted')

// 3. Auth user
const { data: list } = await s.auth.admin.listUsers()
const user = list?.users.find((u) => u.id === USER_ID || u.email === USER_EMAIL)
if (user) {
  const { error } = await s.auth.admin.deleteUser(user.id)
  console.log('auth user:', error ? error.message : 'deleted')
} else {
  console.log('auth user: already gone')
}

console.log('\nDemo account cleanup complete.')
