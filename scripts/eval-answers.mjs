#!/usr/bin/env node
/**
 * End-to-end answer-accuracy eval: replays curated questions through the real
 * /api/chat pipeline and grades each answer with an LLM judge against required
 * facts. The summary number is the one to beat — Parnidia publishes ~81%.
 *
 * Run (dev server up):
 *   LOQARA_URL=http://localhost:3000 BOT_KEY=<bot public key> \
 *     node --env-file=.env.local scripts/eval-answers.mjs [--file scripts/answer-eval-cases.json]
 *
 * NOTE: each question creates a real conversation on the bot — use a test bot,
 * or clean up afterwards.
 */
import { readFileSync } from 'node:fs'

const arg = (name, dflt) => {
  const i = process.argv.indexOf(`--${name}`)
  return i > -1 && process.argv[i + 1] ? process.argv[i + 1] : dflt
}
const base = process.env.LOQARA_URL ?? 'http://localhost:3000'
const key = process.env.BOT_KEY
const OAI = process.env.OPENAI_API_KEY
if (!key) throw new Error('BOT_KEY (bot public key) required')
if (!OAI) throw new Error('OPENAI_API_KEY required (LLM judge)')
const cases = JSON.parse(readFileSync(arg('file', 'scripts/answer-eval-cases.json'), 'utf8'))

async function ask(question) {
  const res = await fetch(`${base}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      publicKey: key,
      visitorId: `eval-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      message: question,
    }),
  })
  const text = await res.text()
  let answer = ''
  let products = []
  for (const lineStr of text.split('\n')) {
    if (!lineStr.trim()) continue
    try {
      const obj = JSON.parse(lineStr)
      if (obj.t === 'text') answer += obj.v
      if (obj.t === 'products' && Array.isArray(obj.v)) products = obj.v
    } catch {
      /* ignore non-JSON lines */
    }
  }
  // Product cards render separately from the text — describe them to the judge
  // or every "here are some options:" reply looks like an empty promise.
  if (products.length) {
    const titles = products.slice(0, 6).map((p) => p.title).join('; ')
    answer += `\n\n[widget rendered ${products.length} product cards: ${titles}]`
  }
  return answer
}

async function judge(c, answer) {
  const r = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${OAI}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      temperature: 0,
      messages: [
        {
          role: 'user',
          content:
            `Question (${c.language}): ${c.question}\n\nAssistant answer:\n${answer}\n\n` +
            `Required facts (all must be present or correctly conveyed): ${JSON.stringify(c.mustInclude)}\n\n` +
            'Reply with exactly PASS or FAIL followed by a one-line reason.',
        },
      ],
    }),
  })
  if (!r.ok) throw new Error(`judge: ${r.status}`)
  return (await r.json()).choices[0].message.content ?? ''
}

let pass = 0
for (const c of cases) {
  const answer = await ask(c.question)
  const verdict = answer ? await judge(c, answer) : 'FAIL empty answer'
  const ok = verdict.startsWith('PASS')
  if (ok) pass++
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${c.question}\n      ${verdict.slice(0, 160)}`)
}
console.log(
  `\nanswer accuracy: ${pass}/${cases.length} (${Math.round((100 * pass) / cases.length)}%) — Parnidia claims 81%`,
)
