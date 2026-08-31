import fs from 'node:fs'

const researchPath = new URL(
  '../supabase/research/lithuania_linkedin_email_verified.json',
  import.meta.url,
)
const leads = JSON.parse(fs.readFileSync(researchPath, 'utf8'))

if (leads.length !== 63) {
  throw new Error(`Expected 63 email-verified Lithuanian leads, received ${leads.length}`)
}

if (leads.some((lead) => !lead.email || lead.has_chatbot !== false)) {
  throw new Error('Every lead must have a public verified email and no detected chatbot')
}

function sql(value) {
  if (value === null || value === undefined) return 'null'
  return `'${String(value).replaceAll("'", "''")}'`
}

function city(geography) {
  if (!geography || geography === 'Lithuania') return null
  return geography.split(',')[0].trim() || null
}

function vertical(company) {
  if (/hotel|restaurant|apvalaus stalo|green town/i.test(company)) {
    return 'Hospitality'
  }
  if (/pulsetto|self\.co|limedika|eurovaistine|placenta|ortopro|šypsen|lexano|scienceforbrain|gadarvy|medical|amber esthetic|hi-labs|longevity|medicinos namai/i.test(company)) {
    return 'Healthcare'
  }
  if (/woodline|lematics|arte domestica|hovden|idwdisplay|tankos|baldų mozaika|boisrois|furniture|fitsout|admodum|emko|gergama|arredo|baldai jums|jot\.jot/i.test(company)) {
    return 'Furniture and interiors'
  }
  if (/douglas|eurokos|linen tales|c&d style|elevita|aromika|aromatic/i.test(company)) {
    return 'Beauty, fashion and personal care'
  }
  if (/greet|entryscope|witsee/i.test(company)) return 'Technology'
  return 'Retail, e-commerce and services'
}

function hookFor(verticalName) {
  if (verticalName === 'Healthcare') {
    return 'Patients and buyers need clear help choosing services or products, understanding preparation and reaching the right booking or enquiry path without the assistant giving medical diagnoses.'
  }
  if (verticalName === 'Hospitality') {
    return 'Guests repeatedly ask about availability, menus, amenities, policies and bookings; an AI assistant could answer and qualify enquiries around the clock.'
  }
  if (verticalName === 'Furniture and interiors') {
    return 'Buyers often need help with dimensions, materials, configuration, delivery and matching products to a room or project.'
  }
  if (verticalName === 'Beauty, fashion and personal care') {
    return 'A broad product range creates repeat questions about product choice, suitability, use, availability and delivery.'
  }
  if (verticalName === 'Technology') {
    return 'Prospects need fast answers about fit, setup, pricing and the best next step; an AI assistant could qualify and route enquiries around the clock.'
  }
  return 'A customer-facing catalogue or service range creates repeat questions about choice, availability, delivery, policies and the best next step.'
}

function evidencePage(lead) {
  return (
    lead.checked_pages.find((page) => /contact|kontakt|susisiek|apie-mus|about/i.test(page)) ??
    lead.website
  )
}

const values = leads.map((lead) => {
  const verticalName = vertical(lead.company)
  return `    (${[
    sql(lead.company),
    sql(lead.website),
    sql(city(lead.geography)),
    sql(verticalName),
    sql(lead.person),
    sql(lead.title),
    sql(lead.email),
    sql(lead.linkedin_url),
    sql(evidencePage(lead)),
    sql(hookFor(verticalName)),
    90,
  ].join(', ')})`
})

const migration = `-- Qualified from the user's Lithuanian Sales Navigator search.
-- Every row has an active official website, a public business email published
-- by that website, a relevant decision-maker, and no detected website chatbot.
with qualified_leads (
  name,
  website,
  city,
  vertical,
  buyer,
  buyer_title,
  email,
  linkedin_url,
  email_evidence_url,
  hook,
  score
) as (
  values
${values.join(',\n')}
)
insert into public.sales_leads (
  name,
  website,
  city,
  vertical,
  ceo,
  email,
  size_info,
  hook,
  fit_note,
  source,
  score,
  score_why,
  has_chatbot,
  status,
  lead_origin,
  country,
  linkedin_url
)
select
  lead.name,
  lead.website,
  lead.city,
  lead.vertical,
  lead.buyer,
  lead.email,
  '1–200 employees by Sales Navigator filter; exact headcount not independently verified',
  lead.hook,
  'Relevant buyer and active official website verified 2026-08-28. The email is a public business contact published on the official website; it was not guessed or obtained from paid enrichment.',
  'LinkedIn Sales Navigator Lithuania email-verified batch; official email evidence 2026-08-28: ' || lead.email_evidence_url,
  lead.score,
  lead.buyer_title || '; Lithuania confirmed by person geography and company-HQ filters; official website email verified',
  false,
  'ready',
  'linkedin',
  'Lithuania',
  lead.linkedin_url
from qualified_leads as lead
where not exists (
  select 1
  from public.sales_leads as existing
  where lower(
      regexp_replace(
        regexp_replace(coalesce(existing.website, ''), '^https?://(www\\.)?', ''),
        '/.*$',
        ''
      )
    ) = lower(
      regexp_replace(
        regexp_replace(lead.website, '^https?://(www\\.)?', ''),
        '/.*$',
        ''
      )
    )
    or lower(existing.email) = lower(lead.email)
    or existing.linkedin_url = lead.linkedin_url
)
on conflict (website) do nothing;

do $$
declare
  imported_count integer;
begin
  select count(*)
  into imported_count
  from public.sales_leads
  where lead_origin = 'linkedin'
    and country = 'Lithuania'
    and source like 'LinkedIn Sales Navigator Lithuania email-verified batch;%';

  if imported_count <> 63 then
    raise exception
      'Expected exactly 63 email-verified Lithuanian LinkedIn leads, found %',
      imported_count;
  end if;
end
$$;
`

process.stdout.write(migration)
