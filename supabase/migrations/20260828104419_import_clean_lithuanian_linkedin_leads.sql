-- Qualified from the user's 148-person Lithuania Sales Navigator list.
-- Only one relevant decision maker per company is retained. Public personal
-- contact details are intentionally omitted; the Sales Navigator profile is
-- the contact route and the official site is the company evidence.
with qualified_leads (
  name,
  website,
  city,
  vertical,
  ceo,
  buyer_title,
  linkedin_url,
  has_chatbot,
  hook,
  score
) as (
  values
    ('GULBELĖ', 'https://gulbele.lt', 'Kaunas', 'E-komercija', 'Diana Taletavičienė', 'Director of Commerce', 'https://www.linkedin.com/sales/lead/ACwAACYRww4B9fDfXuHj6oHOkeRZt96WX3BOUTM,NAME_SEARCH,9svN', false, 'Platus maisto ir kasdienių prekių katalogas reiškia daug pasikartojančių klausimų apie pasirinkimą, pristatymą ir prieinamumą.', 94),
    ('Ogmina', 'https://ogmina.lt', 'Vilnius', 'E-komercija', 'Tautvydas Pugaciauskas', 'CEO', 'https://www.linkedin.com/sales/lead/ACwAAAK_j1QBpwj_I-AKAn5GAPnmloioVhesvEA,NAME_SEARCH,c_4D', false, 'Buitinės technikos ir elektronikos kataloge AI konsultantas galėtų palyginti modelius ir paaiškinti techninius skirtumus.', 95),
    ('ESEA House', 'https://www.eseahouse.com', 'Vilnius', 'E-komercija', 'Gintarė Vaicekauskaitė', 'Business Owner | Florist + Ceramic Artist', 'https://www.linkedin.com/sales/lead/ACwAAC_1dlkBqWnFcFlE6z4VKVgGNVHt6GT1MZE,NAME_SEARCH,BP1N', false, 'Autorinių keramikos ir floristinių kūrinių pirkėjams dažnai reikia pagalbos renkantis progai, dydžiui ar interjerui.', 83),
    ('Elegant Home', 'https://eleganthome.lt', null, 'Baldai ir interjeras', 'Dalius Pocevičius', 'Managing Director', 'https://www.linkedin.com/sales/lead/ACwAAAE7UuQB6hanNyYG3Qpj4kixKOK7oAPeg6Q,NAME_SEARCH,XevN', false, 'Baldų, šviestuvų ir interjero prekių lankytojams AI konsultantas galėtų padėti derinti stilių, matmenis ir komplektaciją.', 92),
    ('VE-SAV', 'https://ve-sav.com', null, 'E-komercija', 'Vilte Savickaite', 'Founder & Creative Director', 'https://www.linkedin.com/sales/lead/ACwAACjdegcBD0Xm2M_lCCDYxDSO0KgMqHdQ_u0,NAME_SEARCH,eJac', false, 'Dizaino prekių pirkėjams galima padėti atrasti tinkamą gaminį ir atsakyti apie medžiagas, dydžius bei pristatymą.', 84),
    ('Sportuok.lt', 'https://sportuok.lt', null, 'Sportas', 'Linas Vanagas', 'Commercial Fitness Solutions Manager', 'https://www.linkedin.com/sales/lead/ACwAAADo_NkBIpVs9tPZtqV979tm1U-0fFEUL_A,NAME_SEARCH,cWo1', false, 'Platus treniruoklių ir sporto įrangos katalogas sukuria daug pasirinkimo, suderinamumo ir pristatymo klausimų.', 94),
    ('Baltijos-Amerikos Klinika', 'https://bak.lt', 'Vilnius', 'Medicina', 'Eglė Malinauskaitė', 'Chief Business Development Officer', 'https://www.linkedin.com/sales/lead/ACwAAEVhdEcBFP4ugdeS55uW3ncJqrcnxg-JxnM,NAME_SEARCH,H-_r', false, 'Klinikos lankytojams AI asistentas galėtų paaiškinti paslaugų skirtumus ir nukreipti registracijai, neteikdamas medicininių diagnozių.', 86),
    ('DekoForma', 'https://www.dekoforma.lt', null, 'Baldai ir interjeras', 'Akvilė Bielytė', 'Founder', 'https://www.linkedin.com/sales/lead/ACwAAC7LG7QB_A67Ipr89bqt2TuT-NYiuPlaYBA,NAME_SEARCH,qv8_', false, 'Didelis baldų, šviestuvų, kilimų ir interjero detalių pasirinkimas tinka konsultacinei paieškai pagal erdvę ir stilių.', 94),
    ('Taurus Jewels', 'https://taurusjewels.com', null, 'Juvelyrika', 'Tauras Blaževičius', 'CEO | Creative Director', 'https://www.linkedin.com/sales/lead/ACwAAAcT_u0BmdXyTrgIij1gzNpuglsRWnPXb8I,NAME_SEARCH,8waU', false, 'Juvelyrikos pirkėjams svarbūs individualizavimo, medžiagų, dydžio ir gamybos terminų klausimai.', 88),
    ('LAJO baldai', 'https://lajo.lt', 'Kaunas', 'Baldai ir interjeras', 'Jonas Šumskas', 'Founder', 'https://www.linkedin.com/sales/lead/ACwAADgkf4UBLKlEptBTvP4nzcRpzPAj1UagkFg,NAME_SEARCH,4lYO', false, 'Individualių baldų klientams AI asistentas galėtų surinkti pirminius poreikius apie erdvę, matmenis, medžiagas ir biudžetą.', 88),
    ('VDS Baldai', 'https://vdsbaldai.lt', 'Klaipėda', 'Baldai ir interjeras', 'Vaidas Venckus', 'Founder', 'https://www.linkedin.com/sales/lead/ACwAADASk1gBnY28SWZr9VhTb9f8q5ZloAn30C8,NAME_SEARCH,XgmX', false, 'Nestandartinių baldų užklausas galima kvalifikuoti pagal patalpą, matmenis, norimą stilių ir projekto terminą.', 87),
    ('Glovė', 'https://glove.lt', null, 'E-komercija', 'Andrius Mordasas', 'Business Owner', 'https://www.linkedin.com/sales/lead/ACwAABsTslABdAZRuy311YEXZ_qcYxKkeckb6aM,NAME_SEARCH,DNy8', true, 'Darbo aprangos ir saugos priemonių kataloge svarbu parinkti tinkamą dydį, apsaugos klasę ir paskirtį.', 77),
    ('Cut My Fashion', 'https://cutmyfashion.lt', 'Vilnius', 'E-komercija', 'Ernesta Stašiūnienė', 'Owner', 'https://www.linkedin.com/sales/lead/ACwAACYK3zgBHNxO3tzMDRAQNptMNDZFHtH38Qs,NAME_SEARCH,NgJd', false, 'Mados pirkėjams AI konsultantas galėtų padėti su dydžiais, modelių pasirinkimu, derinimu ir pristatymo klausimais.', 86),
    ('KOKO Baldai', 'https://www.kokobaldai.lt', null, 'Baldai ir interjeras', 'Gabrielius Kolesnikovas', 'Founder', 'https://www.linkedin.com/sales/lead/ACwAAAkpLPoBpM8pycUAJKwpBbvTsF34WMGsrlE,NAME_SEARCH,h88q', true, 'Minkštų baldų pirkėjams reikia atsakymų apie matmenis, audinius, konfigūraciją, gamybą ir pristatymą.', 76),
    ('1STOP', 'https://www.1stop.lt', null, 'E-komercija', 'Tadas Jurkšys', 'CEO', 'https://www.linkedin.com/sales/lead/ACwAAAJBSd8B5z2HmLqXAAtOkQQ5I_KscMHS5P0,NAME_SEARCH,4Ypk', false, 'Platus verslo prekių katalogas yra geras scenarijus produktų paieškai, palyginimui ir suderinamumo konsultacijoms.', 95),
    ('SEDI', 'https://sedi.lt', null, 'Baldai ir interjeras', 'Lina Raksteliene', 'Business Owner', 'https://www.linkedin.com/sales/lead/ACwAAAg13DIBRVJ5ofuCT9cHzhY8zj3WxQ3f_jQ,NAME_SEARCH,oXf4', false, 'Rūbinių įrangos ir ergonominių baldų pirkėjus galima konsultuoti pagal erdvę, talpą, naudojimo intensyvumą ir komplektaciją.', 88),
    ('Coaty Coat', 'https://www.coatycoat.com', null, 'E-komercija', 'Egle Liaugaudaite', 'Co-Founder, Design Director', 'https://www.linkedin.com/sales/lead/ACwAACMvBUIBqfp4LANuTKgNMcEwQM3z1hc2l3c,NAME_SEARCH,E2q2', false, 'Kašmyro gaminių klientams aktualūs dydžio, priežiūros, medžiagos ir tarptautinio pristatymo klausimai.', 86),
    ('Terra Recognita', 'https://terrarecognita.com', null, 'Juvelyrika', 'Gallery "terra recognita"', 'Company Owner', 'https://www.linkedin.com/sales/lead/ACwAABHbGjoBGEhk1D22kn5byuphs_YZGEXNRD8,NAME_SEARCH,R5Qm', false, 'Autorinės juvelyrikos lankytojams AI konsultantas galėtų paaiškinti kolekcijas, medžiagas ir individualaus užsakymo galimybes.', 84),
    ('ZEFYRAS', 'https://www.zefyras.com', null, 'E-komercija', 'Viktorija Bugajenko', 'Founder', 'https://www.linkedin.com/sales/lead/ACwAADVXG50BLGg3g2IZaaenvrUuMnhl6FDHcFA,NAME_SEARCH,T8tp', false, 'Mados prekės ženklo lankytojams galima padėti su dydžiais, kolekcijomis, priežiūra ir pristatymu.', 86),
    ('Kankorėžis', 'https://kankorezis.lt', null, 'Baldai ir interjeras', 'Arnas Barišauskas', 'CEO', 'https://www.linkedin.com/sales/lead/ACwAABKrGiABqY_n77Vzx_o0QYTgt8dAMfPEtWQ,NAME_SEARCH,kUuj', false, 'Interjero gaminių pirkėjams AI konsultantas galėtų atsakyti apie matmenis, medžiagas, gamybą ir pritaikymą.', 87),
    ('Pilnatvės Sodas', 'https://www.pilnatvessodas.lt', 'Klaipėda', 'Gėlės ir dovanos', 'Iveta Anuziene', 'Co-Founder and Creative Director', 'https://www.linkedin.com/sales/lead/ACwAABr2QCMBD1mwmEOhinBkCMKs7nZFznjEx7o,NAME_SEARCH,S4yh', false, 'Gėlių pristatymo klientams reikia greitų atsakymų apie progą, kompoziciją, biudžetą, pristatymo vietą ir laiką.', 91),
    ('GFORMA', 'https://www.gforma.lt', null, 'Baldai ir interjeras', 'Romas Miglinas', 'Founder & CEO', 'https://www.linkedin.com/sales/lead/ACwAABlHdU0BMrSa3SXLCbL3blbGCL1w6pcZATE,NAME_SEARCH,cnNJ', false, 'Baldų ir interjero sprendimų užklausas galima kvalifikuoti pagal erdvę, stilių, matmenis ir projekto apimtį.', 87),
    ('Jacob Colinn', 'https://jacobcolinn.com', null, 'E-komercija', 'Karolis Pakštys', 'Founder', 'https://www.linkedin.com/sales/lead/ACwAABua8DQBLnN9Wth6sFL5hK3aOTwHoaIIdKo,NAME_SEARCH,AmGn', false, 'Tarptautinės mados parduotuvės klientams AI konsultantas galėtų padėti su dydžiais, pristatymu, grąžinimu ir gaminių pasirinkimu.', 89),
    ('Įrankis.lt', 'https://irankis.lt', 'Vilnius', 'Įrangos nuoma', 'Tomas Žemaitis', 'CEO', 'https://www.linkedin.com/sales/lead/ACwAADYoorMBNZx2pmr4c6WrN8ldytWKqk4T-xk,NAME_SEARCH,dP8O', false, 'Įrankių nuomos klientus galima konsultuoti pagal darbą, reikiamą galią, nuomos trukmę ir atsiėmimo vietą.', 93),
    ('Smells Like Spells', 'https://smellslikespells.com', null, 'E-komercija', 'Marius B.', 'Co-Founder', 'https://www.linkedin.com/sales/lead/ACwAAAUa9c4BxW6yVrvMxQvsIySXVAiI3BK5wxI,NAME_SEARCH,ueyn', null, 'Kvapų ir ritualinių namų gaminių pirkėjams galima rekomenduoti produktus pagal nuotaiką, progą ir aromatų kryptį.', 88),
    ('Muscle Shop', 'https://muscleshop.lt', null, 'E-komercija', 'Tadas Medineckas', 'Co-Founder', 'https://www.linkedin.com/sales/lead/ACwAAAJxFK0BsciLVdJPoQrLjLDK1T6Nwpt9baE,NAME_SEARCH,HbYh', true, 'Maisto papildų pirkėjams dažnai reikia pagalbos renkantis pagal tikslą, sudėtį, vartojimą ir mitybos apribojimus.', 74),
    ('CASE4YOU', 'https://www.case4you.lt', 'Vilnius', 'E-komercija', 'Ramunė Virvičienė', 'Chief Executive Officer', 'https://www.linkedin.com/sales/lead/ACwAAEcS0KMBDnSdId_2XGQqS7vxzT0ndR5Yu08,NAME_SEARCH,u18t', false, 'Telefonų aksesuarų kataloge AI konsultantas galėtų tiksliai parinkti prekę pagal įrenginio modelį ir norimą apsaugą.', 93),
    ('Stokker', 'https://www.stokker.lt', null, 'E-komercija', 'Linas Jasinskas', 'CEO', 'https://www.linkedin.com/sales/lead/ACwAAAGMLZsBdbAjoNQlSf9R5TKBCqzVCiGuBg0,NAME_SEARCH,u3zE', false, 'Dideliame įrankių ir technikos kataloge AI konsultantas galėtų atrinkti tinkamą įrangą ir paaiškinti techninius skirtumus.', 95),
    ('SAMANOSE', 'https://samanose.lt', null, 'Interjero dizainas', 'Kristina Vadoklė', 'Founder, Interior Designer', 'https://www.linkedin.com/sales/lead/ACwAABGKrTwBCXrx0ATclZF0xSYKlaVYukuXjQ4,NAME_SEARCH,Zv7C', false, 'Interjero dizaino užklausas galima iš anksto kvalifikuoti pagal objektą, plotą, stilių, biudžetą ir terminą.', 86),
    ('DILED', 'https://diled.lt', null, 'Apšvietimo sprendimai', 'Danas Azikejev', 'CEO and Co-Owner', 'https://www.linkedin.com/sales/lead/ACwAAAZ-jOIBAQhMF-XoQpbR_Z1t2BNUnjRWXW8,NAME_SEARCH,0wvA', false, 'Apšvietimo projektų klientus galima konsultuoti pagal erdvę, paskirtį, techninius reikalavimus ir projekto etapą.', 88),
    ('Son de Flor', 'https://sondeflor.com', null, 'E-komercija', 'Vaida Ribinskaite', 'Co-Founder', 'https://www.linkedin.com/sales/lead/ACwAAAIxqt0BSHR81FccUMg5uIYQw7xuxd2GlBA,NAME_SEARCH,zMvi', false, 'Tarptautinės lino drabužių parduotuvės klientams aktualūs dydžio, priežiūros, pristatymo ir grąžinimo klausimai.', 91),
    ('Bosaddo', 'https://bosaddo.com', 'Vilnius', 'E-komercija', 'Viktorija Bobinaitė', 'CEO & Co-Founder', 'https://www.linkedin.com/sales/lead/ACwAADvqP8UBuSSOfmIoxluLApJAWrOpotpbXG4,NAME_SEARCH,wM15', false, 'Šokių ir sporto aprangos pirkėjams AI konsultantas galėtų padėti su dydžiu, modeliu, paskirtimi ir pristatymu.', 87),
    ('Lauksva', 'https://www.lauksva.lt', null, 'Baldai ir interjeras', 'Migle Valaityte', 'CEO', 'https://www.linkedin.com/sales/lead/ACwAABrxE6YBddNFlAeBdD_CJuyvzIIwU40YZZs,NAME_SEARCH,oEtK', true, 'Baldų pirkėjams svarbūs matmenų, audinių, spalvų, komplektacijos, gamybos ir pristatymo klausimai.', 76),
    ('Odore d''amore', 'https://odoredamore.lt', null, 'Grožis ir kosmetika', 'Simona Kšenavičiūtė', 'Chief Executive Officer', 'https://www.linkedin.com/sales/lead/ACwAAAMc-4cB-PmFQVNHH1Yz7eJWnuodKnLVrEs,NAME_SEARCH,eYQo', null, 'Kvapų ir grožio prekių pirkėjams AI konsultantas galėtų rekomenduoti pagal aromato kryptį, progą ir individualius pomėgius.', 86),
    ('WOODLINE', 'https://www.woodline.lt', 'Vilnius', 'Statyba ir interjeras', 'Mindaugas Morkunas', 'CEO', 'https://www.linkedin.com/sales/lead/ACwAABDWdIUBYGiXLsXm6YmXSShHocvEnGInuA0,NAME_SEARCH,OvIV', false, 'Medienos sprendimų kataloge klientams reikia pagalbos parenkant produktą pagal interjerą, eksterjerą, matmenis ir technines savybes.', 92),
    ('Komi', 'https://komi.lt', null, 'E-komercija', 'Arūnas Jarašius', 'CEO | Owner', 'https://www.linkedin.com/sales/lead/ACwAABPtHL8BwSxIjMJzwV9uo6pBH8ExyEAQtCw,NAME_SEARCH,phRZ', false, 'Naudotų kompiuterių pirkėjams AI konsultantas galėtų palyginti komplektacijas ir parinkti įrenginį pagal paskirtį bei biudžetą.', 93),
    ('Verkter Group', 'https://www.verkter.com', null, 'E-komercija', 'Andrius Čekanavičius', 'Chief Executive Officer', 'https://www.linkedin.com/sales/lead/ACwAAAK12YgBA6zYN0eMn3A2o3thEQq6uLioxzs,NAME_SEARCH,LguI', false, 'Tarptautiniame įrankių kataloge AI konsultantas galėtų padėti atrinkti techniką, palyginti specifikacijas ir rasti suderinamus priedus.', 94)
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
  lead.ceo,
  'Lietuvos įmonė; komandos dydis viešai papildomai netikrintas',
  lead.hook,
  'Aktyvi oficiali svetainė ir tinkamas pirkėjo vaidmuo patvirtinti 2026-08-28. LinkedIn sąrašo narystė naudota tik atradimui; el. paštas ir telefonas nebuvo renkami. Pokalbių valdiklio signalas pagrįstas tik viešu pagrindinio puslapio HTML.',
  'LinkedIn Sales Navigator sąrašas 7487929582537465858; oficiali svetainė patikrinta 2026-08-28: ' || lead.website,
  lead.score,
  lead.buyer_title || '; aktyvi oficiali svetainė; ' ||
    case
      when lead.has_chatbot is true then 'svetainėje aptiktas esamas pokalbių valdiklis'
      when lead.has_chatbot is false then 'viešame pagrindinio puslapio HTML pokalbių valdiklis neaptiktas'
      else 'pokalbių valdiklio būsena nepatvirtinta'
    end,
  lead.has_chatbot,
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
        regexp_replace(existing.website, '^https?://(www\.)?', ''),
        '/.*$',
        ''
      )
    ) = lower(
      regexp_replace(
        regexp_replace(lead.website, '^https?://(www\.)?', ''),
        '/.*$',
        ''
      )
    )
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
    and source like 'LinkedIn Sales Navigator sąrašas 7487929582537465858;%';

  if imported_count <> 37 then
    raise exception
      'Expected exactly 37 qualified Lithuanian LinkedIn leads, found %',
      imported_count;
  end if;
end
$$;
