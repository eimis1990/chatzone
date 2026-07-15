#!/usr/bin/env node
/**
 * Generate and apply safer, relevance-led Lithuanian cold-email bodies for
 * sales_leads. Generation is a dry run by default and writes a reviewable JSON
 * plan. Applying requires the explicit --apply flag and an existing plan.
 *
 * Generate:
 *   node --env-file=.env.local scripts/rewrite-sales-lead-emails.mjs \
 *     --output /tmp/loqara-sales-email-rewrite.json
 *
 * Apply the reviewed plan:
 *   node --env-file=.env.local scripts/rewrite-sales-lead-emails.mjs \
 *     --apply /tmp/loqara-sales-email-rewrite.json
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const API_KEY = process.env.OPENAI_API_KEY
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_KEY) {
  throw new Error('NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required')
}

const db = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
})

const argValue = (name) => {
  const index = process.argv.indexOf(name)
  return index >= 0 ? process.argv[index + 1] : undefined
}

const outputPath = argValue('--output') ?? '/tmp/loqara-sales-email-rewrite.json'
const applyPath = argValue('--apply')
const repairPath = argValue('--repair')
const model = argValue('--model') ?? 'gpt-4.1'

const commerceParagraph =
  'Esu Eimantas, kuriu „Loqara“ – lietuviškai bendraujantį AI konsultantą e. parduotuvėms. Jis remiasi jūsų svetainės turiniu ir prekių katalogu, todėl bet kuriuo paros metu gali atsakyti apie konkrečias prekes, kainas, likučius ir pristatymą. Jei prireikia žmogaus pagalbos, pokalbį perduoda jūsų komandai.'
const serviceParagraph =
  'Esu Eimantas, kuriu „Loqara“ – lietuviškai bendraujantį AI konsultantą svetainėms. Jis remiasi jūsų svetainės turiniu, todėl bet kuriuo paros metu gali atsakyti į lankytojų klausimus ir padėti rasti reikiamą informaciją apie jūsų paslaugas ar veiklą. Jei prireikia žmogaus pagalbos, pokalbį perduoda jūsų komandai.'
const sharedParagraphs = [
  'Tai nėra įprastas DUK langas: „Loqara“ supranta patikslinimus ir išlaiko pokalbio kontekstą, todėl lankytojas gali klausti natūraliai – panašiai kaip bendraudamas su konsultantu.',
  'Galiu be jokių įsipareigojimų paruošti trumpą demo pagal jūsų svetainę, kad patys įvertintumėte, ar tai būtų naudinga.',
  'Ar norėtumėte jį pamatyti?',
]

const buildBody = (opening, vertical) => [
  'Laba diena,',
  opening.trim(),
  vertical === 'E-komercija' ? commerceParagraph : serviceParagraph,
  ...sharedParagraphs,
].join('\n\n')

async function fetchLeads() {
  const { data, error } = await db
    .from('sales_leads')
    .select('id,name,website,vertical,hook,fit_note,email_body,has_chatbot,status,updated_at')
    .order('score', { ascending: false })

  if (error) throw error
  return data
}

function currentOpening(body) {
  return body?.split(/\n\s*\n/)[1]?.trim() ?? ''
}

function neutralizeUnsupportedClaims(text) {
  return (text ?? '')
    .replace(/(?:pirkėjai|klientai)\s+(?:nuolat|dažnai)\s+(?:teiraujasi|klausia)/giu, 'renkantis gali kilti klausimų')
    .replace(/(?:pirkėjai|klientai)\s+vis dar (?:rašo|skambina)/giu, 'renkantis gali prireikti informacijos')
    .replace(/\b(?:dažnai|nuolat|turbūt|tikriausiai)\b/giu, '')
    .replace(/\bkiekvienas klientas\b/giu, 'klientas')
}

const systemPrompt = `You are a meticulous Lithuanian B2B cold-email editor.

For each supplied sales lead, write ONLY a personalized opening paragraph of exactly two natural Lithuanian sentences. The paragraph will appear after “Laba diena,” and before a fixed explanation of an AI website consultant.

Sentence 1: make one concise, verifiable observation about the business or organization, based only on facts in current_opening or hook. Do not use revenue, employee count, or other registry facts from fit_note unless they already appear in current_opening or hook.

Sentence 2: connect the observation to one concrete website task an AI consultant could help with. For commerce this may be comparing products, understanding dimensions/materials/compatibility, or checking catalog information; for other verticals it should be a relevant visitor information need. Phrase user behavior as a possibility or task (“galėtų”, “renkantis svarbu”, “padėtų”), never as an unsupported fact (“pirkėjai nuolat teiraujasi”, “klientai dažnai klausia”, “vis dar rašo”).

Rules:
- Keep the two sentences together as one paragraph, normally 25–55 words total.
- Sound personally written, calm, specific, and commercially relevant—not flattering, clever, or pushy.
- Do not start with “Pastebėjau, kad” unless it is clearly the most natural option; vary openings across the batch.
- Do not dump long brand lists. Retain at most two useful examples.
- Do not claim that Loqara guarantees technical, medical, sizing, or compatibility advice. It may help find or compare information available in the catalog.
- Do not mention pricing, plan limits, revenue, employee count, or a demo.
- Do not say a site lacks a chatbot.
- If has_chatbot is true, respectfully acknowledge that the site already has a chat assistant and make the comparison reason concrete: Lithuanian contextual conversation and/or direct catalog grounding. Never disparage the incumbent.
- For E-komercija leads, you may refer to products and catalog information. For every other vertical, refer to services, website information, or a knowledge base—never a product catalog, stock, or shoppers.
- For healthcare, dentistry, rehabilitation, veterinary, and beauty-service leads, limit the use case to factual information about services, specialists, locations, preparation, or registration. Never imply medical diagnosis or personalized treatment advice.
- Avoid hype such as “naujos kartos” and unprovable comparative claims such as “dar tiksliau”.
- Use “AI konsultantas”, not “botas” or “robotas”.
- Do not include a greeting, subject, sign-off, markdown, quotation marks around the whole paragraph, or line breaks.
- Preserve Lithuanian diacritics and correct company/brand spelling from the supplied facts.

Return valid JSON matching the requested schema, with exactly one result for every supplied id.`

async function generateChunk(leads, rejectedById = new Map()) {
  const input = leads.map((lead) => ({
    id: lead.id,
    name: lead.name,
    website: lead.website,
    vertical: lead.vertical,
    has_chatbot: lead.has_chatbot === true,
    current_opening: neutralizeUnsupportedClaims(currentOpening(lead.email_body)),
    hook: neutralizeUnsupportedClaims(lead.hook),
    fit_note: lead.fit_note,
    rejected_draft: rejectedById.get(lead.id)?.opening,
    rejected_because: rejectedById.get(lead.id)?.problems,
  }))

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: JSON.stringify(input) },
      ],
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'sales_lead_openings',
          strict: true,
          schema: {
            type: 'object',
            additionalProperties: false,
            required: ['results'],
            properties: {
              results: {
                type: 'array',
                minItems: leads.length,
                maxItems: leads.length,
                items: {
                  type: 'object',
                  additionalProperties: false,
                  required: ['id', 'opening'],
                  properties: {
                    id: { type: 'string' },
                    opening: { type: 'string' },
                  },
                },
              },
            },
          },
        },
      },
    }),
  })

  if (!response.ok) {
    throw new Error(`OpenAI ${response.status}: ${(await response.text()).slice(0, 500)}`)
  }

  const payload = await response.json()
  return JSON.parse(payload.choices[0].message.content).results
}

const unsupportedClaims = [
  /pirkėjai\s+(?:nuolat|dažnai)\s+(?:teiraujasi|klausia)/iu,
  /klientai\s+(?:nuolat|dažnai)\s+(?:teiraujasi|klausia)/iu,
  /vis dar (?:rašo|skambina)/iu,
  /(?:pirkėj|klient|pacient|lankyto|sveči|tėv|mokin|naujok|žvej|akvariumist|užklaus|klausim|informacij).{0,80}(?:dažnai|nuolat)/iu,
  /(?:dažnai|nuolat).{0,80}(?:pirkėj|klient|pacient|lankyto|sveči|tėv|mokin|naujok|žvej|akvariumist|užklaus|klausim|iešk|teirauj|dom|kyla|reik|svarb|tenka|pasirenk|sulauk)/iu,
  /kiekvien\w*\s+(?:klient|pirkėj|pacient|lankyto|užklaus|klausim)/iu,
  /(?:lieka be atsakymo|laukia iki ryto|kauptis pašte|užima registratūros laiką|tenka atsakyti asmeniškai)/iu,
]

function rowProblems(row, lead) {
  const errors = []
  if (typeof row?.opening !== 'string' || row.opening.length < 80 || row.opening.length > 550) {
    errors.push(`opening length ${row?.opening?.length ?? 0}`)
  }
  if (/\n/.test(row?.opening ?? '')) errors.push('opening contains a line break')
  if (unsupportedClaims.some((pattern) => pattern.test(row?.opening ?? ''))) {
    errors.push('unsupported buyer-behavior claim')
  }
  if (/(?:naujos kartos|dar tiksliau)/iu.test(row?.opening ?? '')) errors.push('hype or unproved comparison')
  if (lead?.vertical !== 'E-komercija' && /(?:katalog|likuč|pirkėj)/iu.test(row?.opening ?? '')) {
    errors.push('non-commerce opening uses commerce language')
  }
  if (
    lead?.has_chatbot === true &&
    !/(?:jau|naudojate|turite|veikia|įdiegtas).{0,60}(?:pokalbi|asistent|chat)/iu.test(row?.opening ?? '')
  ) {
    errors.push('existing chatbot is not acknowledged')
  }
  return errors
}

function validatePlan(plan, leads) {
  const errors = []
  const leadById = new Map(leads.map((lead) => [lead.id, lead]))
  const seen = new Set()

  if (plan.length !== leads.length) {
    errors.push(`expected ${leads.length} rows, got ${plan.length}`)
  }

  for (const row of plan) {
    const lead = leadById.get(row.id)
    if (!lead) errors.push(`unknown id ${row.id}`)
    if (seen.has(row.id)) errors.push(`duplicate id ${row.id}`)
    seen.add(row.id)

    errors.push(...rowProblems(row, lead).map((problem) => `${lead?.name ?? row.id}: ${problem}`))

    const body = buildBody(row.opening, lead?.vertical)
    if (body.includes('1 500') || body.includes('12 000')) {
      errors.push(`${lead?.name ?? row.id}: old plan-limit language remains`)
    }
  }

  for (const lead of leads) {
    if (!seen.has(lead.id)) errors.push(`missing ${lead.name} (${lead.id})`)
  }

  if (errors.length) {
    throw new Error(`Plan validation failed:\n- ${errors.join('\n- ')}`)
  }
}

async function generatePlan() {
  if (!API_KEY) throw new Error('OPENAI_API_KEY is required to generate a plan')
  const leads = await fetchLeads()
  const chunks = []
  for (let index = 0; index < leads.length; index += 10) chunks.push(leads.slice(index, index + 10))

  const generated = []
  for (let index = 0; index < chunks.length; index += 3) {
    const group = chunks.slice(index, index + 3)
    const results = await Promise.all(group.map(generateChunk))
    generated.push(...results.flat())
    console.log(`Generated ${Math.min(index + group.length, chunks.length)}/${chunks.length} batches`)
  }

  const generatedById = new Map(generated.map((row) => [row.id, row]))
  let plan = leads.map((lead) => ({
    id: lead.id,
    name: lead.name,
    website: lead.website,
    vertical: lead.vertical,
    status: lead.status,
    has_chatbot: lead.has_chatbot,
    source_updated_at: lead.updated_at,
    previous_opening: currentOpening(lead.email_body),
    opening: generatedById.get(lead.id)?.opening?.trim() ?? '',
  }))

  plan = await repairPlan(plan, leads)

  const generatedAt = new Date().toISOString()
  writeFileSync(outputPath, `${JSON.stringify({ generated_at: generatedAt, model, validated: false, rows: plan }, null, 2)}\n`)
  validatePlan(plan, leads)
  writeFileSync(outputPath, `${JSON.stringify({ generated_at: generatedAt, model, validated: true, rows: plan }, null, 2)}\n`)
  console.log(`Dry run complete: ${plan.length} validated rows written to ${outputPath}`)
}

async function repairPlan(startingPlan, leads) {
  let plan = startingPlan
  for (let pass = 1; pass <= 5; pass++) {
    const badRows = plan.filter((row) => rowProblems(row, leads.find((lead) => lead.id === row.id)).length > 0)
    const badLeads = badRows.map((row) => leads.find((lead) => lead.id === row.id))
    if (!badLeads.length) break

    console.log(`Repair pass ${pass}: regenerating ${badLeads.length} openings`)
    const rejectedById = new Map(
      badRows.map((row) => [
        row.id,
        { opening: row.opening, problems: rowProblems(row, leads.find((lead) => lead.id === row.id)) },
      ]),
    )
    const repaired = []
    for (let index = 0; index < badLeads.length; index += 10) {
      repaired.push(...(await generateChunk(badLeads.slice(index, index + 10), rejectedById)))
    }
    const repairedById = new Map(repaired.map((row) => [row.id, row.opening.trim()]))
    plan = plan.map((row) => ({ ...row, opening: repairedById.get(row.id) ?? row.opening }))
  }
  return plan
}

async function repairSavedPlan(path) {
  if (!API_KEY) throw new Error('OPENAI_API_KEY is required to repair a plan')
  const saved = JSON.parse(readFileSync(path, 'utf8'))
  const leads = await fetchLeads()
  const plan = await repairPlan(saved.rows, leads)
  const repairedAt = new Date().toISOString()
  writeFileSync(path, `${JSON.stringify({ ...saved, repaired_at: repairedAt, validated: false, rows: plan }, null, 2)}\n`)
  validatePlan(plan, leads)
  writeFileSync(path, `${JSON.stringify({ ...saved, repaired_at: repairedAt, validated: true, rows: plan }, null, 2)}\n`)
  console.log(`Repair complete: ${plan.length} validated rows written to ${path}`)
}

async function applyPlan(path) {
  const saved = JSON.parse(readFileSync(path, 'utf8'))
  const plan = saved.rows
  const leads = await fetchLeads()
  validatePlan(plan, leads)

  const currentById = new Map(leads.map((lead) => [lead.id, lead]))
  for (const row of plan) {
    const current = currentById.get(row.id)
    if (current.updated_at !== row.source_updated_at) {
      throw new Error(`${row.name} changed after the dry run; regenerate the plan before applying`)
    }
  }

  let applied = 0
  for (const row of plan) {
    const { error } = await db
      .from('sales_leads')
      .update({ email_body: buildBody(row.opening, row.vertical), updated_at: new Date().toISOString() })
      .eq('id', row.id)
      .eq('updated_at', row.source_updated_at)
      .select('id')
      .single()

    if (error) throw new Error(`${row.name}: ${error.message}`)
    applied++
  }

  console.log(`Applied ${applied}/${plan.length} prepared-email updates`)
}

if (applyPath) await applyPlan(applyPath)
else if (repairPath) await repairSavedPlan(repairPath)
else await generatePlan()
