-- ---------------------------------------------------------------------------
-- Furniture-store prospects for the owner outreach pipeline
-- ---------------------------------------------------------------------------
-- Guru Baldai was already present in the live pipeline, so this seed contains
-- the other five user-supplied stores plus four newly researched prospects.
-- Website uniqueness makes this safe after the same rows have been added to
-- the live project before the migration is deployed.

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
values
  (
    'Baldų Perlai',
    'UAB „Dipada“',
    'https://www.balduperlai.lt',
    'Vilnius',
    'E-komercija',
    'Andrey Chaplinskiy',
    'info@balduperlai.lt',
    '+370 679 23546',
    'Platus namų ir biuro baldų katalogas; salonas Vilniuje',
    'Verskis',
    'Baldų Perlai produktų puslapiuose pateikia matmenis, spalvas, pristatymo terminus ir sandėlio informaciją. „Verskis“ katalogą Loqara gali sinchronizuoti tiesiogiai, todėl lankytojas galėtų natūralia kalba filtruoti baldus pagal kelis parametrus vienu metu.',
    'Geriausias techninis atitikimas šiame sąraše: platus, atributais turtingas baldų katalogas veikia per jau palaikomą „Verskis“ integraciją, o svetainėje neaptiktas pokalbių asistentas.',
    'balduperlai.lt, /kontaktai-2 ir /taisykles; svetainės HTML (Verskis); rekvizitai.vz.lt/imone/dipada',
    95,
    'e-komercija (Verskis) – tiesioginė katalogo sinchronizacija ir struktūruota baldų paieška; platus asortimentas – daug palyginimo klausimų; neturi pokalbių asistento – aiški spraga',
    'Baldų Perlai: idėja svetainei',
    $$Laba diena,

Baldų Perlai siūlo platų namų ir biuro baldų katalogą, kuriame produktų puslapiuose pateikiami matmenys, spalvos, pristatymo terminai ir likutis. AI konsultantas galėtų padėti lankytojui natūraliai filtruoti šiuos parametrus ir iškart parodyti tinkamus variantus iš gyvo „Verskis“ katalogo.

Esu Eimantas, kuriu „Loqara“ – lietuviškai bendraujantį AI konsultantą e. parduotuvėms. Jis remiasi jūsų svetainės turiniu ir prekių katalogu, todėl bet kuriuo paros metu gali atsakyti apie konkrečias prekes, kainas, likučius ir pristatymą. Jei prireikia žmogaus pagalbos, pokalbį perduoda jūsų komandai.

Tai nėra įprastas DUK langas: „Loqara“ supranta patikslinimus ir išlaiko pokalbio kontekstą, todėl lankytojas gali klausti natūraliai – panašiai kaip bendraudamas su konsultantu.

Galiu be jokių įsipareigojimų paruošti trumpą demo pagal jūsų svetainę, kad patys įvertintumėte, ar tai būtų naudinga.

Ar norėtumėte jį pamatyti?$$,
    false,
    'ready'
  ),
  (
    'Sofaforma',
    'UAB „Ažuona“',
    'https://sofaforma.lt',
    'Kaunas +3',
    'E-komercija',
    'Rasa Juškienė',
    'shop@sofaforma.lt',
    '+370 604 39401',
    'Internetinė parduotuvė ir 5 salonai / išparduotuvės 4 miestuose',
    'WooCommerce',
    'SOFAFORMA parduoda minkštus, miegamojo, valgomojo, lauko ir projektinius baldus internetu bei penkiose fizinėse vietose. AI konsultantas galėtų padėti palyginti modelių matmenis, komplektacijas, kainas ir prieinamumą.',
    'Platus, daug variantų turintis baldų katalogas ir keli salonai sukuria daug palyginimo bei prieinamumo klausimų. WooCommerce yra tiesiogiai palaikomas, o pokalbių asistento svetainėje neaptikta.',
    'sofaforma.lt/produktai ir /kontaktai; svetainės HTML (WooCommerce); rekvizitai.vz.lt/imone/azuona',
    92,
    'e-komercija (WooCommerce) – tiesioginė katalogo sinchronizacija; keli salonai ir platus katalogas – didelė konsultavimo vertė; neturi pokalbių asistento',
    'Sofaforma: idėja svetainei',
    $$Laba diena,

SOFAFORMA turi internetinę parduotuvę ir salonus Vilniuje, Kaune, Klaipėdoje bei Šiauliuose, o kataloge yra tiek minkštų ir miegamojo baldų, tiek projektinių sprendimų. AI konsultantas galėtų padėti lankytojui palyginti modelius, dydžius, komplektacijas ir prieinamumą skirtingose vietose.

Esu Eimantas, kuriu „Loqara“ – lietuviškai bendraujantį AI konsultantą e. parduotuvėms. Jis remiasi jūsų svetainės turiniu ir prekių katalogu, todėl bet kuriuo paros metu gali atsakyti apie konkrečias prekes, kainas, likučius ir pristatymą. Jei prireikia žmogaus pagalbos, pokalbį perduoda jūsų komandai.

Tai nėra įprastas DUK langas: „Loqara“ supranta patikslinimus ir išlaiko pokalbio kontekstą, todėl lankytojas gali klausti natūraliai – panašiai kaip bendraudamas su konsultantu.

Galiu be jokių įsipareigojimų paruošti trumpą demo pagal jūsų svetainę, kad patys įvertintumėte, ar tai būtų naudinga.

Ar norėtumėte jį pamatyti?$$,
    false,
    'ready'
  ),
  (
    'Dehome space',
    'Bendra Lietuvos ir Prancūzijos UAB „SOFRALITA“',
    'https://dehomespace.lt',
    'Kaunas',
    'E-komercija',
    'Eglė Butkienė',
    'eshop@dehomespace.lt',
    '+370 622 66855',
    '39 darbuotojai; ekspozicijoje daugiau kaip 2 000 baldų ir interjero detalių',
    'WooCommerce',
    'DEHOME SPACE pristato daugiau kaip 2 000 ekspozicijos baldų ir interjero detalių, įskaitant vienetines bei riboto leidimo prekes. AI konsultantas galėtų padėti lankytojui greitai atsirinkti tinkamo stiliaus, dydžio ar kainos gaminius ir patikrinti jų prieinamumą.',
    'Didelė fizinė ekspozicija ir WooCommerce parduotuvė su dažnai vienetinėmis prekėmis labai tinka gyvam katalogo konsultantui. Svetainėje neaptiktas pokalbių asistentas.',
    'dehomespace.lt ir /kontaktai; svetainės HTML (WooCommerce); rekvizitai.vz.lt/imone/sofralita_bendra_lietuvos_ir_prancuzijos_uab',
    91,
    'e-komercija (WooCommerce) – tiesioginė katalogo sinchronizacija; 2 000+ ekspozicijos prekių ir vienetiniai likučiai – didelė paieškos vertė; neturi pokalbių asistento',
    'Dehome space: idėja svetainei',
    $$Laba diena,

DEHOME SPACE Kaune pristato daugiau kaip 2 000 ekspozicijos baldų ir interjero detalių, įskaitant vienetinius bei riboto leidimo gaminius. AI konsultantas galėtų padėti lankytojui greitai rasti tinkamo stiliaus, matmenų ar kainos prekes ir pasitikrinti jų prieinamumą.

Esu Eimantas, kuriu „Loqara“ – lietuviškai bendraujantį AI konsultantą e. parduotuvėms. Jis remiasi jūsų svetainės turiniu ir prekių katalogu, todėl bet kuriuo paros metu gali atsakyti apie konkrečias prekes, kainas, likučius ir pristatymą. Jei prireikia žmogaus pagalbos, pokalbį perduoda jūsų komandai.

Tai nėra įprastas DUK langas: „Loqara“ supranta patikslinimus ir išlaiko pokalbio kontekstą, todėl lankytojas gali klausti natūraliai – panašiai kaip bendraudamas su konsultantu.

Galiu be jokių įsipareigojimų paruošti trumpą demo pagal jūsų svetainę, kad patys įvertintumėte, ar tai būtų naudinga.

Ar norėtumėte jį pamatyti?$$,
    false,
    'ready'
  ),
  (
    'Magrės baldai',
    'UAB „ZBIGA“',
    'https://www.magresbaldai.lt',
    'Vilniaus r. +3',
    'E-komercija',
    'Greta Jodikaitė',
    'info@magre.lt',
    '+370 634 85000',
    '30 metų veiklos; daugiau kaip 200 darbuotojų; salonai 4 miestuose',
    'Individuali (Nordcode)',
    'MAGRĖS BALDAI daugiau kaip 30 metų gamina lietuviškus premium klasės baldus, turi 200+ darbuotojų komandą, salonus keliuose miestuose ir internetinę prekybą. AI konsultantas galėtų padėti palyginti modelius, audinius, matmenis ir pristatymo sąlygas.',
    'Didelis lietuviškas gamintojas su sudėtingais, konfigūruojamais gaminiais ir aiškiu konsultavimo poreikiu. Dabartinei individualiai parduotuvei reikėtų produkto feed arba atskiro integracijos patikrinimo; pokalbių asistento neaptikta.',
    'magresbaldai.lt/premium-klases-baldai ir /kontaktai; svetainės HTML (Nordcode); rekvizitai.vz.lt/imone/zbiga_administracija',
    84,
    'didelis žinomas gamintojas ir keli salonai – didelė konsultavimo vertė; neturi pokalbių asistento; individuali platforma – katalogo integraciją reikėtų patikrinti',
    'Magrės baldai: idėja svetainei',
    $$Laba diena,

MAGRĖS BALDAI jau daugiau kaip 30 metų gamina lietuviškus baldus, o daugiau kaip 200 žmonių komanda juos pristato salonuose ir internetu. AI konsultantas galėtų padėti lankytojui svetainėje palyginti modelius, audinius, matmenis ir pristatymo sąlygas prieš kreipiantis į konsultantą.

Esu Eimantas, kuriu „Loqara“ – lietuviškai bendraujantį AI konsultantą e. parduotuvėms. Jis remiasi jūsų svetainės turiniu ir prekių katalogu, todėl bet kuriuo paros metu gali atsakyti apie konkrečias prekes, kainas, likučius ir pristatymą. Jei prireikia žmogaus pagalbos, pokalbį perduoda jūsų komandai.

Tai nėra įprastas DUK langas: „Loqara“ supranta patikslinimus ir išlaiko pokalbio kontekstą, todėl lankytojas gali klausti natūraliai – panašiai kaip bendraudamas su konsultantu.

Galiu be jokių įsipareigojimų paruošti trumpą demo pagal jūsų svetainę, kad patys įvertintumėte, ar tai būtų naudinga.

Ar norėtumėte jį pamatyti?$$,
    false,
    'ready'
  ),
  (
    'Gintaro Baldai',
    'UAB „Gintaro baldai“',
    'https://gintarobaldai.lt',
    'Klaipėda + LT/LV/EE',
    'E-komercija',
    'Gintaras Dirkstys',
    'pagalba@gintarobaldai.lt',
    '+370 46 490400',
    '124 darbuotojai; €23,8 mln. 2025 m. pajamos; prekyba Lietuvoje, Latvijoje ir Estijoje',
    'PrestaShop',
    'Gintaro Baldai nuo 2002 m. išaugo iš pirmojo salono Klaipėdoje į prekybos tinklą Lietuvoje, Latvijoje ir Estijoje. AI konsultantas galėtų padėti palyginti didelio katalogo baldų matmenis, komplektacijas, kainas ir pristatymo informaciją.',
    'Didelis regioninis baldų prekybos tinklas su plačiu e. katalogu ir pakankamu biudžetu. PrestaShop nėra tiesiogiai palaikomas, todėl katalogui reikėtų feed ar naujos integracijos; svetainėje veikia skambučio užsakymas, bet ne pokalbių asistentas.',
    'gintarobaldai.lt; svetainės HTML (PrestaShop); rekvizitai.vz.lt/imone/gintaro_baldai; fsaskaita.lt/imone/uzdaroji-akcine-bendrove-gintaro-baldai-174593071',
    83,
    'didelis regioninis e. prekybos tinklas ir platus katalogas – didelė vertė; neturi pokalbių asistento; PrestaShop katalogui reikėtų feed ar integracijos',
    'Gintaro Baldai: idėja svetainei',
    $$Laba diena,

Gintaro Baldai nuo 2002 m. išaugo iš pirmojo salono Klaipėdoje į prekybos tinklą Lietuvoje, Latvijoje ir Estijoje. AI konsultantas galėtų padėti lankytojui palyginti baldų matmenis, komplektacijas, kainas ir pristatymo informaciją prieš registruojantis konsultacijai.

Esu Eimantas, kuriu „Loqara“ – lietuviškai bendraujantį AI konsultantą e. parduotuvėms. Jis remiasi jūsų svetainės turiniu ir prekių katalogu, todėl bet kuriuo paros metu gali atsakyti apie konkrečias prekes, kainas, likučius ir pristatymą. Jei prireikia žmogaus pagalbos, pokalbį perduoda jūsų komandai.

Tai nėra įprastas DUK langas: „Loqara“ supranta patikslinimus ir išlaiko pokalbio kontekstą, todėl lankytojas gali klausti natūraliai – panašiai kaip bendraudamas su konsultantu.

Galiu be jokių įsipareigojimų paruošti trumpą demo pagal jūsų svetainę, kad patys įvertintumėte, ar tai būtų naudinga.

Ar norėtumėte jį pamatyti?$$,
    false,
    'ready'
  ),
  (
    'LONAS',
    'UAB „Lonas“',
    'https://www.lonas.lt',
    'Jonava + LT',
    'E-komercija',
    'Domas Jakutis',
    'info@lonas.lt',
    '+370 700 77044',
    'Veikia nuo 1993 m.; 50 000+ klientų; firminių salonų tinklas Lietuvoje',
    'PrestaShop',
    'LONAS nuo 1993 m. kuria lovas, čiužinius ir miego prekes, o svetainėje turi atskirus pasirinkimo gidus bei DUK pagal produktų grupes. AI konsultantas galėtų sujungti šią informaciją su katalogu ir padėti palyginti kietumą, matmenis, medžiagas bei pristatymą.',
    'Žinomas lietuviškas prekės ženklas su konsultavimo reikalaujančiais gaminiais, dideliu turinio kiekiu ir salonų tinklu. PrestaShop katalogui reikėtų feed ar integracijos; pokalbių asistento svetainėje neaptikta.',
    'lonas.lt/lt, /lt/klausimai ir /lt/prekiu-pirkimo-pardavimo-taisykles; svetainės HTML (PrestaShop); rekvizitai.vz.lt/imone/lonas/juridinis-asmuo',
    82,
    'stiprus prekės ženklas, salonų tinklas ir sudėtingas pasirinkimas – didelė konsultavimo vertė; neturi pokalbių asistento; PrestaShop katalogui reikėtų feed ar integracijos',
    'LONAS: idėja svetainei',
    $$Laba diena,

LONAS nuo 1993 m. kuria lovas, čiužinius ir miego prekes, o svetainėje pateikia atskirus gidus bei DUK skirtingoms produktų grupėms. AI konsultantas galėtų padėti lankytojui surasti ir palyginti aktualią informaciją apie kietumą, matmenis, medžiagas, pristatymą ar priežiūrą.

Esu Eimantas, kuriu „Loqara“ – lietuviškai bendraujantį AI konsultantą e. parduotuvėms. Jis remiasi jūsų svetainės turiniu ir prekių katalogu, todėl bet kuriuo paros metu gali atsakyti apie konkrečias prekes, kainas, likučius ir pristatymą. Jei prireikia žmogaus pagalbos, pokalbį perduoda jūsų komandai.

Tai nėra įprastas DUK langas: „Loqara“ supranta patikslinimus ir išlaiko pokalbio kontekstą, todėl lankytojas gali klausti natūraliai – panašiai kaip bendraudamas su konsultantu.

Galiu be jokių įsipareigojimų paruošti trumpą demo pagal jūsų svetainę, kad patys įvertintumėte, ar tai būtų naudinga.

Ar norėtumėte jį pamatyti?$$,
    false,
    'ready'
  ),
  (
    'Baldai1',
    'UAB „Baldai1“',
    'https://www.baldai1.lt',
    'Vilnius',
    'E-komercija',
    'Evaldas Žvaginis',
    'info@baldai1.lt',
    '+370 620 20111',
    'Didžiausia specializuota LT baldų e. parduotuvė pagal 2024 m. ECDB pajamų įvertį; 807 atsiliepimai svetainėje',
    'CS-Cart',
    'Baldai1.lt turi vieną plačiausių baldų katalogų Lietuvoje, aiškią pristatymo ir surinkimo informaciją bei 365 dienų grąžinimą. AI konsultantas galėtų padėti palyginti konkrečius modelius, matmenis ir pristatymo terminus, papildydamas Messenger kanalą.',
    'Labai didelis specializuotas baldų srautas ir katalogo sudėtingumas, bet jau yra Messenger kontaktas, o individualizuotam CS-Cart katalogui reikėtų feed arba naujos integracijos.',
    'baldai1.lt ir /kontaktai.html; ECDB Lithuania furniture ranking; svetainės HTML (CS-Cart, Messenger); rekvizitai.vz.lt/imone/baldai1/juridinis-asmuo',
    78,
    'vienas didžiausių specializuotų baldų e. prekybos srautų – didelė vertė; jau turi Messenger kanalą – sunkiau pakeisti; CS-Cart katalogui reikėtų feed ar integracijos',
    'Baldai1: dėl pokalbių asistento',
    $$Laba diena,

Baldai1.lt siūlo vieną plačiausių internetinių baldų katalogų Lietuvoje ir skelbia aiškią pristatymo, surinkimo bei 365 dienų grąžinimo informaciją. AI konsultantas galėtų padėti lankytojui palyginti konkrečius modelius, matmenis ir pristatymo terminus, papildydamas jau naudojamą Messenger kanalą.

Esu Eimantas, kuriu „Loqara“ – lietuviškai bendraujantį AI konsultantą e. parduotuvėms. Jis remiasi jūsų svetainės turiniu ir prekių katalogu, todėl bet kuriuo paros metu gali atsakyti apie konkrečias prekes, kainas, likučius ir pristatymą. Jei prireikia žmogaus pagalbos, pokalbį perduoda jūsų komandai.

Tai nėra įprastas DUK langas: „Loqara“ supranta patikslinimus ir išlaiko pokalbio kontekstą, todėl lankytojas gali klausti natūraliai – panašiai kaip bendraudamas su konsultantu.

Galiu be jokių įsipareigojimų paruošti trumpą demo pagal jūsų svetainę, kad patys įvertintumėte, ar tai būtų naudinga.

Ar norėtumėte jį pamatyti?$$,
    true,
    'ready'
  ),
  (
    'Accanto',
    'UAB „Accanto group“',
    'https://www.accanto.lt',
    'Kaunas +4',
    'E-komercija',
    'Juozas Grudzinskas',
    'accanto@accanto.lt',
    '+370 630 30733',
    'Daugiau kaip 3 000 produktų; 5 salonai Lietuvoje ir salonas Rygoje',
    'PrestaShop',
    'ACCANTO internetinėje parduotuvėje yra daugiau kaip 3 000 baldų ir interjero prekių, o salonai veikia penkiuose Lietuvos miestuose. AI konsultantas galėtų kataloge palyginti matmenis, medžiagas ir pristatymą, papildydamas jau naudojamą Tawk.to pokalbių langą.',
    'Didelis katalogas ir keli salonai yra stiprus konsultavimo scenarijus, tačiau jau veikia Tawk.to, o PrestaShop nėra tiesiogiai palaikomas – katalogui reikėtų feed ar integracijos.',
    'accanto.lt/kontaktai; svetainės HTML (PrestaShop assetai, Tawk.to); rekvizitai.vz.lt/imone/accanto_group/valdymas',
    75,
    '3 000+ prekių ir keli salonai – didelė konsultavimo vertė; jau turi Tawk.to – konkurencinis taikinys; PrestaShop katalogui reikėtų feed ar integracijos',
    'Accanto: dėl pokalbių asistento',
    $$Laba diena,

ACCANTO internetinėje parduotuvėje pateikiate daugiau kaip 3 000 baldų ir interjero prekių, o salonai veikia penkiuose Lietuvos miestuose. AI konsultantas galėtų padėti lankytojui palyginti konkrečių baldų matmenis, medžiagas ir pristatymo informaciją tiesiai iš katalogo, papildydamas jau naudojamą pokalbių langą.

Esu Eimantas, kuriu „Loqara“ – lietuviškai bendraujantį AI konsultantą e. parduotuvėms. Jis remiasi jūsų svetainės turiniu ir prekių katalogu, todėl bet kuriuo paros metu gali atsakyti apie konkrečias prekes, kainas, likučius ir pristatymą. Jei prireikia žmogaus pagalbos, pokalbį perduoda jūsų komandai.

Tai nėra įprastas DUK langas: „Loqara“ supranta patikslinimus ir išlaiko pokalbio kontekstą, todėl lankytojas gali klausti natūraliai – panašiai kaip bendraudamas su konsultantu.

Galiu be jokių įsipareigojimų paruošti trumpą demo pagal jūsų svetainę, kad patys įvertintumėte, ar tai būtų naudinga.

Ar norėtumėte jį pamatyti?$$,
    true,
    'ready'
  ),
  (
    'Houmy',
    'MB „Praktiški baldai“',
    'https://houmy.lt',
    'Kaunas',
    'E-komercija',
    'Ramūnas Petraška',
    'info@houmy.lt',
    '+370 675 04607',
    'Šeimos įmonė; baldų salonas Kaune ir internetinė parduotuvė',
    'PrestaShop',
    'HOUMY siūlo svetainės, miegamojo ir valgomojo baldus, kurių daugeliui galima rinktis audinius, spalvas ir funkcijas. AI konsultantas galėtų padėti palyginti matmenis, miego funkcijas, audinius ir produktų puslapiuose nurodytus pristatymo terminus.',
    'Konsultavimo reikalaujantys konfigūruojami baldai ir maža šeimos įmonė reiškia didelę automatizavimo naudą. PrestaShop katalogui reikėtų feed ar integracijos; pokalbių asistento neaptikta.',
    'houmy.lt, /content/6-apie-mus ir kontaktai svetainėje; svetainės HTML (PrestaShop); imones.lt/praktiski-baldai-mb',
    72,
    'konfigūruojami baldai ir maža komanda – aiški konsultavimo nauda; neturi pokalbių asistento; PrestaShop katalogui reikėtų feed ar integracijos',
    'Houmy: idėja svetainei',
    $$Laba diena,

HOUMY šeimos įmonė Kaune siūlo svetainės, miegamojo ir valgomojo baldus, kurių daugeliui galima rinktis audinius bei spalvas. AI konsultantas galėtų padėti lankytojui palyginti matmenis, miego funkcijas, audinius ir produkto puslapyje nurodytą pristatymo terminą.

Esu Eimantas, kuriu „Loqara“ – lietuviškai bendraujantį AI konsultantą e. parduotuvėms. Jis remiasi jūsų svetainės turiniu ir prekių katalogu, todėl bet kuriuo paros metu gali atsakyti apie konkrečias prekes, kainas, likučius ir pristatymą. Jei prireikia žmogaus pagalbos, pokalbį perduoda jūsų komandai.

Tai nėra įprastas DUK langas: „Loqara“ supranta patikslinimus ir išlaiko pokalbio kontekstą, todėl lankytojas gali klausti natūraliai – panašiai kaip bendraudamas su konsultantu.

Galiu be jokių įsipareigojimų paruošti trumpą demo pagal jūsų svetainę, kad patys įvertintumėte, ar tai būtų naudinga.

Ar norėtumėte jį pamatyti?$$,
    false,
    'ready'
  )
on conflict (website) do nothing;
