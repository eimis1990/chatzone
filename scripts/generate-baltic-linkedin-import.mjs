import fs from 'node:fs'

const seedPath = new URL('../supabase/research/baltic_linkedin_seed.json', import.meta.url)
const profilePath = new URL('../supabase/research/baltic_linkedin_profile_map.json', import.meta.url)

const excluded = new Set([
  'AstraMed',
  'Wooden Deals',
  'Baltic Pharma',
  'OMFY Group',
  'SexyStyle',
  'DUO GROUP',
  'HADAT Cosmetics',
  'ADI KARTES',
  'LIKA-J',
  'Saku Tervisekeskus',
  'EuroStocklot',
  'The Holistic Institute',
  'Standwood',
  'No Bananas',
  'Nicholaisen Baltic',
  'Sakala Hambaravi',
  'Pavlova Cafe',
  'ARI CARE',
])

const seeds = JSON.parse(fs.readFileSync(seedPath, 'utf8')).filter(
  (lead) => !excluded.has(lead.company),
)
const profiles = new Map(
  JSON.parse(fs.readFileSync(profilePath, 'utf8')).map((entry) => [
    entry.person,
    entry.profile_url,
  ]),
)

if (seeds.length !== 100) {
  throw new Error(`Expected 100 qualified seeds, received ${seeds.length}`)
}

const counts = Object.groupBy(seeds, (lead) => lead.country)
if (counts.Latvia?.length !== 44 || counts.Estonia?.length !== 56) {
  throw new Error('Expected a 44 Latvia / 56 Estonia qualified split')
}

function sql(value) {
  if (value === null || value === undefined) return 'null'
  return `'${String(value).replaceAll("'", "''")}'`
}

function vertical(company) {
  if (/hotel|resort|manor|spa|tribe|amrita|kārļamuiža|labocca/i.test(company)) {
    return 'Hospitality'
  }
  if (/clinic|medic|health|synlab|tervis|provida|maxilla|renalis|exomedica/i.test(company)) {
    return 'Healthcare'
  }
  if (/furniture|occo|seisuk|ergonomik|biostone|decnord|aj produkti/i.test(company)) {
    return 'Furniture and interiors'
  }
  if (/beauty|cosmetic|hair|madara|labrains|eurobio|tradehouse|salonshop/i.test(company)) {
    return 'Beauty and personal care'
  }
  return 'Retail and e-commerce'
}

function hookFor(verticalName) {
  if (verticalName === 'Hospitality') {
    return 'Guests repeatedly ask about rooms, availability, amenities, policies and booking; an AI assistant could answer and qualify enquiries around the clock.'
  }
  if (verticalName === 'Healthcare') {
    return 'Patients need clear help choosing services, understanding preparation and reaching booking without the assistant giving medical diagnoses.'
  }
  if (verticalName === 'Furniture and interiors') {
    return 'Buyers often need help with dimensions, materials, configuration, delivery and matching products to a room or project.'
  }
  if (verticalName === 'Beauty and personal care') {
    return 'A broad beauty or personal-care range creates repeat questions about product choice, suitability, use and delivery.'
  }
  return 'A customer-facing catalogue creates repeat questions about product choice, availability, delivery, returns and the best next step.'
}

const values = seeds.map((lead) => {
  const verticalName = vertical(lead.company)
  const linkedinUrl = profiles.get(lead.person) ?? null
  const score = /CEO|Owner|Founder|Managing Director|Head of Ecommerce/i.test(lead.title)
    ? 90
    : 84

  return `    (${[
    sql(lead.company),
    sql(lead.website),
    sql(lead.city),
    sql(verticalName),
    sql(lead.person),
    sql(lead.title),
    sql(linkedinUrl),
    sql(hookFor(verticalName)),
    score,
  ].join(', ')})`
})

const migration = `-- Qualified from the user's Latvia/Estonia Sales Navigator search.
-- Both person geography and company headquarters were restricted to Latvia or
-- Estonia. Public personal contact details are intentionally omitted.
with qualified_leads (
  name,
  website,
  city,
  vertical,
  buyer,
  buyer_title,
  linkedin_url,
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
  '1–200 employees by Sales Navigator filter; exact headcount not independently verified',
  lead.hook,
  'Active official website and relevant buyer role verified 2026-08-28. LinkedIn was used for discovery; no personal email or phone data was collected.',
  'LinkedIn Sales Navigator Latvia/Estonia qualified search; official website verified 2026-08-28: ' || lead.website,
  lead.score,
  lead.buyer_title || '; active official website; country confirmed by both person geography and company-HQ filters',
  null,
  'ready',
  'linkedin',
  case when lead.website is not null then lead.country end,
  lead.linkedin_url
from (
  select qualified_leads.*, case
    when website in (${seeds.filter((lead) => lead.country === 'Latvia').map((lead) => sql(lead.website)).join(', ')}) then 'Latvia'
    else 'Estonia'
  end as country
  from qualified_leads
) as lead
where not exists (
  select 1
  from public.sales_leads as existing
  where lower(
      regexp_replace(
        regexp_replace(existing.website, '^https?://(www\\.)?', ''),
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
    or (
      lead.linkedin_url is not null
      and existing.linkedin_url = lead.linkedin_url
    )
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
    and country in ('Latvia', 'Estonia')
    and source like 'LinkedIn Sales Navigator Latvia/Estonia qualified search;%';

  if imported_count <> 100 then
    raise exception
      'Expected exactly 100 qualified Latvia/Estonia LinkedIn leads, found %',
      imported_count;
  end if;
end
$$;
`

process.stdout.write(migration)
