-- Add only company-published emails to the first 37 qualified Lithuanian
-- LinkedIn leads. Rows are matched by stable business data rather than UUIDs.
create temporary table lt_linkedin_email_enrichment (
  name text not null,
  website text not null,
  email text not null,
  evidence_url text not null,
  primary key (name, website)
) on commit drop;

insert into lt_linkedin_email_enrichment (name, website, email, evidence_url)
values
  ('1STOP', 'https://www.1stop.lt', 'info@1stop.lt', 'https://www.1stop.lt/kontaktai'),
  ('Baltijos-Amerikos Klinika', 'https://bak.lt', 'info@bak.lt', 'https://bak.lt/'),
  ('Bosaddo', 'https://bosaddo.com', 'info@bosaddo.com', 'https://bosaddo.com/pages/contacts'),
  ('CASE4YOU', 'https://www.case4you.lt', 'info@case4you.lt', 'https://www.case4you.lt/'),
  ('Coaty Coat', 'https://www.coatycoat.com', 'info@coatycoat.com', 'https://www.coatycoat.com/kontaktai'),
  ('Cut My Fashion', 'https://cutmyfashion.lt', 'info@cutmyfashion.lt', 'https://cutmyfashion.lt/pages/susisiekite-su-mumis'),
  ('DekoForma', 'https://www.dekoforma.lt', 'info@dekoforma.lt', 'https://www.dekoforma.lt/'),
  ('DILED', 'https://diled.lt', 'info@diled.lt', 'https://diled.lt/kontaktai/'),
  ('Elegant Home', 'https://eleganthome.lt', 'info@eleganthome.lt', 'https://eleganthome.lt/kontaktai/'),
  ('ESEA House', 'https://www.eseahouse.com', 'hello@eseahouse.com', 'https://www.eseahouse.com/'),
  ('GFORMA', 'https://www.gforma.lt', 'info@gforma.lt', 'https://www.gforma.lt/kontaktai/'),
  ('Glovė', 'https://glove.lt', 'info@glove.lt', 'https://glove.lt/index.php?route=information/contact'),
  ('GULBELĖ', 'https://gulbele.lt', 'info@gulbele.lt', 'https://gulbele.lt/content/4-Kontaktai'),
  ('Įrankis.lt', 'https://irankis.lt', 'info@irankis.lt', 'https://irankis.lt/'),
  ('Jacob Colinn', 'https://jacobcolinn.com', 'info@jacobcolinn.com', 'https://jacobcolinn.com/pages/susisiekite'),
  ('Kankorėžis', 'https://kankorezis.lt', 'info@kankorezis.lt', 'https://kankorezis.lt/kontaktai/'),
  ('KOKO Baldai', 'https://www.kokobaldai.lt', 'info@kokobaldai.lt', 'https://www.kokobaldai.lt/'),
  ('Komi', 'https://komi.lt', 'panevezys@komi.lt', 'https://komi.lt/kontaktai/'),
  ('Lauksva', 'https://www.lauksva.lt', 'centras@lauksva.lt', 'https://www.lauksva.lt/kontaktai/'),
  ('Muscle Shop', 'https://muscleshop.lt', 'info@muscleshop.lt', 'https://muscleshop.lt/pages/kontaktai'),
  ('Odore d''amore', 'https://odoredamore.lt', 'info@odoredamore.shop', 'https://odoredamore.shop/pages/kontaktai'),
  ('Ogmina', 'https://ogmina.lt', 'info@ogmina.lt', 'https://ogmina.lt/apie-imone/kontaktai/'),
  ('SAMANOSE', 'https://samanose.lt', 'info@samanose.lt', 'https://samanose.lt/kontaktai/'),
  ('SEDI', 'https://sedi.lt', 'info@sedi.lt', 'https://sedi.lt/kontaktai/'),
  ('Smells Like Spells', 'https://smellslikespells.com', 'hello@smellslikespells.com', 'https://smellslikespells.com/contacts/'),
  ('Son de Flor', 'https://sondeflor.com', 'info@sondeflor.com', 'https://sondeflor.com/pages/contact'),
  ('Sportuok.lt', 'https://sportuok.lt', 'info@sportuok.lt', 'https://sportuok.lt/kontaktai'),
  ('Stokker', 'https://www.stokker.lt', 'info@stokker.com', 'https://www.stokker.lt/lt'),
  ('Taurus Jewels', 'https://taurusjewels.com', 'info@taurusjewels.com', 'https://taurusjewels.com/'),
  ('Terra Recognita', 'https://terrarecognita.com', 'galerija@terrarecognita.lt', 'https://terrarecognita.com/kontaktai/'),
  ('VDS Baldai', 'https://vdsbaldai.lt', 'info@vdsbaldai.lt', 'https://vdsbaldai.lt/kontaktai/'),
  ('VE-SAV', 'https://ve-sav.com', 'studio@ve-sav.com', 'https://ve-sav.com/pages/contact'),
  ('Verkter Group', 'https://www.verkter.com', 'info@verkter.com', 'https://www.verkter.com/contacts.html'),
  ('WOODLINE', 'https://www.woodline.lt', 'info@woodline.lt', 'https://www.woodline.lt/kontaktai'),
  ('ZEFYRAS', 'https://www.zefyras.com', 'hello@zefyras.com', 'https://www.zefyras.com/shop-contacts/');

do $$
declare
  matched_count integer;
begin
  select count(*)
  into matched_count
  from public.sales_leads as lead
  join lt_linkedin_email_enrichment as enrichment
    on enrichment.name = lead.name
   and enrichment.website = lead.website
  where lead.lead_origin = 'linkedin'
    and lead.country = 'Lithuania';

  if matched_count <> 35 then
    raise exception 'Expected 35 Lithuanian LinkedIn leads for email enrichment, found %', matched_count;
  end if;
end
$$;

update public.sales_leads as lead
set
  email = enrichment.email,
  source = case
    when position(enrichment.evidence_url in coalesce(lead.source, '')) > 0 then lead.source
    else concat_ws(
      ' | ',
      nullif(lead.source, ''),
      'Public business email verified 2026-08-31: ' || enrichment.evidence_url
    )
  end,
  updated_at = now()
from lt_linkedin_email_enrichment as enrichment
where enrichment.name = lead.name
  and enrichment.website = lead.website
  and lead.lead_origin = 'linkedin'
  and lead.country = 'Lithuania'
  and (
    lead.email is null
    or btrim(lead.email) = ''
    or lower(btrim(lead.email)) = lower(enrichment.email)
  );

do $$
declare
  verified_count integer;
begin
  select count(*)
  into verified_count
  from public.sales_leads as lead
  join lt_linkedin_email_enrichment as enrichment
    on enrichment.name = lead.name
   and enrichment.website = lead.website
  where lead.lead_origin = 'linkedin'
    and lead.country = 'Lithuania'
    and lower(btrim(lead.email)) = lower(enrichment.email);

  if verified_count <> 35 then
    raise exception 'Expected 35 verified Lithuanian LinkedIn emails after enrichment, found %', verified_count;
  end if;
end
$$;
