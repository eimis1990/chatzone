#!/usr/bin/env node
/**
 * Prepare localized cold-email snapshots for the 200 LinkedIn sales leads.
 *
 * Dry run:
 *   node --env-file=.env.local scripts/prepare-linkedin-sales-lead-emails.mjs \
 *     --output /tmp/loqara-linkedin-email-plan.json
 *
 * Apply a reviewed plan:
 *   node --env-file=.env.local scripts/prepare-linkedin-sales-lead-emails.mjs \
 *     --apply /tmp/loqara-linkedin-email-plan.json
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

const outputPath = argValue('--output') ?? '/tmp/loqara-linkedin-email-plan.json'
const applyPath = argValue('--apply')
const repairPath = argValue('--repair')
const model = argValue('--model') ?? 'gpt-4.1'

const nativePlatforms = new Set(['WooCommerce', 'Shopify', 'Magento', 'Verskis'])
const ltOptOut = 'Jei tokie pasiūlymai šiuo metu neaktualūs, tiesiog atsakykite „ne“ – daugiau nerašysiu.'
const enOptOut = 'If this is not relevant for you at the moment, simply reply “no” and I will not contact you again.'

const shared = {
  lt: {
    greeting: 'Laba diena,',
    nativeCommerce:
      'Esu Eimantas, kuriu „Loqara“ – lietuviškai ir kitomis kalbomis bendraujantį AI konsultantą e. parduotuvėms. Jis gali remtis jūsų svetainės turiniu ir tiesiogiai susietu prekių katalogu, todėl bet kuriuo paros metu gali atsakyti apie konkrečias prekes, kainas, likučius ir pristatymą. Jei prireikia žmogaus pagalbos, pokalbį perduoda jūsų komandai.',
    otherCommerce:
      'Esu Eimantas, kuriu „Loqara“ – lietuviškai ir kitomis kalbomis bendraujantį AI konsultantą e. parduotuvėms. Jis remiasi jūsų svetainės turiniu ir gali padėti lankytojams rasti informaciją apie prekių pasirinkimą, pristatymą ar grąžinimą. Prekių duomenų susiejimą įvertiname pagal naudojamą platformą, o prireikus pokalbį perduodame jūsų komandai.',
    service:
      'Esu Eimantas, kuriu „Loqara“ – lietuviškai ir kitomis kalbomis bendraujantį AI konsultantą svetainėms. Jis remiasi jūsų svetainės turiniu, todėl bet kuriuo paros metu gali atsakyti į lankytojų klausimus ir padėti rasti reikiamą informaciją apie jūsų paslaugas ar veiklą. Jei prireikia žmogaus pagalbos, pokalbį perduoda jūsų komandai.',
    context:
      'Tai nėra įprastas DUK langas: „Loqara“ supranta patikslinimus ir išlaiko pokalbio kontekstą, todėl lankytojas gali klausti natūraliai – panašiai kaip bendraudamas su konsultantu.',
    demo: 'Galiu be jokių įsipareigojimų paruošti trumpą demo pagal jūsų svetainę, kad patys įvertintumėte, ar tai būtų naudinga.',
    question: 'Ar norėtumėte jį pamatyti?',
    optOut: ltOptOut,
  },
  en: {
    greeting: 'Hello,',
    nativeCommerce:
      'I’m Eimantas, founder of Loqara — an AI shopping assistant for online stores. It can use your website content and a directly connected product catalogue to answer questions about specific products, prices, availability and delivery at any time. When human help is needed, it can hand the conversation to your team.',
    otherCommerce:
      'I’m Eimantas, founder of Loqara — an AI shopping assistant for online stores. It uses your website content to help visitors find information about product choice, delivery and returns. Product-data connectivity can be assessed for your platform, and conversations can be handed to your team when human help is needed.',
    service:
      'I’m Eimantas, founder of Loqara — an AI assistant for customer-facing websites. It uses your website content to answer visitors’ questions and help them find relevant information about your services or business at any time. When human help is needed, it can hand the conversation to your team.',
    context:
      'It is more than a standard FAQ widget: Loqara understands follow-up questions and keeps the conversation context, so visitors can ask naturally — much like speaking with a consultant.',
    demo: 'I can prepare a short, no-obligation demo based on your website so you can evaluate whether it would be useful.',
    question: 'Would you like to see it?',
    optOut: enOptOut,
  },
}

const cleanText = (value) =>
  String(value ?? '')
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#(?:39|x27);/gi, "'")
    .replace(/\s+/g, ' ')
    .trim()

const pickMeta = (html, pattern) => cleanText(html.match(pattern)?.[1] ?? '')

async function inspectWebsite(lead) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 15_000)
  try {
    const response = await fetch(lead.website, {
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; LoqaraResearch/1.0; +https://www.loqara.com)',
        Accept: 'text/html,application/xhtml+xml',
      },
    })
    if (!response.ok) return { status: response.status, final_url: response.url }
    const html = (await response.text()).slice(0, 800_000)
    const title = pickMeta(html, /<title[^>]*>([\s\S]*?)<\/title>/i)
    const description =
      pickMeta(html, /<meta[^>]+(?:name|property)=["'](?:description|og:description)["'][^>]+content=["']([^"']*)["'][^>]*>/i) ||
      pickMeta(html, /<meta[^>]+content=["']([^"']*)["'][^>]+(?:name|property)=["'](?:description|og:description)["'][^>]*>/i)
    const headings = [...html.matchAll(/<h[12][^>]*>([\s\S]*?)<\/h[12]>/gi)]
      .map((match) => cleanText(match[1]))
      .filter(Boolean)
      .slice(0, 6)
    return {
      status: response.status,
      final_url: response.url,
      title: title.slice(0, 240),
      description: description.slice(0, 500),
      headings,
    }
  } catch (error) {
    return { error: error?.name === 'AbortError' ? 'timeout' : String(error?.message ?? error) }
  } finally {
    clearTimeout(timeout)
  }
}

async function mapConcurrent(items, concurrency, fn) {
  const results = new Array(items.length)
  let cursor = 0
  async function worker() {
    while (cursor < items.length) {
      const index = cursor++
      results[index] = await fn(items[index], index)
    }
  }
  await Promise.all(Array.from({ length: concurrency }, worker))
  return results
}

async function fetchLeads() {
  const { data, error } = await db
    .from('sales_leads')
    .select('id,name,website,country,vertical,platform,hook,fit_note,email,email_subject,email_body,has_chatbot,status,status_updated_at,updated_at,lead_origin')
    .eq('lead_origin', 'linkedin')
    .order('score', { ascending: false })
    .order('name', { ascending: true })
  if (error) throw error
  if (data.length !== 200) throw new Error(`Expected 200 LinkedIn leads, found ${data.length}`)
  return data
}

const systemPrompt = `You write meticulous, calm B2B cold-email openings for Loqara, an AI website assistant.

For every supplied lead, return exactly one personalized opening paragraph of exactly two natural sentences in the requested language.

Sentence 1: state one concise, verifiable observation grounded only in official_site title, description, headings, the company name, country, vertical, or platform. Do not invent products, locations, services, customer behavior, popularity, scale, or business results. If official_site evidence is thin, safely describe what the company's website presents based on its vertical without pretending to know specifics.
Sentence 2: connect that observation to one concrete task an AI website assistant could help with. Phrase behavior as a possibility (could help, may need), never as a fact about what customers repeatedly ask.

Rules:
- Use Lithuanian when language is lt and English when language is en.
- Translate source-site evidence into the requested language. For language en, write every sentence in English even when the official website is Latvian, Estonian, or Lithuanian.
- Keep both sentences in one paragraph, normally 28–60 words total.
- Use the exact company spelling supplied.
- Sound personally written and commercially relevant, not flattering, clever, or pushy.
- Do not mention registry data, employee counts, LinkedIn, pricing, plan limits, or a demo.
- Do not claim the site lacks chat. If has_chatbot is true, acknowledge the existing assistant respectfully and give a concrete comparison reason.
- Native commerce platforms are WooCommerce, Shopify, Magento and Verskis. Only for native_commerce true may you imply direct catalogue grounding. For other platforms, do not claim access to live prices, stock, or catalogue integration.
- For healthcare, beauty services and medical businesses, restrict tasks to factual service, specialist, location, preparation and registration information. Never imply diagnosis, treatment, or personalized medical advice.
- Avoid hype and unsupported comparative claims.
- Do not include a greeting, subject, sign-off, markdown, or line breaks.
- Do not simply repeat the generic lead_context; it is a use-case hint, not verified company evidence.

Return valid JSON with exactly one result per supplied id.`

async function generateChunk(leads, repairReasons = new Map()) {
  const input = leads.map((lead) => ({
    id: lead.id,
    company: lead.name,
    country: lead.country,
    language: lead.country === 'Lithuania' ? 'lt' : 'en',
    vertical: lead.vertical,
    platform: lead.platform,
    native_commerce: nativePlatforms.has(lead.platform),
    has_chatbot: lead.has_chatbot === true,
    official_site: lead.official_site,
    lead_context: lead.hook,
    repair_reason: repairReasons.get(lead.id) ?? null,
  }))
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${API_KEY}`, 'Content-Type': 'application/json' },
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
          name: 'linkedin_sales_email_openings',
          strict: true,
          schema: {
            type: 'object',
            additionalProperties: false,
            required: ['results'],
            properties: {
              results: {
                type: 'array', minItems: leads.length, maxItems: leads.length,
                items: {
                  type: 'object', additionalProperties: false, required: ['id', 'opening'],
                  properties: { id: { type: 'string' }, opening: { type: 'string' } },
                },
              },
            },
          },
        },
      },
    }),
  })
  if (!response.ok) throw new Error(`OpenAI ${response.status}: ${(await response.text()).slice(0, 500)}`)
  const payload = await response.json()
  return JSON.parse(payload.choices[0].message.content).results
}

function isCommerce(lead) {
  return /(?:commerce|retail|furniture|interior|beauty|personal care|sporting goods|grocery|apparel)/i.test(lead.vertical ?? '')
}

function buildEmail(lead, opening) {
  const language = lead.country === 'Lithuania' ? 'lt' : 'en'
  const copy = shared[language]
  const pitch = nativePlatforms.has(lead.platform)
    ? copy.nativeCommerce
    : isCommerce(lead)
      ? copy.otherCommerce
      : copy.service
  const subject = language === 'lt'
    ? `${lead.name}: idėja jūsų svetainei`
    : `${lead.name}: an idea for your website`
  const body = [copy.greeting, opening.trim(), pitch, copy.context, copy.demo, copy.question, copy.optOut].join('\n\n')
  return { subject, body, language }
}

function sentenceCount(text) {
  return (text.match(/[.!?](?=\s|$)/g) ?? []).length
}

function openingProblems(opening) {
  const errors = []
  if (typeof opening !== 'string' || opening.length < 80 || opening.length > 650) {
    errors.push(`opening length ${opening?.length ?? 0}`)
  }
  if (/\n/.test(opening ?? '')) errors.push('opening contains a line break')
  if (sentenceCount(opening ?? '') !== 2) errors.push('opening must contain exactly two sentences')
  return errors
}

function openingQualityProblems(lead, opening) {
  const errors = [...openingProblems(opening)]
  const languageSample = String(opening ?? '').split(lead.name).join('')
  if (/(?:tikėtina|galima tikėtis|nėra (?:pateikta|išsamios)|pagal .*srit|appears|seems|likely|probably|based on (?:its|the) (?:vertical|platform)|does not provide|doesn't provide|may offer|could be|no detailed|no specific)/i.test(opening ?? '')) {
    errors.push('hedged, inferred, or meta claim')
  }
  if (/(?:customers?|buyers?|guests?|visitors?).{0,45}(?:often|repeatedly)|(?:often|repeatedly).{0,45}(?:customers?|buyers?|guests?|visitors?)|(?:klient|pirkėj|sveči|lankytoj).{0,45}(?:dažnai|nuolat)|(?:dažnai|nuolat).{0,45}(?:klient|pirkėj|sveči|lankytoj)/i.test(opening ?? '')) {
    errors.push('unsupported customer-behavior claim')
  }
  if (lead.country !== 'Lithuania' && (/[ąčęėįšųūž]/i.test(languageSample) || /\b(?:svetain(?:ė|ėje)|pristato|galėtų|lankytoj\w*|informacij\w*|paslaug\w*|siūlo|veikia|asistentas)\b/i.test(languageSample))) {
    errors.push('non-English wording in English opening')
  }
  if (lead.country === 'Lithuania' && /\b(?:AI website assistant|could help visitors|presents its|through its website)\b/i.test(opening ?? '')) {
    errors.push('English wording in Lithuanian opening')
  }
  if (!nativePlatforms.has(lead.platform) && /(?:check (?:product )?(?:availability|stock)|availability (?:or|and) delivery|live (?:availability|stock)|likuč|prieinamum|directly from (?:your|the) catalogue|remdamasis (?:realiu )?katalogo (?:duomenimis|informacija)|tiesiai iš katalogo|papildomai remdamasis katalog)/i.test(opening ?? '')) {
    errors.push('non-native platform implies unverified live product data')
  }
  return [...new Set(errors)]
}

function fallbackOpening(lead) {
  const commerce = isCommerce(lead)
  if (lead.country === 'Lithuania') {
    return commerce
      ? `${lead.name} savo svetainėje pristato ${String(lead.vertical).toLocaleLowerCase('lt-LT')} pasiūlą. AI konsultantas galėtų padėti lankytojams lengviau rasti tinkamas prekes ir palyginti svetainėje pateiktą informaciją.`
      : `${lead.name} savo svetainėje pristato informaciją apie savo veiklą ir paslaugas. AI konsultantas galėtų padėti lankytojams greičiau rasti aktualią informaciją ir pasirinkti tinkamą kitą žingsnį.`
  }
  return commerce
    ? `${lead.name} presents its ${String(lead.vertical).toLowerCase()} offering through its website. An AI assistant could help visitors find suitable products and compare the information available on the site.`
    : `${lead.name} presents information about its business and services through its website. An AI assistant could help visitors find relevant information and choose the appropriate next step.`
}

function validatePlan(plan, leads) {
  const errors = []
  const leadById = new Map(leads.map((lead) => [lead.id, lead]))
  const seen = new Set()
  if (plan.length !== 200) errors.push(`expected 200 rows, got ${plan.length}`)
  for (const row of plan) {
    const lead = leadById.get(row.id)
    if (!lead) { errors.push(`unknown id ${row.id}`); continue }
    if (seen.has(row.id)) errors.push(`duplicate id ${row.id}`)
    seen.add(row.id)
    errors.push(...openingQualityProblems(lead, row.opening).map((problem) => `${lead.name}: ${problem}`))
    if (!row.subject.startsWith(`${lead.name}: `)) errors.push(`${lead.name}: subject mismatch`)
    const paragraphs = row.body.split(/\n\s*\n/)
    if (paragraphs.length !== 7) errors.push(`${lead.name}: expected 7 paragraphs, got ${paragraphs.length}`)
    if (lead.country === 'Lithuania') {
      if (!row.body.startsWith('Laba diena,\n\n') || !row.body.endsWith(ltOptOut)) errors.push(`${lead.name}: invalid Lithuanian framing`)
      if (!row.subject.endsWith('idėja jūsų svetainei')) errors.push(`${lead.name}: invalid Lithuanian subject`)
    } else {
      if (!row.body.startsWith('Hello,\n\n') || !row.body.endsWith(enOptOut)) errors.push(`${lead.name}: invalid English framing`)
      if (!row.subject.endsWith('an idea for your website')) errors.push(`${lead.name}: invalid English subject`)
      if (/(?:Laba diena|Esu Eimantas|Ar norėtumėte|daugiau nerašysiu)/i.test(row.body)) errors.push(`${lead.name}: Lithuanian copy in English email`)
    }
    if (!nativePlatforms.has(lead.platform) && /(?:directly connected product catalogue|tiesiogiai susietu prekių katalogu)/i.test(row.body)) {
      errors.push(`${lead.name}: non-native platform claims direct catalogue connectivity`)
    }
  }
  for (const lead of leads) if (!seen.has(lead.id)) errors.push(`missing ${lead.name} (${lead.id})`)
  if (errors.length) throw new Error(`Plan validation failed:\n- ${errors.slice(0, 80).join('\n- ')}${errors.length > 80 ? `\n...and ${errors.length - 80} more` : ''}`)
}

async function generatePlan() {
  if (!API_KEY) throw new Error('OPENAI_API_KEY is required to generate a plan')
  const leads = await fetchLeads()
  console.log('Inspecting 200 official websites...')
  const siteEvidence = await mapConcurrent(leads, 10, inspectWebsite)
  const enriched = leads.map((lead, index) => ({ ...lead, official_site: siteEvidence[index] }))
  console.log(`Website inspection complete (${siteEvidence.filter((row) => row.title || row.description || row.headings?.length).length}/200 with usable metadata)`)

  const chunks = []
  for (let index = 0; index < enriched.length; index += 10) chunks.push(enriched.slice(index, index + 10))
  const generated = []
  for (let index = 0; index < chunks.length; index += 3) {
    const group = chunks.slice(index, index + 3)
    generated.push(...(await Promise.all(group.map((chunk) => generateChunk(chunk)))).flat())
    console.log(`Generated ${Math.min(index + group.length, chunks.length)}/${chunks.length} batches`)
  }
  const generatedById = new Map(generated.map((row) => [row.id, row.opening.trim()]))
  for (let pass = 1; pass <= 4; pass++) {
    const badLeads = enriched.filter((lead) => openingQualityProblems(lead, generatedById.get(lead.id) ?? '').length > 0)
    if (!badLeads.length) break
    console.log(`Repair pass ${pass}: regenerating ${badLeads.length} openings`)
    const reasons = new Map(badLeads.map((lead) => [lead.id, openingQualityProblems(lead, generatedById.get(lead.id) ?? '').join('; ')]))
    for (let index = 0; index < badLeads.length; index += 5) {
      const repaired = await generateChunk(badLeads.slice(index, index + 5), reasons)
      for (const row of repaired) generatedById.set(row.id, row.opening.trim())
    }
  }
  const remainingBad = enriched.filter((lead) => openingQualityProblems(lead, generatedById.get(lead.id) ?? '').length > 0)
  for (const lead of remainingBad) {
    console.log(`Using fact-only fallback opening for ${lead.name}`)
    generatedById.set(lead.id, fallbackOpening(lead))
  }
  const rows = enriched.map((lead) => {
    const opening = generatedById.get(lead.id) ?? ''
    return {
      id: lead.id,
      name: lead.name,
      website: lead.website,
      country: lead.country,
      vertical: lead.vertical,
      platform: lead.platform,
      email: lead.email,
      status: lead.status,
      status_updated_at: lead.status_updated_at,
      source_updated_at: lead.updated_at,
      official_site: lead.official_site,
      opening,
      ...buildEmail(lead, opening),
    }
  })
  validatePlan(rows, leads)
  writeFileSync(outputPath, `${JSON.stringify({ generated_at: new Date().toISOString(), model, validated: true, rows }, null, 2)}\n`)
  console.log(`Dry run complete: 200 validated rows written to ${outputPath}`)
}

async function repairSavedPlan(path) {
  if (!API_KEY) throw new Error('OPENAI_API_KEY is required to repair a plan')
  const saved = JSON.parse(readFileSync(path, 'utf8'))
  const leads = await fetchLeads()
  const savedById = new Map(saved.rows.map((row) => [row.id, row]))
  const enriched = leads.map((lead) => ({ ...lead, official_site: savedById.get(lead.id)?.official_site ?? {} }))
  const openingById = new Map(saved.rows.map((row) => [row.id, row.opening]))
  for (let pass = 1; pass <= 5; pass++) {
    const badLeads = enriched.filter((lead) => openingQualityProblems(lead, openingById.get(lead.id) ?? '').length > 0)
    if (!badLeads.length) break
    console.log(`Quality repair pass ${pass}: regenerating ${badLeads.length} openings`)
    const reasons = new Map(badLeads.map((lead) => [lead.id, openingQualityProblems(lead, openingById.get(lead.id) ?? '').join('; ')]))
    for (let index = 0; index < badLeads.length; index += 5) {
      const repaired = await generateChunk(badLeads.slice(index, index + 5), reasons)
      for (const row of repaired) openingById.set(row.id, row.opening.trim())
    }
  }
  const remainingBad = enriched.filter((lead) => openingQualityProblems(lead, openingById.get(lead.id) ?? '').length > 0)
  for (const lead of remainingBad) {
    console.log(`Using fact-only fallback opening for ${lead.name}`)
    openingById.set(lead.id, fallbackOpening(lead))
  }
  const rows = saved.rows.map((row) => {
    const lead = enriched.find((item) => item.id === row.id)
    const opening = openingById.get(row.id)
    return { ...row, opening, ...buildEmail(lead, opening) }
  })
  validatePlan(rows, leads)
  writeFileSync(path, `${JSON.stringify({ ...saved, repaired_at: new Date().toISOString(), validated: true, rows }, null, 2)}\n`)
  console.log(`Repair complete: 200 validated rows written to ${path}`)
}

async function applyPlan(path) {
  const saved = JSON.parse(readFileSync(path, 'utf8'))
  if (saved.validated !== true) throw new Error('Refusing to apply an unvalidated plan')
  const leads = await fetchLeads()
  validatePlan(saved.rows, leads)
  const currentById = new Map(leads.map((lead) => [lead.id, lead]))
  for (const row of saved.rows) {
    const current = currentById.get(row.id)
    if (current.updated_at !== row.source_updated_at) throw new Error(`${row.name} changed after the dry run`)
    if (current.status_updated_at !== row.status_updated_at) throw new Error(`${row.name} lifecycle changed after the dry run`)
  }
  let applied = 0
  for (const row of saved.rows) {
    const { data, error } = await db
      .from('sales_leads')
      .update({ email_subject: row.subject, email_body: row.body, updated_at: new Date().toISOString() })
      .eq('id', row.id)
      .eq('lead_origin', 'linkedin')
      .eq('updated_at', row.source_updated_at)
      .select('id')
      .single()
    if (error || !data) throw new Error(`${row.name}: ${error?.message ?? 'update did not match'}`)
    applied++
  }
  console.log(`Applied ${applied}/200 localized prepared-email updates`)
}

if (applyPath) await applyPlan(applyPath)
else if (repairPath) await repairSavedPlan(repairPath)
else await generatePlan()
