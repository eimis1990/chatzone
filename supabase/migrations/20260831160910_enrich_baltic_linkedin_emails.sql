-- Add only company-published emails to the 100 Latvian/Estonian LinkedIn
-- leads verified on 2026-08-31 (44 Latvia, 56 Estonia). Rows are matched by
-- their sales_leads UUID from the reviewed evidence artifact
-- (supabase/research/baltic_linkedin_existing_email_enrichment.json).
-- No address was guessed or obtained through paid enrichment.
create temporary table baltic_linkedin_email_enrichment (
  id uuid primary key,
  email text not null,
  evidence_url text not null
) on commit drop;

insert into baltic_linkedin_email_enrichment (id, email, evidence_url)
values
  ('89a6db81-b60f-4202-b314-1a127d781419'::uuid, 'sales@alpaka-shop.com', 'https://alpaka-shop.com/contacts-support/'),
  ('cdeb7465-3702-4f6c-bd20-a375e9a64a54'::uuid, 'info@amanjeda.com', 'https://www.amanjeda.com/pages/contact'),
  ('d65b2d2c-ea2b-408e-ac0e-749c9eeb4a9a'::uuid, 'anvol@anvol.eu', 'https://anvol.eu/contact/'),
  ('e2941b49-36a4-4828-bab7-47a30958e746'::uuid, 'info@apollo.ee', 'https://www.apollo.ee/et/fun-facts-about-estonia.html'),
  ('9544a72a-4c9d-4da5-a248-5182a91851e1'::uuid, 'info@beigebrown.com', 'https://www.beigebrown.com/pages/contact-us'),
  ('d5355863-ad92-4ce9-8ea7-92e15c33eef4'::uuid, 'info@caremate.ee', 'https://caremate.ee/register'),
  ('5aefb024-ce6f-46d2-a70a-bfbcf8f6f0b7'::uuid, 'chemi-pharm@chemi-pharm.com', 'https://chemi-pharm.com/contacts/'),
  ('6dd332e2-6487-489f-bcac-d968bf236198'::uuid, 'info@decnord.com', 'https://decnord.ee/kontakt/'),
  ('1da82816-d416-4c3c-b288-7d3eff4f3c75'::uuid, 'info@dharmaresort.ee', 'https://dharmaresort.ee/'),
  ('7cff0b03-d313-404e-ab63-ea3ae1469679'::uuid, 'hello@ecopetbox.com', 'https://ecopetbox.com/contact'),
  ('17b455fa-5002-4409-aac8-5a3815136699'::uuid, 'info@ergonomik.ee', 'https://ergonomik.ee/kontakt/'),
  ('29e0e484-8655-44d1-8f73-125f0fe5aed9'::uuid, 'info@eurobiolab.ee', 'https://eurobiolab.com/contact/'),
  ('9a04c99d-3d14-40a5-8fdf-4c72d18971ba'::uuid, 'info@goodpointchemicals.com', 'https://goodpointchemicals.com/kontakt/'),
  ('e85750b5-ffec-459e-a595-798671fcd02c'::uuid, 'viru@grenardi.ee', 'https://grenardi.ee/ee/kasulik/kontakti'),
  ('85b0672c-de0e-4c30-bce6-d720d9d5fa03'::uuid, 'info@hoov.ee', 'https://hoov.ee/kontakt/'),
  ('4ab97cdf-ac08-4088-9b7c-ad23c2ffff1a'::uuid, 'kaubamaja@kaubamaja.ee', 'https://www.kaubamaja.ee/'),
  ('2b823917-abd0-4b3e-af70-527277c16466'::uuid, 'info@labocca.ee', 'https://labocca.ee/kontakt/'),
  ('73685ac2-b0aa-42c1-942d-7a0e319db58d'::uuid, 'tallinn@liinastein.com', 'https://liinastein.com/'),
  ('e13680d7-8e34-4cd8-b12f-dba31b6f3ae3'::uuid, 'info@livoutdoor.eu', 'https://livoutdoor.eu/kontakt'),
  ('e09845d8-a914-4226-80c3-cd6eb2c193b7'::uuid, 'info@mactabeauty.com', 'https://www.mactabeauty.com/about'),
  ('d7e1fcc2-517d-42df-8df8-2cffad053478'::uuid, 'tallinn@maxilla.ee', 'https://www.maxilla.ee/kontakt/'),
  ('effca799-ed03-4164-b228-f858671d880c'::uuid, 'medicum@medicum.ee', 'https://www.medicum.ee/kontserni-uldkontaktid/as-medicum-tervishoiuteenused/'),
  ('6217642e-1b9c-4ed1-a330-5defe3817eaf'::uuid, 'info@merianto.com', 'https://merianto.com/kontakt/'),
  ('afb7e17c-2d83-4878-8f34-5a65d7b9ee14'::uuid, 'info@nanordica.com', 'https://www.nanordica.com/'),
  ('8a21b46a-4088-4425-8b0e-237955891b5b'::uuid, 'wecare@nocry.com', 'https://nocry.com/pages/contact'),
  ('5e283970-b1a5-4f94-aff3-7ed9e01f8b7b'::uuid, 'occo@occo.ee', 'https://occo.ee/kontakt/'),
  ('c64ccd6c-3426-438a-9196-f48bce8f6faf'::uuid, 'info@oldhapsalhotel.ee', 'https://oldhapsalhotel.ee/'),
  ('d52c7a36-a9c0-4c3a-aa4d-2fbf11d9f593'::uuid, 'info@oundrinks.com', 'https://oundrinks.com/kontakt/'),
  ('5de05d1b-2d74-4385-9283-3c1198b393d2'::uuid, 'info@padaste.ee', 'https://www.padaste.ee/'),
  ('1b14567d-867f-48d9-bec6-01cbcb518104'::uuid, 'info@printall.ee', 'https://www.printall.ee/et/kontakt/'),
  ('7f712bfc-414c-482a-97ee-98fd007efad5'::uuid, 'info@probeauty.lv', 'https://probeauty.ee/index.php?route=information/contact'),
  ('16f208a4-b35f-4e7f-8da1-633735eed951'::uuid, 'info@proscreen.eu', 'https://proscreen.eu/kontakt/'),
  ('5409091e-f01e-4c06-a7b9-70c060120282'::uuid, 'info@provida.ee', 'https://provida.ee/kontakt/'),
  ('ece046ff-585f-4a60-9c25-3fae132d384d'::uuid, 'info@psycheval.ee', 'https://www.psycheval.info/kontakt'),
  ('86060e91-42bf-4157-9053-6f8beaa6fbb4'::uuid, 'ariklient@rahvaraamat.ee', 'https://rahvaraamat.ee/et/kontaktid'),
  ('c5bf7e49-e46d-451c-9947-24688301a053'::uuid, 'renalis@renalis.ee', 'https://www.renalis.ee/'),
  ('366114f2-adb6-4a31-85cc-0c682ba7bce2'::uuid, 'info@salonshop.ee', 'https://salonshop.ee/'),
  ('f3127077-7757-417a-942a-d8e1cd7e0cca'::uuid, 'onlinestore@sangar.ee', 'https://sangar.ee/kontakt/'),
  ('ba0cc6fe-f36e-45eb-9bb6-67d746509297'::uuid, 'info@seisuk.ee', 'https://seisuk.ee/pages/kontaktid'),
  ('63745298-cdab-4307-b011-69d2fde927f0'::uuid, 'info@sellme.ee', 'https://sellme.ee/kontakt/'),
  ('daab7ec2-6877-4e41-86e0-8b426c7ebe18'::uuid, 'info@silen.com', 'https://silen.com/en/contact'),
  ('7b821be8-97d2-483f-a588-af44349a67ef'::uuid, 'info@suun.ee', 'https://suun.ee/kontakt/'),
  ('12806dda-ef36-42dc-9c12-ac4b52bce010'::uuid, 'synlab@synlab.ee', 'https://synlab.ee/ettevottest/kontaktid/'),
  ('93db9932-9f3f-4c99-8620-63e660618938'::uuid, 'info@t1tallinn.com', 'https://t1tallinn.com/kontakt/'),
  ('af5f13dd-fe2e-4d55-90a4-a0812f34c8ca'::uuid, 'epood@profiriided.ee', 'https://tamectrade.ee/kontakt'),
  ('602ae077-81f0-4b20-93b9-e1ac27d55dbf'::uuid, 'info@tasku.ee', 'https://tasku.ee/kontakt/'),
  ('7640b99c-d2df-4f1e-be36-64c40c1c0866'::uuid, 'info@spa.ee', 'https://terviseparadiis.ee/kontakt/'),
  ('5e779ae0-d9d8-4638-90cd-4402e33babb7'::uuid, 'info@theclub.ee', 'https://www.theclub.ee/et/contact'),
  ('0a34b7e8-ab61-4ea2-b724-5760b069f432'::uuid, 'clinic@thehealthclinic.eu', 'https://thehealthclinic.eu/kontakt/'),
  ('ecc49cbf-ef58-416a-a244-079e39088996'::uuid, 'topauto@topauto.ee', 'https://www.topauto.ee/et/kontakt/Topauto%2BKristiine'),
  ('86770522-271a-430f-bbd8-6b8101e617c4'::uuid, 'info@tradehouse.ee', 'https://tradehouse.ee/contact?lang=et'),
  ('47bc6ffb-a128-44c7-976e-38b70e5128c8'::uuid, 'sales@uhotelsgroup.com', 'https://www.uhotelsgroup.com/about-us/breakfast/'),
  ('34e6bf60-c88c-4f28-97e2-09932fcc33fe'::uuid, 'info@uuskasutus.ee', 'https://uuskasutus.ee/moju-ja-koostoo/'),
  ('c7cd3bea-0103-409e-b961-e3c803a3f3c0'::uuid, 'vipmedicum@vipmedicum.ee', 'https://www.vipmedicum.ee/kontakt/'),
  ('64a4645f-2aa1-4b81-a625-50645e8809f4'::uuid, 'info@vunder.ee', 'https://vunder.ee/lt/kontaktai/'),
  ('1336e67e-e08e-4549-a063-d743e2a351e2'::uuid, 'sales@wasahotels.ee', 'https://wasahotels.ee/resort/kontaktid/'),
  ('43991f96-47eb-48c7-8c97-44f7777b53e3'::uuid, 'info@adoro.lv', 'https://www.adoro.lv/kontakti'),
  ('8c32d1e7-bf1c-4ced-8c3b-0c808fe006ec'::uuid, 'info@aesthetica.lv', 'https://aesthetica.lv/kontakti/'),
  ('ab808a5b-f14e-49db-abdb-f0e7611fb3b1'::uuid, 'info@ajprodukti.lv', 'https://www.ajprodukti.lv/kontakti/informacija-par-produktu'),
  ('d53df9c9-3831-4413-8363-b14b3d972eab'::uuid, 'info@amelii.lv', 'https://amelii.lv/en/contact-us/'),
  ('09c37fc5-a82c-4e6c-bc16-3e9a115f7726'::uuid, 'info@arkolat.lv', 'https://arkolat.lv/lv/pro-horeca/kontakti'),
  ('36174d73-95d0-4ded-8c98-1fac67665537'::uuid, 'info@barboleta.lv', 'https://new.barboleta.lv/pages/about'),
  ('e1eb0e57-69ae-42df-b497-c03c8ea6ac26'::uuid, 'info@birne.lv', 'https://birne.lv/kontakti/'),
  ('74e642e2-e6d8-4231-90cc-efe411610445'::uuid, 'info@briva.lv', 'https://briva.lv/'),
  ('aa99e58e-5d02-4b3b-8896-85c8410bec2f'::uuid, 'info@camlicagroup.lv', 'https://camlicagroup.lv/terms-of-use/'),
  ('e0b922a6-9f6f-4edf-b105-66f3962cb311'::uuid, 'info@car.lv', 'https://car.lv/index.php?page=lv_Kontakti'),
  ('3d23ad9f-69df-4d37-9337-f01e43f756a5'::uuid, 'info@carnitec.com', 'https://carnitec.com/contacts/'),
  ('a4cd6ace-252c-4c20-ac17-6339d4f236a8'::uuid, 'registratura@dinsbergasklinika.lv', 'https://www.dinsbergasklinika.lv/kontakti-dinsbergas-klinikai-riga'),
  ('c4f7fbdf-dbdb-40ad-ab80-9b1ca2943cdc'::uuid, 'info@exomedica.eu', 'https://exomedica.eu/index.php/contact/'),
  ('2325b7b9-f444-4d03-8711-89ea4b0ce594'::uuid, 'info@biostone.lv', 'https://www.biostone.lv/'),
  ('94ac8370-d43e-44ea-8d9a-aacd5bf1e764'::uuid, 'gemoss@gemoss.lv', 'https://www.gemoss.lv/index.php/contact-us'),
  ('42ec3bc7-7a57-4f4b-9961-ea9c148cc7b7'::uuid, 'info@gpnord.com', 'https://gpnord.com/contact/'),
  ('996aeae7-428a-4b6f-ae4a-894a5241a3fc'::uuid, 'salons@hairriga.lv', 'https://www.hairriga.lv/'),
  ('f772151f-eda5-48b9-8af8-54abfb277147'::uuid, 'hestio@hestio.lv', 'https://hestio.lv/kontakti'),
  ('a537580c-36e9-4202-9d01-e8520a2be181'::uuid, 'info@amrita.lv', 'https://www.amrita.lv/kontakti/'),
  ('040250d2-b1be-4137-8620-0061c4d49e16'::uuid, 'info@houseofsipula.com', 'https://www.houseofsipula.com/'),
  ('b95812b5-8121-4a51-aebe-8482dbb4d8c3'::uuid, 'info@intrex.lv', 'https://www.intrex.store/'),
  ('64a93cb7-9da4-4cf5-965e-a22cde04f036'::uuid, 'info.lv@karcher.com', 'https://www.kaercher.com/lv/services/support/contact.html'),
  ('7c5b6436-b666-455a-a6d2-2d08a69247a0'::uuid, 'info@karlamuiza.lv', 'https://www.karlamuiza.lv/about-us.html'),
  ('9b8761d3-8a58-46d1-9f1d-ea6934f75bec'::uuid, 'info@kinemalatvia.lv', 'https://kinema.lv/kontakti/'),
  ('f3e206b3-ee13-4b03-9043-fd22527812bf'::uuid, 'jana@kool.lv', 'https://www.kool.lv/kontakti/'),
  ('fcd231d7-ca50-4057-a16c-c01004373704'::uuid, 'info@labrains.eu', 'https://labrains.eu/pages/contacts-and-details'),
  ('86b90f8a-db66-415d-98fa-7c309d41334a'::uuid, 'office@lotos-pharma.com', 'https://www.lotos-pharma.com/kontakti-latvija-razoti-produkti/'),
  ('295037af-752b-41d9-bb6b-53cb7fe12c95'::uuid, 'info@madaracosmetics.com', 'https://www.madaracosmetics.com/pages/contact-us'),
  ('c618fcc6-517e-42cb-ab27-3db1a85438a5'::uuid, 'info@meimelin.com', 'https://www.meimelin.lv/'),
  ('436cbc2d-a8dc-4a25-87a8-74a3a663a6cb'::uuid, 'info@menessaptieka.lv', 'https://www.menessaptieka.lv/kontakti'),
  ('3c1ff173-d249-40a4-bde7-24f3fcf92d33'::uuid, 'martins@mintprint.lv', 'https://mintprint.lv/kontakti/'),
  ('090bf4d5-7de4-4da5-b2d5-ec68033f0676'::uuid, 'info@nordi.com', 'https://nordi.com/contact-us/'),
  ('34ffa4e6-2ebb-4cb5-88f0-65ca9b07728b'::uuid, 'info@outfish.lv', 'https://outfish.lv/pages/contact-us'),
  ('744806ce-0099-4d04-873c-7837257380ae'::uuid, 'info@puruspet.com', 'https://puruspet.com/'),
  ('d5b821f6-f371-4a56-bd39-1acf60ac5907'::uuid, 'info@remedine.lv', 'https://remedine.lv/'),
  ('b1fdf244-758f-4890-866e-8e29b4b63c92'::uuid, 'sales@ringbaltic.com', 'https://ringbaltic.com/contact'),
  ('9e808c9d-a70b-4722-8f25-bf809dd19d4e'::uuid, 'info@rock-distribution.com', 'https://www.rock-distribution.com/contact'),
  ('449c139e-b234-4e61-ae9a-b6ef80185cbe'::uuid, 'info@rupes.lv', 'https://rupes.lv/'),
  ('2a5a0bba-3730-46a0-a1c2-a1c024259a43'::uuid, 'info@coffeeguru.lv', 'https://coffeeguru.lv/kontakti/'),
  ('29ba7146-658d-4428-86c6-4ca98ecf9172'::uuid, 'info@skold.lv', 'https://skold.lv/kontakti/'),
  ('08e6e56c-ceec-46b7-bdbd-b629cc1961e1'::uuid, 'lita@stacija.lv', 'http://www.stacija.lv/par-mums/kontakti/'),
  ('57c7a930-fe5a-4cbc-b4c4-a6bc8f4c8120'::uuid, 'hb903@adagio-city.com', 'https://all.accor.com/hotel/B903/index.en.shtml'),
  ('6de0406b-bebf-448c-bedd-5d52cacb91a2'::uuid, 'vilbers@vilbers.com', 'https://vilbers.com/pages/contact'),
  ('95d5705e-fa29-44b7-9d32-0cb18d03d961'::uuid, 'info@woof.lv', 'https://woof.lv/pages/contact-us');

do $$
declare
  matched_count integer;
begin
  select count(*)
  into matched_count
  from public.sales_leads as lead
  join baltic_linkedin_email_enrichment as enrichment on enrichment.id = lead.id
  where lead.lead_origin = 'linkedin'
    and lead.country in ('Latvia', 'Estonia');

  if matched_count <> 100 then
    raise exception 'Expected 100 Baltic LinkedIn leads for email enrichment, found %', matched_count;
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
from baltic_linkedin_email_enrichment as enrichment
where enrichment.id = lead.id
  and lead.lead_origin = 'linkedin'
  and lead.country in ('Latvia', 'Estonia')
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
  join baltic_linkedin_email_enrichment as enrichment on enrichment.id = lead.id
  where lower(btrim(lead.email)) = lower(enrichment.email);

  if verified_count <> 100 then
    raise exception 'Expected 100 verified Baltic LinkedIn emails after enrichment, found %', verified_count;
  end if;
end
$$;
