-- Verified platform classifications for the complete 200-row LinkedIn lead set.
-- Detection uses first-party storefront HTML, headers/cookies, bounded native
-- endpoint probes, and rendered first-party assets for four fetch-blocked sites.
create temporary table linkedin_lead_platform_enrichment (
  name text not null,
  website text not null,
  country text not null,
  platform text not null,
  primary key (name, website, country)
) on commit drop;

insert into linkedin_lead_platform_enrichment (name, website, country, platform)
values
  ('Alpaka', 'https://alpaka.ee', 'Estonia', 'WooCommerce'),
  ('Amanjeda', 'https://amanjeda.com', 'Estonia', 'Shopify'),
  ('Anvol', 'https://anvol.eu', 'Estonia', 'WordPress (non-WooCommerce)'),
  ('Apollo Kauplused', 'https://www.apollo.ee', 'Estonia', 'Custom (Next.js)'),
  ('BEIGE | BROWN', 'https://beigebrown.com', 'Estonia', 'Shopify'),
  ('CareMate', 'https://caremate.ee', 'Estonia', 'Custom/Other'),
  ('Chemi-Pharm', 'https://chemi-pharm.com', 'Estonia', 'WordPress (non-WooCommerce)'),
  ('DecNord', 'https://decnord.ee', 'Estonia', 'WooCommerce'),
  ('Dharma Resort', 'https://dharmaresort.ee', 'Estonia', 'WordPress (non-WooCommerce)'),
  ('EcoPetBox', 'https://ecopetbox.com', 'Estonia', 'Custom/Other'),
  ('Ergonomik', 'https://ergonomik.ee', 'Estonia', 'WooCommerce'),
  ('Eurobio Lab', 'https://eurobiolab.com', 'Estonia', 'WordPress (non-WooCommerce)'),
  ('Goodpoint Chemicals', 'https://goodpointchemicals.com', 'Estonia', 'WooCommerce'),
  ('GRENARDI Group', 'https://grenardi.ee', 'Estonia', 'Custom/Other'),
  ('Hoov Haapsalu', 'https://hoov.ee', 'Estonia', 'WordPress (non-WooCommerce)'),
  ('Kaubamaja', 'https://www.kaubamaja.ee', 'Estonia', 'Custom/Other'),
  ('LaBocca Restaurants', 'https://labocca.ee', 'Estonia', 'WordPress (non-WooCommerce)'),
  ('Liina Stein', 'https://liinastein.com', 'Estonia', 'Shopify'),
  ('Liv Outdoor', 'https://livoutdoor.ee', 'Estonia', 'Custom/Other'),
  ('Macta Beauty', 'https://mactabeauty.com', 'Estonia', 'Magento'),
  ('Maxilla Hambakliinik', 'https://www.maxilla.ee', 'Estonia', 'WordPress (non-WooCommerce)'),
  ('Medicum', 'https://www.medicum.ee', 'Estonia', 'WordPress (non-WooCommerce)'),
  ('Merianto', 'https://merianto.com', 'Estonia', 'WordPress (non-WooCommerce)'),
  ('Nanordica Medical', 'https://nanordica.com', 'Estonia', 'Wix'),
  ('NoCry Safety', 'https://nocry.com', 'Estonia', 'Shopify'),
  ('OCCO', 'https://occo.ee', 'Estonia', 'WordPress (non-WooCommerce)'),
  ('Old Hapsal Hotel', 'https://oldhapsalhotel.ee', 'Estonia', 'WordPress (non-WooCommerce)'),
  ('Öun Drinks', 'https://oundrinks.com', 'Estonia', 'WooCommerce'),
  ('Pädaste Manor', 'https://www.padaste.ee', 'Estonia', 'WordPress (non-WooCommerce)'),
  ('Printall', 'https://printall.ee', 'Estonia', 'WordPress (non-WooCommerce)'),
  ('Pro Beauté Baltic', 'https://probeauty.ee', 'Estonia', 'OpenCart'),
  ('ProScreen', 'https://proscreen.ee', 'Estonia', 'WordPress (non-WooCommerce)'),
  ('ProVida Kliinik', 'https://provida.ee', 'Estonia', 'WordPress (non-WooCommerce)'),
  ('PsychEval', 'https://psycheval.ee', 'Estonia', 'Wix'),
  ('Rahva Raamat', 'https://rahvaraamat.ee', 'Estonia', 'Custom (Next.js)'),
  ('Renalis', 'https://renalis.ee', 'Estonia', 'Custom/Other'),
  ('Salonshop Baltic', 'https://salonshop.ee', 'Estonia', 'WooCommerce'),
  ('Sangar', 'https://sangar.ee', 'Estonia', 'WooCommerce'),
  ('Seisuk Furniture', 'https://seisuk.ee', 'Estonia', 'Shopify'),
  ('Sellme.ee', 'https://sellme.ee', 'Estonia', 'OpenCart'),
  ('Silen', 'https://silen.com', 'Estonia', 'Custom (Next.js)'),
  ('Suun', 'https://suun.ee', 'Estonia', 'WooCommerce'),
  ('SYNLAB Eesti', 'https://synlab.ee', 'Estonia', 'WooCommerce'),
  ('T1 Tallinn', 'https://t1tallinn.com', 'Estonia', 'WordPress (non-WooCommerce)'),
  ('Tamec Trade', 'https://tamectrade.ee', 'Estonia', 'Custom/Other'),
  ('Tasku Keskus', 'https://tasku.ee', 'Estonia', 'WordPress (non-WooCommerce)'),
  ('Tervis Spa Group', 'https://www.terviseparadiis.ee', 'Estonia', 'WordPress (non-WooCommerce)'),
  ('The Club Estonia', 'https://theclub.ee', 'Estonia', 'Custom (Next.js)'),
  ('The Health Clinic', 'https://thehealthclinic.eu', 'Estonia', 'WordPress (non-WooCommerce)'),
  ('Topauto', 'https://topauto.ee', 'Estonia', 'Custom/Other'),
  ('Tradehouse', 'https://tradehouse.ee', 'Estonia', 'Custom (Nuxt)'),
  ('Unique Hotels Group', 'https://uhotelsgroup.com', 'Estonia', 'WordPress (non-WooCommerce)'),
  ('Uuskasutuskeskus', 'https://uuskasutus.ee', 'Estonia', 'WooCommerce'),
  ('vipMedicum', 'https://vipmedicum.ee', 'Estonia', 'WordPress (non-WooCommerce)'),
  ('Vunder', 'https://vunder.ee', 'Estonia', 'WooCommerce'),
  ('Wasa Resort', 'https://wasahotels.ee', 'Estonia', 'WooCommerce'),
  ('Adoro', 'https://adoro.lv', 'Latvia', 'Wix'),
  ('Aesthetica', 'https://aesthetica.lv', 'Latvia', 'WordPress (non-WooCommerce)'),
  ('AJ Produkti', 'https://www.ajprodukti.lv', 'Latvia', 'Custom/Other'),
  ('Amelii', 'https://amelii.lv', 'Latvia', 'WooCommerce'),
  ('ARKOLAT', 'https://arkolat.lv', 'Latvia', 'Custom (Laravel)'),
  ('BARBOLETA', 'https://barboleta.lv', 'Latvia', 'Shopify'),
  ('Birne', 'https://birne.lv', 'Latvia', 'WooCommerce'),
  ('BRIVA', 'https://briva.lv', 'Latvia', 'Custom (Laravel)'),
  ('CAMLICA Group', 'https://camlica.com', 'Latvia', 'Custom/Other'),
  ('Car.lv', 'https://car.lv', 'Latvia', 'Custom/Other'),
  ('Carnitec', 'https://carnitec.com', 'Latvia', 'WooCommerce'),
  ('Dinsbergas Clinic', 'https://dinsbergasklinika.lv', 'Latvia', 'Wix'),
  ('Exomedica', 'https://exomedica.eu', 'Latvia', 'WordPress (non-WooCommerce)'),
  ('FURE Biostone', 'https://www.biostone.lv', 'Latvia', 'Wix'),
  ('Gemoss', 'https://gemoss.lv', 'Latvia', 'Magento'),
  ('GP Nord', 'http://www.gpnord.com', 'Latvia', 'WooCommerce'),
  ('HAIRRIGA', 'https://hairriga.lv', 'Latvia', 'Custom/Other'),
  ('Hestio', 'https://hestio.lv', 'Latvia', 'Custom (Laravel)'),
  ('Hotel Amrita', 'https://www.amrita.lv', 'Latvia', 'WordPress (non-WooCommerce)'),
  ('House of Sipula', 'https://houseofsipula.com', 'Latvia', 'Wix'),
  ('Intrex Serviss', 'https://intrex.lv', 'Latvia', 'Wix'),
  ('Kärcher Latvija', 'https://www.kaercher.com/lv', 'Latvia', 'Custom/Other'),
  ('Kārļamuiža Country Hotel', 'https://www.karlamuiza.lv', 'Latvia', 'Custom/Other'),
  ('Kinema Latvia', 'https://kinema.lv', 'Latvia', 'WooCommerce'),
  ('KOOL Latvija', 'https://kool.lv', 'Latvia', 'Custom/Other'),
  ('LABRAINS', 'https://labrains.eu', 'Latvia', 'Shopify'),
  ('Lotos Pharma', 'https://lotos-pharma.com', 'Latvia', 'WooCommerce'),
  ('MADARA Cosmetics', 'https://www.madaracosmetics.com', 'Latvia', 'Shopify'),
  ('Meimelin', 'https://meimelin.lv', 'Latvia', 'Shopify'),
  ('Mēness aptieka', 'https://www.menessaptieka.lv', 'Latvia', 'Custom/Other'),
  ('MINTprint', 'https://mintprint.lv', 'Latvia', 'WooCommerce'),
  ('nordi', 'https://nordi.lv', 'Latvia', 'WooCommerce'),
  ('Outfish', 'https://outfish.lv', 'Latvia', 'Shopify'),
  ('PURUS.PET', 'https://www.puruspet.com', 'Latvia', 'Custom/Other'),
  ('Remedine', 'https://remedine.lv', 'Latvia', 'OpenCart'),
  ('Ring Baltic', 'https://ringbaltic.lv', 'Latvia', 'Custom/Other'),
  ('Rock Distribution', 'http://www.rock-distribution.com', 'Latvia', 'Webflow'),
  ('Rūpes.lv', 'https://rupes.lv', 'Latvia', 'OpenCart'),
  ('SIA Coffee Guru Latvia', 'https://www.coffeeguru.lv', 'Latvia', 'WooCommerce'),
  ('Sköld Latvia', 'https://skold.lv', 'Latvia', 'OpenCart'),
  ('stacija.lv', 'https://stacija.lv', 'Latvia', 'Custom/Other'),
  ('TRIBE Riga City Centre', 'https://all.accor.com/hotel/B903/index.en.shtml', 'Latvia', 'Custom/Other'),
  ('Vilbers', 'https://vilbers.lv', 'Latvia', 'Shopify'),
  ('Woof.lv', 'https://woof.lv', 'Latvia', 'Shopify'),
  ('1STOP', 'https://www.1stop.lt', 'Lithuania', 'Custom (Laravel)'),
  ('Adele Notes', 'https://adelenotes.com/', 'Lithuania', 'Shopify'),
  ('ADMODUM', 'https://www.admodum.lt/', 'Lithuania', 'Wix'),
  ('Amber Esthetic', 'https://www.amberesthetic.lt/', 'Lithuania', 'Drupal'),
  ('Apvalaus stalo klubas', 'https://www.asklubas.lt/', 'Lithuania', 'Custom/Other'),
  ('Aromatic •89•', 'https://www.aromatic89.lt/', 'Lithuania', 'Custom (Laravel)'),
  ('Aromika', 'https://aromika.lt/', 'Lithuania', 'Shopify'),
  ('Arredo Deko', 'https://arredodeko.lt/', 'Lithuania', 'WordPress (non-WooCommerce)'),
  ('AZETA, UAB (Eurovaistine.lt)', 'https://www.eurovaistine.lt/', 'Lithuania', 'Custom (Next.js)'),
  ('BALTEXIM', 'https://www.baltexim.lt/', 'Lithuania', 'WooCommerce'),
  ('Baltijos-Amerikos Klinika', 'https://bak.lt', 'Lithuania', 'WordPress (non-WooCommerce)'),
  ('Baros Medical Supplies', 'https://baros.lt/', 'Lithuania', 'WordPress (non-WooCommerce)'),
  ('Betono Mozaika', 'https://www.betonomozaika.lt/', 'Lithuania', 'WordPress (non-WooCommerce)'),
  ('BOISROIS', 'https://boisrois.com/', 'Lithuania', 'WordPress (non-WooCommerce)'),
  ('Bosaddo', 'https://bosaddo.com', 'Lithuania', 'Shopify'),
  ('C&D Style', 'https://cdstyle.lt/', 'Lithuania', 'Magento'),
  ('CASE4YOU', 'https://www.case4you.lt', 'Lithuania', 'Verskis'),
  ('Coaty Coat', 'https://www.coatycoat.com', 'Lithuania', 'Wix'),
  ('Cut My Fashion', 'https://cutmyfashion.lt', 'Lithuania', 'Shopify'),
  ('DekoForma', 'https://www.dekoforma.lt', 'Lithuania', 'Custom/Other'),
  ('DILED', 'https://diled.lt', 'Lithuania', 'WordPress (non-WooCommerce)'),
  ('Elegant Home', 'https://eleganthome.lt', 'Lithuania', 'WooCommerce'),
  ('Elesen Lietuva', 'https://www.elesen.lt/', 'Lithuania', 'Custom/Other'),
  ('Elevita.lt', 'https://elevita.lt/lt/', 'Lithuania', 'PrestaShop'),
  ('EMKO', 'https://emko-place.shop/', 'Lithuania', 'Shopify'),
  ('Entryscope', 'https://entryscope.com/', 'Lithuania', 'Custom/Other'),
  ('ESEA House', 'https://www.eseahouse.com', 'Lithuania', 'Wix'),
  ('EURIBIJA', 'https://euribija.lt/', 'Lithuania', 'WooCommerce'),
  ('FITSOUT', 'https://fitsout.com/', 'Lithuania', 'WordPress (non-WooCommerce)'),
  ('Furniture Help', 'https://furniturehelp.lt/lt/', 'Lithuania', 'WordPress (non-WooCommerce)'),
  ('Gadarvy Therapeutics', 'https://gadarvytherapeutics.com/', 'Lithuania', 'WordPress (non-WooCommerce)'),
  ('Gergama', 'https://gergama.lt/', 'Lithuania', 'WordPress (non-WooCommerce)'),
  ('GFORMA', 'https://www.gforma.lt', 'Lithuania', 'WordPress (non-WooCommerce)'),
  ('Glovė', 'https://glove.lt', 'Lithuania', 'OpenCart'),
  ('GOMES Hotel Intel', 'https://gomeshotelintel.com/', 'Lithuania', 'Custom/Other'),
  ('Green Town Restaurant', 'https://www.greentown.lt/', 'Lithuania', 'Custom (Next.js)'),
  ('greet', 'https://www.heygreet.com/en', 'Lithuania', 'Custom (Next.js)'),
  ('GRIDA', 'https://www.grida.lt/', 'Lithuania', 'Custom/Other'),
  ('GULBELĖ', 'https://gulbele.lt', 'Lithuania', 'PrestaShop'),
  ('Hansab Lietuva', 'https://www.hansab.lt/', 'Lithuania', 'WordPress (non-WooCommerce)'),
  ('HI-LABS', 'https://www.hi-labs.eu/', 'Lithuania', 'Webflow'),
  ('HOVDEN', 'https://hovden.lt/', 'Lithuania', 'WooCommerce'),
  ('iDeal Lietuva', 'https://www.cec.lt/', 'Lithuania', 'Custom (Next.js)'),
  ('IDWDISPLAY', 'https://idwdisplay.com/', 'Lithuania', 'WordPress (non-WooCommerce)'),
  ('INDUSTEK UAB', 'https://industek.lt/', 'Lithuania', 'Custom/Other'),
  ('Įrankis.lt', 'https://irankis.lt', 'Lithuania', 'Custom (Nuxt)'),
  ('Jacob Colinn', 'https://jacobcolinn.com', 'Lithuania', 'Shopify'),
  ('jot.jot', 'http://www.jotjot.com/', 'Lithuania', 'WooCommerce'),
  ('JSC Baldai Jums', 'https://www.baldaijums.lt/', 'Lithuania', 'WordPress (non-WooCommerce)'),
  ('Kankorėžis', 'https://kankorezis.lt', 'Lithuania', 'WooCommerce'),
  ('KOKO Baldai', 'https://www.kokobaldai.lt', 'Lithuania', 'Wix'),
  ('Komi', 'https://komi.lt', 'Lithuania', 'WooCommerce'),
  ('Kotryna Group', 'https://www.kotrynagroup.com/', 'Lithuania', 'WordPress (non-WooCommerce)'),
  ('LAJO baldai', 'https://lajo.lt', 'Lithuania', 'Custom/Other'),
  ('Lauksva', 'https://www.lauksva.lt', 'Lithuania', 'WooCommerce'),
  ('Lematics', 'https://lematics.com/', 'Lithuania', 'WordPress (non-WooCommerce)'),
  ('Lexano', 'https://lexano.eu/', 'Lithuania', 'WordPress (non-WooCommerce)'),
  ('Linen Tales', 'https://linentales.com/', 'Lithuania', 'Shopify'),
  ('MAKO HORECA', 'https://makohoreca.com/', 'Lithuania', 'WooCommerce'),
  ('Medicinos namai', 'https://medicinosnamai.lt/', 'Lithuania', 'WordPress (non-WooCommerce)'),
  ('Medžio bitės', 'https://www.medziobites.lt/', 'Lithuania', 'OpenCart'),
  ('MOKI VEŽI', 'https://mokivezi.lt/', 'Lithuania', 'Custom/Other'),
  ('Muscle Shop', 'https://muscleshop.lt', 'Lithuania', 'Shopify'),
  ('Odore d''amore', 'https://odoredamore.lt', 'Lithuania', 'Shopify'),
  ('Ogmina', 'https://ogmina.lt', 'Lithuania', 'Shopware'),
  ('OrtoPro - ortopedijos profesionalai', 'https://ortopro.lt/', 'Lithuania', 'WooCommerce'),
  ('PANDO moto', 'https://pandomoto.com/', 'Lithuania', 'Shopify'),
  ('Pilnatvės Sodas', 'https://www.pilnatvessodas.lt', 'Lithuania', 'Custom/Other'),
  ('PLACENTA JSC', 'https://placenta.lt/', 'Lithuania', 'WooCommerce'),
  ('PREVINA', 'https://previna.lt/', 'Lithuania', 'WooCommerce'),
  ('Projects by Woodline', 'https://www.projectsbywoodline.com/', 'Lithuania', 'Wix'),
  ('Pulsetto', 'https://pulsetto.tech/', 'Lithuania', 'Shopify'),
  ('RAIT', 'https://raitgroup.com/', 'Lithuania', 'WordPress (non-WooCommerce)'),
  ('REWO | Real Estate', 'https://rewo.lt/', 'Lithuania', 'WordPress (non-WooCommerce)'),
  ('Samana Samana - pasirūpins tavo įmonės dovana | samanasamana.lt', 'https://samanasamana.lt/', 'Lithuania', 'WooCommerce'),
  ('SAMANOSE', 'https://samanose.lt', 'Lithuania', 'WordPress (non-WooCommerce)'),
  ('ScienceForBrain', 'https://scienceforbrain.com/', 'Lithuania', 'Custom/Other'),
  ('SEDI', 'https://sedi.lt', 'Lithuania', 'WooCommerce'),
  ('Self.co', 'https://self.co/', 'Lithuania', 'Shopify'),
  ('Skaitmeninės šypsenos', 'https://skaitmeninessypsenos.lt/', 'Lithuania', 'WordPress (non-WooCommerce)'),
  ('Smells Like Spells', 'https://smellslikespells.com', 'Lithuania', 'WooCommerce'),
  ('Solid Supply', 'https://solidsupply.eu/', 'Lithuania', 'Custom/Other'),
  ('Son de Flor', 'https://sondeflor.com', 'Lithuania', 'Shopify'),
  ('Sportuok.lt', 'https://sportuok.lt', 'Lithuania', 'Custom/Other'),
  ('Stokker', 'https://www.stokker.lt', 'Lithuania', 'WordPress (non-WooCommerce)'),
  ('SYNC longevity clinic', 'https://synclongevity.com/', 'Lithuania', 'WordPress (non-WooCommerce)'),
  ('Tankos UAB', 'https://tankos.lt/', 'Lithuania', 'Custom/Other'),
  ('Taurus Jewels', 'https://taurusjewels.com', 'Lithuania', 'WooCommerce'),
  ('Terra Recognita', 'https://terrarecognita.com', 'Lithuania', 'WooCommerce'),
  ('Topo centras', 'https://www.topocentras.lt/', 'Lithuania', 'Custom/Other'),
  ('UAB Arte Domestica', 'https://www.artedomestica.eu/', 'Lithuania', 'WooCommerce'),
  ('UAB Baldų Mozaika', 'https://www.baldumozaika.lt/', 'Lithuania', 'WordPress (non-WooCommerce)'),
  ('UAB Laurema', 'https://laurema.lt/', 'Lithuania', 'WordPress (non-WooCommerce)'),
  ('UAB Limedika', 'https://limedika.lt/index.php/lt/', 'Lithuania', 'Joomla'),
  ('VDS Baldai', 'https://vdsbaldai.lt', 'Lithuania', 'WordPress (non-WooCommerce)'),
  ('VE-SAV', 'https://ve-sav.com', 'Lithuania', 'Shopify'),
  ('Verkter Group', 'https://www.verkter.com', 'Lithuania', 'Custom/Other'),
  ('Witsee', 'https://www.witsee.com/', 'Lithuania', 'WooCommerce'),
  ('WOODLINE', 'https://www.woodline.lt', 'Lithuania', 'Verskis'),
  ('ZEFYRAS', 'https://www.zefyras.com', 'Lithuania', 'WooCommerce');

