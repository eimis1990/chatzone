// Records the spoken greetings the landing page's widget playground plays
// (components/landing/night/Playground.tsx), one per language, with ElevenLabs.
// The text here must match GREETING in that file.
//
// Usage: node scripts/gen-landing-greeting.mjs [voiceId]
// Reads ELEVENLABS_API_KEY from .env.local; writes public/landing/greeting-<lang>.mp3.
import { readFileSync, writeFileSync } from 'node:fs'

const GREETING = {
  en: 'Hi! I’m your store’s assistant. Ask me about products, orders or delivery.',
  lt: 'Sveiki! Aš jūsų parduotuvės asistentas. Klauskite apie prekes, užsakymus ar pristatymą.',
}
// The product's default voice (lib/ai/elevenlabs-agent.ts DEFAULT_VOICE_ID).
const voiceId = process.argv[2] ?? '21m00Tcm4TlvDq8ikWAM'

const key = readFileSync('.env.local', 'utf8').match(/^ELEVENLABS_API_KEY=(.+)$/m)?.[1]?.trim()
if (!key) throw new Error('ELEVENLABS_API_KEY is not set in .env.local')

for (const [lang, text] of Object.entries(GREETING)) {
  const res = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_64`,
    {
      method: 'POST',
      headers: { 'xi-api-key': key, 'Content-Type': 'application/json' },
      // eleven_v3 speaks Lithuanian; language_code keeps it from guessing.
      body: JSON.stringify({ text, model_id: 'eleven_v3', language_code: lang }),
    },
  )
  if (!res.ok) throw new Error(`${lang}: ${res.status} ${await res.text()}`)
  const file = `public/landing/greeting-${lang}.mp3`
  writeFileSync(file, Buffer.from(await res.arrayBuffer()))
  console.log(`wrote ${file}`)
}
