-- Keep manually/web-researched prospects separate from people discovered on
-- LinkedIn while preserving the existing free-text `source` evidence field.
alter table public.sales_leads
  add column lead_origin text not null default 'default',
  add column country text not null default 'Lithuania',
  add column linkedin_url text;

alter table public.sales_leads
  add constraint sales_leads_lead_origin_check
    check (lead_origin in ('default', 'linkedin')),
  add constraint sales_leads_country_present_check
    check (length(btrim(country)) > 0),
  add constraint sales_leads_linkedin_url_check
    check (linkedin_url is null or linkedin_url ~ '^https://(www\.)?linkedin\.com/');

create index sales_leads_origin_country_idx
  on public.sales_leads (lead_origin, country);

comment on column public.sales_leads.lead_origin is
  'Discovery channel used for the owner pipeline: default web research or LinkedIn.';
comment on column public.sales_leads.country is
  'Canonical English country name; LinkedIn UI groups Lithuania versus every other named country.';
comment on column public.sales_leads.linkedin_url is
  'LinkedIn or Sales Navigator profile URL when the lead originated on LinkedIn.';