do $$
declare
  matched_count integer;
begin
  select count(*)
  into matched_count
  from public.sales_leads as lead
  join linkedin_lead_platform_enrichment as enrichment
    on enrichment.name = lead.name
   and enrichment.website = lead.website
   and enrichment.country = lead.country
  where lead.lead_origin = 'linkedin';

  if matched_count <> 200 then
    raise exception 'Expected 200 LinkedIn leads for platform enrichment, found %', matched_count;
  end if;
end
$$;

update public.sales_leads as lead
set
  platform = enrichment.platform,
  updated_at = now()
from linkedin_lead_platform_enrichment as enrichment
where enrichment.name = lead.name
  and enrichment.website = lead.website
  and enrichment.country = lead.country
  and lead.lead_origin = 'linkedin'
  and lead.platform is distinct from enrichment.platform;

do $$
declare
  verified_count integer;
begin
  select count(*)
  into verified_count
  from public.sales_leads as lead
  join linkedin_lead_platform_enrichment as enrichment
    on enrichment.name = lead.name
   and enrichment.website = lead.website
   and enrichment.country = lead.country
  where lead.lead_origin = 'linkedin'
    and lead.platform = enrichment.platform;

  if verified_count <> 200 then
    raise exception 'Expected 200 verified LinkedIn lead platforms after enrichment, found %', verified_count;
  end if;
end
$$;
