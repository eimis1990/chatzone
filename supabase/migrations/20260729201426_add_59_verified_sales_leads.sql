-- ---------------------------------------------------------------------------
-- 59 first-party-verified prospects for the owner outreach pipeline
-- ---------------------------------------------------------------------------
-- Every candidate was checked on its own public website on 2026-07-29. The
-- batch excludes existing normalized website hosts and email addresses, uses
-- only public business contacts, and leaves every row Ready (no email is sent).

with researched_leads (
  name,
  website,
  vertical,
  email,
  phone,
  platform,
  hook,
  score
) as (
  values
    (
      'Baldaila',
      'https://www.baldaila.lt',
      'Baldai ir interjeras',
      'info@baldaila.lt',
      '+370 633 33381',
      'WooCommerce',
      $$Baldaila kataloge lankytojai renkasi sofas, lovas, čiužinius, stalus, kėdes ir kitus baldus pagal daugybę praktinių parametrų. AI konsultantas galėtų greitai susiaurinti pasirinkimą pagal kambario dydį, matmenis, spalvą, kainą ir pristatymo poreikį.$$,
      94
    ),
    (
      'Lenkijos Prekės',
      'https://lenkijosprekes.lt',
      'Baldai ir interjeras',
      'kontaktai@lenkijosprekes.lt',
      null,
      'WooCommerce',
      $$„Lenkijos Prekės“ siūlo namų ir biuro baldus skirtingoms erdvėms, spalvoms bei paskirtims. AI konsultantas galėtų padėti lankytojui greitai atrasti tinkamus baldus pagal turimą vietą, stilių ir biudžetą.$$,
      93
    ),
    (
      'Leojar',
      'https://www.leojar.lt',
      'Baldai ir interjeras',
      'info@leojar.lt',
      '+370 645 30740',
      'PrestaShop',
      $$Leojar parduotuvėje pateikiamas platus svetainės, miegamojo, valgomojo ir biuro baldų pasirinkimas. AI konsultantas galėtų padėti palyginti modelių matmenis, medžiagas, spalvas bei pristatymo sąlygas vieno pokalbio metu.$$,
      84
    ),
    (
      'Interio',
      'https://www.interio.lt',
      'Baldai ir interjeras',
      'interio@interio.lt',
      '+370 659 85356',
      'WooCommerce',
      $$Interio kataloge derinami modernaus dizaino baldai ir interjero detalės, todėl pirkėjui svarbu suderinti ne tik matmenis, bet ir bendrą stilių. AI konsultantas galėtų pasiūlyti tarpusavyje derančius variantus pagal erdvę, spalvas ir biudžetą.$$,
      93
    ),
    (
      'DekoSofa',
      'https://dekosofa.lt',
      'Baldai ir interjeras',
      'info@dekosofa.lt',
      '+370 607 48793',
      'WooCommerce',
      $$DekoSofa specializuojasi minkštuose balduose, kuriuos pirkėjai vertina pagal matmenis, miego funkciją, audinius ir pritaikymą konkrečiai erdvei. AI konsultantas galėtų iš karto palyginti tinkamus modelius ir atsakyti į dažniausius klausimus prieš užsakymą.$$,
      94
    ),
    (
      'Dviračiai internetu',
      'https://dviraciaiinternetu.lt',
      'Dviračiai ir laisvalaikis',
      'sarunas@dviraciaiinternetu.lt',
      '+370 627 02020',
      'WooCommerce',
      $$„Dviračiai internetu“ lankytojams reikia pasirinkti tinkamą dviračio tipą, rėmo dydį ir komplektaciją pagal ūgį bei važiavimo įpročius. AI konsultantas galėtų užduoti kelis tikslius klausimus ir iš katalogo pasiūlyti geriausiai tinkančius modelius.$$,
      94
    ),
    (
      'Rankis.lt',
      'https://www.rankis.lt',
      'Įrankiai ir technika',
      'uzsakymai@rankis.lt',
      '+370 689 00009',
      'Verskis',
      $$Rankis.lt kataloge gausu elektrinių, akumuliatorinių ir sodo įrankių su skirtingomis techninėmis savybėmis bei priedų suderinamumu. AI konsultantas galėtų padėti išsirinkti įrankį konkrečiam darbui ir patikrinti, kokių baterijų ar priedų jam reikia.$$,
      95
    ),
    (
      'Bikko',
      'https://bikko.lt',
      'Dviračiai ir laisvalaikis',
      'info@bikko.lt',
      '+370 684 18384',
      'PrestaShop',
      $$Bikko siūlo dviračius, dalis ir aksesuarus, kurių pasirinkimas priklauso nuo ūgio, važiavimo būdo ir tarpusavio suderinamumo. AI konsultantas galėtų padėti lankytojui greičiau rasti tinkamą modelį ar detalę ir sumažinti netinkamo pasirinkimo riziką.$$,
      85
    ),
    (
      'Dviračių žygiai',
      'https://www.dviraciuzygiai.lt',
      'Dviračiai ir laisvalaikis',
      'info@dviraciuzygiai.lt',
      null,
      'OpenCart',
      $$„Dviračių žygiai“ vienoje parduotuvėje jungia dviračius, turizmo prekes, dalis ir aksesuarus. AI konsultantas galėtų padėti pirkėjui susikomplektuoti tarpusavyje suderinamą inventorių konkrečiam maršrutui ar kelionės tipui.$$,
      82
    ),
    (
      'Aštunkė',
      'https://astunke.lt',
      'Dviračiai ir laisvalaikis',
      'info@astunke.lt',
      '+370 625 93048',
      'WooCommerce',
      $$Aštunkė specializuojasi dviračių dalyse ir aksesuaruose, kur tikslus suderinamumas dažnai svarbesnis už vien kainą. AI konsultantas galėtų padėti pagal dviračio tipą ir turimą komponentą atrasti tinkamas alternatyvas iš katalogo.$$,
      93
    ),
    (
      'Dviračių arena',
      'https://dviraciuarena.lt',
      'Dviračiai ir laisvalaikis',
      'info@dviraciuarena.lt',
      '+370 656 39448',
      'OpenCart',
      $$Dviračių arena siūlo skirtingų tipų dviračius ir platų susijusių prekių pasirinkimą. AI konsultantas galėtų padėti lankytojui palyginti rėmo dydį, komplektaciją, naudojimo paskirtį bei prieinamumą prieš vykstant į parduotuvę.$$,
      82
    ),
    (
      'Plaukams.com',
      'https://www.plaukams.com',
      'Grožis ir kosmetika',
      'info.restatas@gmail.com',
      '+370 660 87888',
      'Individuali / nenustatyta',
      $$Plaukams.com siūlo profesionalią plaukų kosmetiką skirtingoms plaukų būklėms, problemoms ir priežiūros rutinoms. AI konsultantas galėtų padėti lankytojui išsirinkti tarpusavyje derančias priemones pagal plaukų tipą bei norimą rezultatą.$$,
      78
    ),
    (
      'Profkosmetika',
      'https://www.profkosmetika.lt',
      'Grožis ir kosmetika',
      'info@profkosmetika.lt',
      '+370 690 02996',
      'Verskis',
      $$Profkosmetika kataloge yra profesionalios priemonės plaukams, veidui ir pėdoms, todėl klientams tenka derinti produktus pagal odos ar plaukų būklę. AI konsultantas galėtų padėti suformuoti tinkamą rutiną ir rasti konkrečius produktus iš gyvo katalogo.$$,
      94
    ),
    (
      'Dalys motociklams',
      'https://www.dalysmotociklams.lt',
      'Moto dalys ir aksesuarai',
      'info@dalysmotociklams.lt',
      null,
      'Individuali / nenustatyta',
      $$„Dalys motociklams“ lankytojams svarbiausia tiksliai parinkti detalę pagal motociklo markę, modelį ir metus. AI konsultantas galėtų padėti surinkti šią informaciją, paaiškinti suderinamumą ir nukreipti į tinkamus katalogo variantus.$$,
      81
    ),
    (
      'Ubela',
      'https://ubela.lt',
      'Grožis ir kosmetika',
      'info@ubela.lt',
      '+370 648 61618',
      'WooCommerce',
      $$Ubela siūlo kosmetiką ir kosmeceutiką, kurios pasirinkimas priklauso nuo odos tipo, jautrumo bei norimo rezultato. AI konsultantas galėtų padėti lankytojui susiorientuoti produktų sudėtyse ir pasirinkti tinkamą priežiūros rutiną.$$,
      92
    ),
    (
      'MXshop',
      'https://www.mxshop.lt',
      'Moto dalys ir aksesuarai',
      'info@mxshop.lt',
      '+370 647 27708',
      'Individuali / nenustatyta',
      $$MXshop parduoda motociklų dalis, aksesuarus ir aprangą, kur pirkėjams aktualūs dydžiai, modelių suderinamumas ir naudojimo paskirtis. AI konsultantas galėtų vienoje vietoje atsakyti į šiuos klausimus ir pasiūlyti tinkamus komplektus.$$,
      81
    ),
    (
      'Studio IV',
      'https://www.studioiv.lt',
      'Grožis ir kosmetika',
      'info@studioiv.lt',
      '+370 625 77533',
      'OpenCart',
      $$Studio IV kataloge profesionalūs grožio produktai skirti skirtingiems plaukų tipams ir procedūroms. AI konsultantas galėtų padėti atrasti tinkamą produktų derinį pagal kliento poreikį bei paaiškinti jų naudojimo eigą.$$,
      82
    ),
    (
      'Framesi Lithuania',
      'https://framesi.lt',
      'Grožis ir kosmetika',
      'info@framesi.lt',
      '+370 656 08777',
      'PrestaShop',
      $$Framesi Lithuania siūlo profesionalią itališką plaukų kosmetiką tiek salonams, tiek individualiai priežiūrai. AI konsultantas galėtų padėti pasirinkti liniją pagal plaukų būklę, procedūrą ir norimą rezultatą.$$,
      83
    ),
    (
      'Lucia',
      'https://www.lucia.lt',
      'Grožis ir kosmetika',
      'info@lucia.lt',
      '+370 616 45666',
      'Individuali / nenustatyta',
      $$Lucia parduotuvėje lankytojui tenka rinktis grožio priemones pagal individualų poreikį ir tarpusavio suderinamumą. AI konsultantas galėtų padėti greičiau atrasti tinkamą rutiną bei paaiškinti konkrečių produktų skirtumus.$$,
      78
    ),
    (
      'Terariumai.lt',
      'https://terariumai.lt',
      'Gyvūnų prekės',
      'biuras@akvariumai.lt',
      '+370 640 59757',
      'OpenCart',
      $$Terariumai.lt kataloge yra terariumai, šildymas, apšvietimas, drėkinimas, dekoracijos ir priemonės skirtingoms egzotinių gyvūnų rūšims. AI konsultantas galėtų padėti sukomplektuoti suderinamą aplinką pagal konkretų augintinį ir jo priežiūros reikalavimus.$$,
      85
    ),
    (
      'Kūdikių prekių išparduotuvė',
      'https://www.isparduotuvekudikiams.lt',
      'Prekės vaikams',
      'info@isparduotuvekudikiams.lt',
      '+370 652 26328',
      'WooCommerce',
      $$Kūdikių prekių išparduotuvėje tėvai renkasi vežimėlius ir autokėdutes pagal vaiko amžių, automobilį, svorį ir gyvenimo būdą. AI konsultantas galėtų padėti palyginti saugumo, dydžio ir komplektacijos skirtumus bei atrasti tinkamą variantą.$$,
      94
    ),
    (
      'Artilė',
      'https://artile.lt',
      'Plytelės ir apdaila',
      'info@artile.lt',
      '+370 660 55505',
      'PrestaShop',
      $$Artilė pristato plytelių pasirinkimą skirtingoms patalpoms, paviršiams ir interjero stiliams. AI konsultantas galėtų padėti lankytojui atsirinkti tinkamą formatą, paviršių, spalvą ir kiekį pagal planuojamą erdvę.$$,
      85
    ),
    (
      'Conterna',
      'https://conterna.lt',
      'Statyba ir apdaila',
      'info@conterna.lt',
      '+370 647 77229',
      'Individuali / nenustatyta',
      $$Conterna tiekia techninių profilių sistemas grindims, sienoms ir fasadams, kurių pasirinkimas priklauso nuo konstrukcijos bei apdailos sprendimo. AI konsultantas galėtų surinkti projekto parametrus ir padėti lankytojui greičiau rasti tinkamą sistemą.$$,
      80
    ),
    (
      'Terracota',
      'https://terracota.lt',
      'Plytelės ir apdaila',
      'info@terracota.lt',
      '+370 648 87186',
      'WooCommerce',
      $$Terracota specializuojasi ispaniškose plytelėse, kurias pirkėjai derina pagal patalpą, formatą, paviršių ir interjero stilių. AI konsultantas galėtų padėti susiaurinti pasirinkimą ir atsakyti apie kiekius, pristatymą bei derančias kolekcijas.$$,
      93
    ),
    (
      'Plytelių bazė',
      'https://plyteliubaze.lt',
      'Plytelės ir apdaila',
      'info@plyteliubaze.lt',
      '+370 677 72448',
      'Individuali / nenustatyta',
      $$Plytelių bazė vienoje vietoje siūlo plyteles, parketą ir kitas grindų dangas, todėl lankytojams tenka lyginti medžiagas bei jų tinkamumą skirtingoms erdvėms. AI konsultantas galėtų padėti pagal plotą, eksploataciją ir biudžetą atrasti tinkamus variantus.$$,
      80
    ),
    (
      'Domus Classica',
      'https://www.domclassic.lt',
      'Plytelės ir apdaila',
      'info@domclassic.lt',
      '+370 679 72229',
      'WooCommerce',
      $$Domus Classica siūlo vonios, grindų ir sienų plyteles skirtingiems interjero projektams. AI konsultantas galėtų padėti lankytojui palyginti formatus, paviršius, spalvas ir reikalingą kiekį pagal konkrečią patalpą.$$,
      93
    ),
    (
      'Vežimėlių kampelis',
      'https://www.vezimeliu-kampelis.lt',
      'Prekės vaikams',
      'info@vezimeliu-kampelis.lt',
      '+370 655 54949',
      'Verskis',
      $$Vežimėlių kampelyje tėvai renkasi vežimėlius ir kitas vaikų prekes pagal amžių, gyvenimo būdą, svorį ir komplektaciją. AI konsultantas galėtų palyginti variantus iš katalogo ir paaiškinti, kuo skiriasi konkrečių modelių funkcijos.$$,
      95
    ),
    (
      'LHP',
      'https://lhp.lt',
      'Šildymas ir vėdinimas',
      'lhp@lhp.lt',
      '+370 683 72201',
      'WooCommerce',
      $$LHP siūlo kondicionierius, šilumos siurblius ir rekuperatorius, kurių parinkimui svarbūs patalpų plotas, energinis efektyvumas bei montavimo sąlygos. AI konsultantas galėtų surinkti pagrindinius parametrus ir pasiūlyti tinkamiausias sistemas.$$,
      94
    ),
    (
      'Airlux',
      'https://airlux.lt',
      'Šildymas ir vėdinimas',
      'info@airlux.lt',
      '+370 635 53522',
      'Individuali / nenustatyta',
      $$Airlux pristato oro kondicionierius, šilumos siurblius ir rekuperatorius namams bei verslui. AI konsultantas galėtų pagal patalpų dydį, naudojimo režimą ir montavimo situaciją padėti lankytojui atrasti tinkamą sprendimą prieš konsultaciją.$$,
      81
    ),
    (
      'Katilų turgus',
      'https://www.katiluturgus.lt',
      'Šildymas ir vėdinimas',
      'info@katiluturgus.lt',
      '+370 678 75575',
      'Verskis',
      $$Katilų turgus turi platų katilų ir šildymo įrangos katalogą, kuriame pasirinkimą lemia pastato plotas, kuro tipas, galingumas ir sistemos suderinamumas. AI konsultantas galėtų paaiškinti skirtumus ir iš gyvo katalogo pasiūlyti tinkamus variantus.$$,
      95
    ),
    (
      'Termo1',
      'https://termo1.lt',
      'Šildymas ir vėdinimas',
      'info@termo1.lt',
      '+370 625 38758',
      'WooCommerce',
      $$Termo1 parduotuvėje profesionali šildymo ir vėdinimo įranga turi daug techninių parametrų bei tarpusavio suderinamumo reikalavimų. AI konsultantas galėtų padėti lankytojui greičiau atsirinkti įrangą konkrečiai sistemai ir projektui.$$,
      94
    ),
    (
      'Oro asas',
      'https://oroasas.lt',
      'Šildymas ir vėdinimas',
      'info@oroasas.lt',
      '+370 675 08883',
      'Individuali / nenustatyta',
      $$Oro asas siūlo kondicionierius ir šilumos siurblius, kurių pasirinkimas priklauso nuo patalpų dydžio, šildymo poreikio ir montavimo sąlygų. AI konsultantas galėtų preliminariai įvertinti poreikį ir nukreipti lankytoją į tinkamus modelius.$$,
      81
    ),
    (
      'E-NIT',
      'https://www.e-nit.lt',
      'Šildymas ir vėdinimas',
      'promo@e-nit.lt',
      '+370 611 40007',
      'Verskis',
      $$E-NIT kataloge pateikiami rekuperatoriai, šilumos siurbliai ir kita inžinerinė įranga, kurios pasirinkimui reikia techninių duomenų. AI konsultantas galėtų išsiaiškinti objekto parametrus ir iš katalogo pasiūlyti tinkamus įrenginius bei priedus.$$,
      95
    ),
    (
      'Kondikas',
      'https://kondikas.lt',
      'Šildymas ir vėdinimas',
      'info@kondikas.lt',
      '+370 655 59812',
      'WooCommerce',
      $$Kondikas vienoje parduotuvėje jungia rekuperatorius, šilumos siurblius ir kondicionierius. AI konsultantas galėtų padėti lankytojui palyginti sistemų galingumą, efektyvumą, triukšmo lygį ir tinkamumą konkrečioms patalpoms.$$,
      94
    ),
    (
      'Plumbera',
      'https://plumbera.lt',
      'Šildymas ir vėdinimas',
      'info@plumbera.lt',
      '+370 639 66995',
      'WooCommerce',
      $$Plumbera siūlo šildymo ir vėdinimo įrangą bei sprendimus, kuriems svarbus tikslus techninis parinkimas. AI konsultantas galėtų surinkti projekto poreikius, atsakyti apie suderinamumą ir pasiūlyti tinkamas prekes iš katalogo.$$,
      94
    ),
    (
      'Hyteris',
      'https://hyteris.lt',
      'Šildymas ir vėdinimas',
      'juozas@hyteris.lt',
      null,
      'WooCommerce',
      $$Hyteris pristato šilumos siurblius, rekuperatorius ir kondicionierius skirtingiems objektams. AI konsultantas galėtų pagal namo plotą, šilumos poreikį ir esamą sistemą padėti atrasti tinkamą įrangos variantą.$$,
      93
    ),
    (
      'Proventas',
      'https://www.proventas.lt',
      'Šildymas ir vėdinimas',
      'robertas@proventas.lt',
      '+370 608 77190',
      'Verskis',
      $$Proventas elektroninėje parduotuvėje pateikia vėdinimo ir kondicionavimo įrangą su techniniais priedais bei komponentais. AI konsultantas galėtų padėti lankytojui sukomplektuoti suderinamą sistemą ir rasti reikiamas dalis iš katalogo.$$,
      95
    ),
    (
      'Kavos mugė',
      'https://kavosmuge.lt',
      'Kava ir kavos įranga',
      'info@kavosmuge.lt',
      '+370 614 27468',
      'Magento',
      $$Kavos mugė siūlo kavos aparatus, kavą ir priežiūros priemones, kur pasirinkimas priklauso nuo gėrimų įpročių, naudojimo intensyvumo bei biudžeto. AI konsultantas galėtų palyginti aparatus ir pasiūlyti jiems tinkamas pupeles bei priežiūros produktus.$$,
      92
    ),
    (
      'Saugus pasaulis',
      'https://www.sauguspasaulis.lt',
      'Saugumo ir matavimo įranga',
      'kaunas@sauguspasaulis.lt',
      '+370 684 69777',
      'Individuali / nenustatyta',
      $$Saugus pasaulis siūlo matavimo prietaisus, saugumo įrangą ir inžinerinius sprendimus, kuriems dažnai reikia techninės konsultacijos. AI konsultantas galėtų padėti lankytojui pagal užduotį atrasti tinkamą prietaisą ir paaiškinti svarbiausius parametrus.$$,
      82
    ),
    (
      'VGA',
      'https://www.vga.lt',
      'Saugumo ir stebėjimo įranga',
      'info@vga.lt',
      '+370 685 68158',
      'Individuali / nenustatyta',
      $$VGA prekiauja vaizdo stebėjimo kameromis, GPS sekliais ir kita saugumo įranga bei teikia konsultacijas. AI konsultantas galėtų pagal saugomą objektą, ryšio sąlygas ir norimas funkcijas padėti atrasti tinkamą įrangos komplektą.$$,
      83
    ),
    (
      'STEBKAM',
      'https://stebkamprojektai.lt',
      'Saugumo ir išmaniųjų namų sprendimai',
      'info@stebkam.lt',
      '+370 645 42336',
      'Individuali / nenustatyta',
      $$STEBKAM siūlo vaizdo stebėjimo, apsaugos, išmaniųjų namų, praėjimo kontrolės ir kitus techninius sprendimus. AI konsultantas galėtų kvalifikuoti lankytojo poreikį pagal objektą ir perduoti komandai jau struktūruotą užklausą.$$,
      81
    ),
    (
      'Durų linija',
      'https://www.durulinija.lt',
      'Durys ir interjeras',
      'info@durulinija.lt',
      '+370 682 15756',
      'WooCommerce',
      $$Durų linija specializuojasi nematomose duryse ir paslėptų staktų sprendimuose, kurių pasirinkimui svarbūs angos matmenys, sienos konstrukcija ir apdaila. AI konsultantas galėtų surinkti šiuos parametrus ir padėti lankytojui pasiruošti tikslesnei konsultacijai.$$,
      93
    ),
    (
      'Vonios įranga',
      'https://voniosiranga.lt',
      'Vonios ir santechnikos įranga',
      'info@voniosiranga.lt',
      '+370 617 70223',
      'WooCommerce',
      $$Voniosiranga.lt kataloge lankytojai komplektuoja dušo kabinas, maišytuvus, praustuvus ir kitą vonios įrangą. AI konsultantas galėtų padėti suderinti matmenis, montavimo tipą, stilių ir biudžetą bei pasiūlyti tarpusavyje tinkamas prekes.$$,
      95
    ),
    (
      'Vonios Namai',
      'https://voniosnamai.lt',
      'Vonios ir santechnikos įranga',
      'info@voniosnamai.lt',
      '+370 658 00499',
      'PrestaShop',
      $$Vonios Namai siūlo platų vonios įrangos katalogą, kur pirkėjams svarbūs matmenys, jungtys ir tarpusavio suderinamumas. AI konsultantas galėtų padėti susikomplektuoti vonios sprendimą ir atsakyti apie pristatymą bei atsiėmimą.$$,
      85
    ),
    (
      'Inuti',
      'https://inuti.lt',
      'Vonios ir santechnikos įranga',
      'info@inuti.lt',
      '+370 678 56297',
      'WooCommerce',
      $$Inuti pristato išskirtinio dizaino vonios baldus, vonias, dušo kabinas, maišytuvus ir praustuvus. AI konsultantas galėtų padėti lankytojui suderinti gaminius pagal erdvę, stilių, matmenis bei montavimo sprendimą.$$,
      94
    ),
    (
      'Lelius',
      'https://www.lelius.lt',
      'Prekės vaikams',
      'info@lelius.lt',
      '+370 604 05317',
      'PrestaShop',
      $$Lelius siūlo kruopščiai atrinktas prekes vaikams ir kūdikiams, kurių pasirinkimas priklauso nuo amžiaus, raidos etapo bei naudojimo situacijos. AI konsultantas galėtų padėti tėvams greičiau atrasti tinkamą ir saugų variantą.$$,
      84
    ),
    (
      'Durų rankenos',
      'https://duru-rankenos.lt',
      'Durys ir interjeras',
      'info@duru-rankenos.lt',
      null,
      'WooCommerce',
      $$Durų-rankenos.lt specializuojasi itališkose durų ir langų rankenose, kur svarbu suderinti dizainą, apdailą bei techninį montavimą. AI konsultantas galėtų padėti lankytojui atrasti tinkamą modelį pagal durų tipą ir interjero stilių.$$,
      92
    ),
    (
      'Vonia.eu',
      'http://www.vonia.eu',
      'Vonios ir santechnikos įranga',
      'info@bygma.lt',
      '+370 601 61666',
      'Verskis',
      $$Vonia.eu elektroninėje parduotuvėje pateikiama santechnika ir vonios įranga, kurią dažnai reikia komplektuoti pagal tikslius matmenis bei jungtis. AI konsultantas galėtų iš gyvo katalogo pasiūlyti tarpusavyje suderinamus gaminius.$$,
      94
    ),
    (
      'Lauko durys',
      'https://www.laukodurys.lt',
      'Durys ir interjeras',
      'info@laukodurys.lt',
      '+370 672 13143',
      'OpenCart',
      $$Laukodurys.lt siūlo namo duris ir salonų konsultacijas visoje Lietuvoje, o pasirinkimui svarbūs matmenys, šiluminės savybės, saugumas ir dizainas. AI konsultantas galėtų preliminariai atrinkti variantus ir nukreipti į tinkamiausią sprendimą.$$,
      84
    ),
    (
      'Čiužiniai.eu',
      'https://ciuziniai.eu',
      'Miego prekės',
      'info@ciuziniai.eu',
      '+370 653 39999',
      'WooCommerce',
      $$Čiužiniai.eu lankytojams reikia pasirinkti čiužinį pagal miego pozą, kietumą, medžiagas, dydį ir individualius komforto poreikius. AI konsultantas galėtų palyginti modelius bei paaiškinti, kuo jų konstrukcijos skiriasi.$$,
      95
    ),
    (
      'Kepsninės.lt',
      'https://www.kepsnines.lt',
      'Kepsninės ir lauko virtuvė',
      'info@kepsnines.lt',
      '+370 612 36344',
      'WooCommerce',
      $$Kepsninės.lt siūlo Big Green Egg kepsnines, priedus ir lauko virtuvės sprendimus, kuriuos pirkėjai renkasi pagal žmonių skaičių bei gaminimo įpročius. AI konsultantas galėtų padėti sukomplektuoti tinkamą kepsninę su reikalingais priedais.$$,
      94
    ),
    (
      'Sodo ELA',
      'https://www.sodoela.lt',
      'Sodas ir interjeras',
      'info@sodoela.lt',
      '+370 616 07902',
      'OpenCart',
      $$Sodo ELA internetinėje parduotuvėje derinami augalai, natūralios interjero detalės ir atrinktos dekoracijos. AI konsultantas galėtų padėti lankytojui pagal erdvę, apšvietimą ir norimą stilių atrasti derančius pasirinkimus.$$,
      83
    ),
    (
      'Žvejo magija',
      'https://zvejomagija.lt',
      'Žvejyba ir laisvalaikis',
      'info@zvejomagija.lt',
      '+370 633 30644',
      'WooCommerce',
      $$Žvejo magija siūlo įvairias žūklės prekes ir pabrėžia pagalbą renkantis reikalingą inventorių. AI konsultantas galėtų pagal žvejybos būdą, sezoną ir tikslinę žuvį pasiūlyti tinkamą įrangos komplektą.$$,
      94
    ),
    (
      'Nesė fauna',
      'https://www.nesefauna.lt',
      'Gyvūnų prekės',
      'info@nesefauna.lt',
      '+370 612 15000',
      'Verskis',
      $$Nesė fauna internetinėje parduotuvėje siūlo gyvūnų prekes, kurias pirkėjai renkasi pagal augintinio rūšį, amžių, dydį ir sveikatos poreikius. AI konsultantas galėtų iš katalogo pasiūlyti tinkamus produktus ir atsakyti į kasdienės priežiūros klausimus.$$,
      95
    ),
    (
      'Super augintinis',
      'https://www.superaugintinis.lt',
      'Gyvūnų prekės',
      'info@superaugintinis.lt',
      '+370 651 89543',
      'PrestaShop',
      $$Super augintinis kataloge yra prekės šunims, katėms ir profesionalams, o svetainėje pateikiama daug praktinio turinio apie gyvūnų priežiūrą. AI konsultantas galėtų sujungti šias žinias su katalogu ir pasiūlyti produktus pagal konkretų augintinį.$$,
      86
    ),
    (
      'Belinis',
      'https://belinis.lt',
      'Gyvūnų prekės',
      'info@belinis.lt',
      '+370 676 96417',
      'PrestaShop',
      $$Belinis yra specializuota gyvūnų prekių parduotuvė, kur pirkėjai renkasi maistą ir priežiūros priemones pagal augintinio rūšį bei poreikius. AI konsultantas galėtų padėti rasti tinkamus produktus ir palyginti jų sudėtį bei paskirtį.$$,
      85
    ),
    (
      'Kotas',
      'https://kotas.lt',
      'Žvejyba ir laisvalaikis',
      'info@kotas.lt',
      '+370 617 17629',
      'Shopify',
      $$Kotas turi platų žūklės įrankių, masalų, aprangos ir turizmo prekių katalogą. AI konsultantas galėtų pagal žvejybos vietą, būdą, sezoną ir tikslinę žuvį atrasti tinkamiausią inventorių iš gyvo Shopify katalogo.$$,
      95
    ),
    (
      'Autoilas',
      'https://autoilas.lt',
      'Automobilių prekės',
      'info@autoilas.lt',
      '+370 673 16390',
      'OpenCart',
      $$Autoilas.lt kataloge yra automobilių prekės ir aksesuarai, kurių tinkamumas dažnai priklauso nuo markės, modelio, metų bei konkretaus naudojimo. AI konsultantas galėtų padėti lankytojui greičiau atrasti suderinamą prekę.$$,
      83
    ),
    (
      'Žūklys',
      'https://zuklys.lt',
      'Žvejyba ir laisvalaikis',
      'info@zuklys.lt',
      '+370 601 50655',
      'OpenCart',
      $$Žūklys siūlo platų žvejybos ir poilsio inventoriaus pasirinkimą nuo meškerių bei masalų iki aprangos ir turizmo prekių. AI konsultantas galėtų padėti sukomplektuoti įrangą pagal žvejybos būdą, sezoną ir biudžetą.$$,
      84
    )
)
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
select
  lead.name,
  null,
  lead.website,
  null,
  lead.vertical,
  null,
  lead.email,
  lead.phone,
  'Tikslinis mažas arba vidutinis Lietuvos verslas; tikslus darbuotojų skaičius viešai nepatvirtintas',
  lead.platform,
  lead.hook,
  'Specializuotas katalogas ir daug pasirinkimo klausimų sukuria aiškų AI konsultanto panaudojimo scenarijų. 2026-07-29 patikroje viešame svetainės HTML pokalbių asistentas neaptiktas.',
  'Pirmojo šaltinio patikra 2026-07-29: ' || lead.website,
  lead.score,
  case
    when lead.platform in ('WooCommerce', 'Shopify', 'Verskis', 'Magento')
      then 'Palaikoma arba prioritetinė e. komercijos platforma; klausimų gausus specializuotas katalogas; viešame HTML pokalbių asistentas neaptiktas'
    else 'Klausimų gausus specializuotas katalogas; viešas verslo kontaktas patvirtintas; platformos integraciją reikėtų patikrinti'
  end,
  lead.name || ': idėja svetainei',
  lead.hook
    || E'\n\n'
    || 'Esu Eimantas, kuriu „Loqara“ – lietuviškai bendraujantį AI konsultantą e. parduotuvėms. Jis remiasi jūsų svetainės turiniu ir prekių katalogu, todėl bet kuriuo paros metu gali atsakyti apie konkrečias prekes, kainas, likučius ir pristatymą. Jei prireikia žmogaus pagalbos, pokalbį perduoda jūsų komandai.'
    || E'\n\n'
    || 'Tai nėra įprastas DUK langas: „Loqara“ supranta patikslinimus ir išlaiko pokalbio kontekstą, todėl lankytojas gali klausti natūraliai – panašiai kaip bendraudamas su konsultantu.'
    || E'\n\n'
    || 'Galiu be jokių įsipareigojimų paruošti trumpą demo pagal jūsų svetainę, kad patys įvertintumėte, ar tai būtų naudinga.'
    || E'\n\n'
    || 'Ar norėtumėte jį pamatyti?'
    || E'\n\n'
    || 'Jei tokie pasiūlymai šiuo metu neaktualūs, tiesiog atsakykite „ne“ – daugiau nerašysiu.',
  false,
  'ready'
from researched_leads as lead
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
    or (
      existing.email is not null
      and lower(existing.email) = lower(lead.email)
    )
)
on conflict (website) do nothing;

do $$
declare
  inserted_count integer;
begin
  select count(*)
  into inserted_count
  from public.sales_leads
  where source like 'Pirmojo šaltinio patikra 2026-07-29:%';

  if inserted_count <> 59 then
    raise exception
      'Expected exactly 59 verified 2026-07-29 leads, found %',
      inserted_count;
  end if;
end
$$;
