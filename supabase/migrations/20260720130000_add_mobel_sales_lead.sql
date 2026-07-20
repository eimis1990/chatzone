-- ---------------------------------------------------------------------------
-- Demo-backed Mobel prospect for the owner outreach pipeline
-- ---------------------------------------------------------------------------
-- A live Mobel demo already exists in the owner demo organization and its
-- Verskis catalog has been fully synchronized. Keep the lead at `ready` until
-- an outreach or qualification event actually changes its lifecycle status.

insert into public.sales_leads (
  name,
  legal_name,
  website,
  city,
  vertical,
  ceo,
  email,
  phone,
  size_info,
  platform,
  hook,
  fit_note,
  source,
  score,
  score_why,
  email_subject,
  email_body,
  has_chatbot,
  status
)
values (
  'Mobel',
  'UAB „Mobelita“',
  'https://www.mobel.lt',
  'Vilnius + Kaunas',
  'E-komercija',
  null,
  'info@mobel.lt',
  '+370 684 22010',
  '2 salonai; 1 951 produkto katalogas jau sinchronizuotas „Loqara“ demo',
  'Verskis',
  'Mobel turi platų baldų katalogą, o veikiantis „Loqara“ demo jau naudoja visus 1 951 sinchronizuotus produktus. Jame galima lietuviškai ieškoti ir palyginti baldus pagal matmenis, spalvas, medžiagas, kainą bei prieinamumą, taip pat naudoti balso režimą ir kambario vizualizaciją.',
  'Stipriausias ir greičiausiai aktyvuojamas baldų prospektas: demo jau paruoštas, pilna „Verskis“ katalogo integracija išbandyta, o Vilniaus ir Kauno salonams aktualūs išsamesni pasirinkimo bei prieinamumo klausimai. Viešoje svetainėje pokalbių asistento neaptikta.',
  'mobel.lt, /kontaktai ir /apmokejimas; aktyvus „Mobel“ demo botas „Loqara Demos“ organizacijoje; pilnas 1 951 produkto „Verskis“ katalogo sinchronizavimas',
  98,
  'veikiantis demo ir pilnai išbandyta 1 951 produkto „Verskis“ integracija – beveik nėra techninio pasiruošimo trinties; du salonai ir atributais turtingas katalogas – didelė konsultavimo vertė; neturi pokalbių asistento',
  'Mobel: jau paruošiau demo jūsų svetainei',
  $$Laba diena,

Mobel.lt kataloge yra beveik 2 000 svetainės, miegamojo ir valgomojo baldų, o fizinės ekspozicijos veikia Vilniuje ir Kaune. Jau paruošiau veikiantį „Loqara“ demo pagal jūsų svetainę, kuriame lankytojas gali lietuviškai ieškoti ir palyginti baldus pagal matmenis, spalvas, medžiagas, kainą bei prieinamumą.

Esu Eimantas, kuriu „Loqara“ – lietuviškai bendraujantį AI konsultantą e. parduotuvėms. Jis remiasi jūsų svetainės turiniu ir prekių katalogu, todėl bet kuriuo paros metu gali atsakyti apie konkrečias prekes, kainas, likučius ir pristatymą. Jei prireikia žmogaus pagalbos, pokalbį perduoda jūsų komandai.

Tai nėra įprastas DUK langas: „Loqara“ supranta patikslinimus ir išlaiko pokalbio kontekstą, todėl lankytojas gali klausti natūraliai – panašiai kaip bendraudamas su konsultantu.

Demo jau veikia su jūsų katalogu, todėl galėčiau tiesiog atsiųsti nuorodą ir parodyti kelis realius paieškos scenarijus.

Ar būtų įdomu jį pamatyti?$$,
  false,
  'ready'
)
on conflict (website) do nothing;
