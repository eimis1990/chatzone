-- Qualified from the user's Latvia/Estonia Sales Navigator search.
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
    ('SIA Coffee Guru Latvia', 'https://www.coffeeguru.lv', 'Riga', 'Retail and e-commerce', 'Andris Leitis', 'CEO / Board Member / Co-owner', null, 'A customer-facing catalogue creates repeat questions about product choice, availability, delivery, returns and the best next step.', 90),
    ('Exomedica', 'https://exomedica.eu', 'Riga', 'Healthcare', 'Vadim Vakaryuk', 'Founder', null, 'Patients need clear help choosing services, understanding preparation and reaching booking without the assistant giving medical diagnoses.', 90),
    ('Rock Distribution', 'http://www.rock-distribution.com', 'Sigulda', 'Retail and e-commerce', 'Edijs Rudzis', 'CEO', null, 'A customer-facing catalogue creates repeat questions about product choice, availability, delivery, returns and the best next step.', 90),
    ('GP Nord', 'http://www.gpnord.com', 'Riga', 'Retail and e-commerce', 'Peteris Zeltins', 'Owner', null, 'A customer-facing catalogue creates repeat questions about product choice, availability, delivery, returns and the best next step.', 90),
    ('Kärcher Latvija', 'https://www.kaercher.com/lv', null, 'Retail and e-commerce', 'Arnis Arbeiters', 'Managing Director', null, 'A customer-facing catalogue creates repeat questions about product choice, availability, delivery, returns and the best next step.', 90),
    ('TRIBE Riga City Centre', 'https://all.accor.com/hotel/B903/index.en.shtml', 'Riga', 'Hospitality', 'Janis Valodze', 'General Manager', null, 'Guests repeatedly ask about rooms, availability, amenities, policies and booking; an AI assistant could answer and qualify enquiries around the clock.', 84),
    ('Amelii', 'https://amelii.lv', 'Riga', 'Retail and e-commerce', 'Ieva Ruka', 'Owner', 'https://www.linkedin.com/sales/lead/ACwAAEIMM-MBjvGWCp65qvcK55y7C56IAQ6RzBg,NAME_SEARCH,sQ3r', 'A customer-facing catalogue creates repeat questions about product choice, availability, delivery, returns and the best next step.', 90),
    ('Mēness aptieka', 'https://www.menessaptieka.lv', null, 'Retail and e-commerce', 'Mārtiņš Švāns', 'Head of Ecommerce', 'https://www.linkedin.com/sales/lead/ACwAAAK0I8gBSQaJwHSk7pncfGYUwBdpB-6f01Q,NAME_SEARCH,cfio', 'A customer-facing catalogue creates repeat questions about product choice, availability, delivery, returns and the best next step.', 90),
    ('Intrex Serviss', 'https://intrex.lv', 'Riga', 'Retail and e-commerce', 'Oskars Pakalnins', 'CEO', null, 'A customer-facing catalogue creates repeat questions about product choice, availability, delivery, returns and the best next step.', 90),
    ('Car.lv', 'https://car.lv', 'Riga', 'Retail and e-commerce', 'Aleksandrs Parškovs', 'Managing Director', null, 'A customer-facing catalogue creates repeat questions about product choice, availability, delivery, returns and the best next step.', 90),
    ('House of Sipula', 'https://houseofsipula.com', 'Riga', 'Retail and e-commerce', 'Tatenda Sipula', 'Founder / Creative Director', null, 'A customer-facing catalogue creates repeat questions about product choice, availability, delivery, returns and the best next step.', 90),
    ('Rūpes.lv', 'https://rupes.lv', null, 'Retail and e-commerce', 'Elina Kravcenko', 'Founder', null, 'A customer-facing catalogue creates repeat questions about product choice, availability, delivery, returns and the best next step.', 90),
    ('KOOL Latvija', 'https://kool.lv', 'Riga', 'Retail and e-commerce', 'Jana Logina', 'CEO / Managing Director', null, 'A customer-facing catalogue creates repeat questions about product choice, availability, delivery, returns and the best next step.', 90),
    ('MINTprint', 'https://mintprint.lv', null, 'Retail and e-commerce', 'Martins Lismanis', 'Managing Director', null, 'A customer-facing catalogue creates repeat questions about product choice, availability, delivery, returns and the best next step.', 90),
    ('Lotos Pharma', 'https://lotos-pharma.com', 'Riga', 'Retail and e-commerce', 'Pēteris Miezītis', 'Head of E-Commerce / Digital Marketing', null, 'A customer-facing catalogue creates repeat questions about product choice, availability, delivery, returns and the best next step.', 84),
    ('Aesthetica', 'https://aesthetica.lv', 'Riga', 'Retail and e-commerce', 'Kristine Bulkovska', 'Managing Director', null, 'A customer-facing catalogue creates repeat questions about product choice, availability, delivery, returns and the best next step.', 90),
    ('Woof.lv', 'https://woof.lv', 'Riga', 'Retail and e-commerce', 'Maria Viktoria Semjonova', 'Co-Owner', null, 'A customer-facing catalogue creates repeat questions about product choice, availability, delivery, returns and the best next step.', 90),
    ('FURE Biostone', 'https://www.biostone.lv', 'Riga', 'Furniture and interiors', 'Didzis Pilans', 'Co-Founder', null, 'Buyers often need help with dimensions, materials, configuration, delivery and matching products to a room or project.', 90),
    ('AJ Produkti', 'https://www.ajprodukti.lv', 'Riga', 'Furniture and interiors', 'Zane Bekere', 'Managing Director / Board Member', null, 'Buyers often need help with dimensions, materials, configuration, delivery and matching products to a room or project.', 90),
    ('LABRAINS', 'https://labrains.eu', 'Riga', 'Beauty and personal care', 'Līga Brūniņa', 'CEO', 'https://www.linkedin.com/sales/lead/ACwAAAus7JwBq1cUHAr1RRUd366AkI9rUsQt_yQ,NAME_SEARCH,wPje', 'A broad beauty or personal-care range creates repeat questions about product choice, suitability, use and delivery.', 90),
    ('HAIRRIGA', 'https://hairriga.lv', 'Riga', 'Beauty and personal care', 'Ilva Banka-Okorie', 'CEO', null, 'A broad beauty or personal-care range creates repeat questions about product choice, suitability, use and delivery.', 90),
    ('PURUS.PET', 'https://www.puruspet.com', 'Jelgava', 'Retail and e-commerce', 'Gatis Kokins', 'CEO', null, 'A customer-facing catalogue creates repeat questions about product choice, availability, delivery, returns and the best next step.', 90),
    ('Outfish', 'https://outfish.lv', 'Riga', 'Retail and e-commerce', 'Igors Tomilovs', 'Founder / Managing Director', null, 'A customer-facing catalogue creates repeat questions about product choice, availability, delivery, returns and the best next step.', 90),
    ('stacija.lv', 'https://stacija.lv', null, 'Retail and e-commerce', 'Anna Grase', 'Project Manager', null, 'A customer-facing catalogue creates repeat questions about product choice, availability, delivery, returns and the best next step.', 84),
    ('Adoro', 'https://adoro.lv', null, 'Retail and e-commerce', 'Uldis Prieditis', 'CEO / Co-Founder', null, 'A customer-facing catalogue creates repeat questions about product choice, availability, delivery, returns and the best next step.', 90),
    ('Hestio', 'https://hestio.lv', null, 'Retail and e-commerce', 'Toms Bergs', 'CEO', null, 'A customer-facing catalogue creates repeat questions about product choice, availability, delivery, returns and the best next step.', 90),
    ('Kārļamuiža Country Hotel', 'https://www.karlamuiza.lv', null, 'Hospitality', 'Janis Stepins', 'Owner / Business Development', null, 'Guests repeatedly ask about rooms, availability, amenities, policies and booking; an AI assistant could answer and qualify enquiries around the clock.', 90),
    ('BARBOLETA', 'https://barboleta.lv', null, 'Retail and e-commerce', 'Baiba Blomniece Jurāne', 'CEO', null, 'A customer-facing catalogue creates repeat questions about product choice, availability, delivery, returns and the best next step.', 90),
    ('Ring Baltic', 'https://ringbaltic.lv', 'Riga', 'Retail and e-commerce', 'Sigita Ūdre', 'CEO', null, 'A customer-facing catalogue creates repeat questions about product choice, availability, delivery, returns and the best next step.', 90),
    ('ARKOLAT', 'https://arkolat.lv', null, 'Retail and e-commerce', 'Maija Sizasa', 'Managing Director', 'https://www.linkedin.com/sales/lead/ACwAAARShwABEtRMiwGXHk-XTMJGjOzN3D5BnxE,NAME_SEARCH,jq6i', 'A customer-facing catalogue creates repeat questions about product choice, availability, delivery, returns and the best next step.', 90),
    ('Carnitec', 'https://carnitec.com', 'Riga', 'Retail and e-commerce', 'Max Karlin', 'CEO', 'https://www.linkedin.com/sales/lead/ACwAAACyqFQBJTm-rK1_e5ZnA0hgb3FAoeLg06Q,NAME_SEARCH,NMvc', 'A customer-facing catalogue creates repeat questions about product choice, availability, delivery, returns and the best next step.', 90),
    ('MADARA Cosmetics', 'https://www.madaracosmetics.com', null, 'Beauty and personal care', 'Uldis Iltners', 'Managing Director', null, 'A broad beauty or personal-care range creates repeat questions about product choice, suitability, use and delivery.', 90),
    ('Remedine', 'https://remedine.lv', null, 'Retail and e-commerce', 'Uldis Eglitis', 'Founder / CEO', null, 'A customer-facing catalogue creates repeat questions about product choice, availability, delivery, returns and the best next step.', 90),
    ('Sköld Latvia', 'https://skold.lv', null, 'Retail and e-commerce', 'Janis Birzaks', 'Owner', null, 'A customer-facing catalogue creates repeat questions about product choice, availability, delivery, returns and the best next step.', 90),
    ('nordi', 'https://nordi.lv', null, 'Retail and e-commerce', 'Miks Pētersons', 'Founder / Managing Director', null, 'A customer-facing catalogue creates repeat questions about product choice, availability, delivery, returns and the best next step.', 90),
    ('Dinsbergas Clinic', 'https://dinsbergasklinika.lv', null, 'Healthcare', 'Inta Dinsberga', 'Co-Founder / Owner', null, 'Patients need clear help choosing services, understanding preparation and reaching booking without the assistant giving medical diagnoses.', 90),
    ('Hotel Amrita', 'https://www.amrita.lv', 'Liepāja', 'Hospitality', 'Daiga Jansone', 'General Manager', null, 'Guests repeatedly ask about rooms, availability, amenities, policies and booking; an AI assistant could answer and qualify enquiries around the clock.', 84),
    ('Birne', 'https://birne.lv', null, 'Retail and e-commerce', 'Gints Balodis', 'Co-Founder / Sales Project Manager', 'https://www.linkedin.com/sales/lead/ACwAAAqHswYB6gdP0XvGmcPzYnfcIzResHPgWYQ,NAME_SEARCH,aXB6', 'A customer-facing catalogue creates repeat questions about product choice, availability, delivery, returns and the best next step.', 90),
    ('Gemoss', 'https://gemoss.lv', 'Riga', 'Retail and e-commerce', 'Ieva Treija', 'CEO', 'https://www.linkedin.com/sales/lead/ACwAAF5VL3YB1vS_CoiJSLchN-FtFo85LP9mng0,NAME_SEARCH,Dfda', 'A customer-facing catalogue creates repeat questions about product choice, availability, delivery, returns and the best next step.', 90),
    ('Meimelin', 'https://meimelin.lv', 'Riga', 'Retail and e-commerce', 'Kristine Rinca', 'Owner', null, 'A customer-facing catalogue creates repeat questions about product choice, availability, delivery, returns and the best next step.', 90),
    ('CAMLICA Group', 'https://camlica.com', 'Riga', 'Retail and e-commerce', 'Anna Marija Čamlidža', 'Co-Founder', null, 'A customer-facing catalogue creates repeat questions about product choice, availability, delivery, returns and the best next step.', 90),
    ('BRIVA', 'https://briva.lv', 'Riga', 'Retail and e-commerce', 'Janis Broks', 'Board Chair / Co-owner', null, 'A customer-facing catalogue creates repeat questions about product choice, availability, delivery, returns and the best next step.', 90),
    ('Kinema Latvia', 'https://kinema.lv', 'Riga', 'Retail and e-commerce', 'Arnis Pule', 'CEO', null, 'A customer-facing catalogue creates repeat questions about product choice, availability, delivery, returns and the best next step.', 90),
    ('Vilbers', 'https://vilbers.lv', null, 'Retail and e-commerce', 'Zane Berzina', 'Owner', null, 'A customer-facing catalogue creates repeat questions about product choice, availability, delivery, returns and the best next step.', 90),
    ('Silen', 'https://silen.com', null, 'Retail and e-commerce', 'Endrus Arge', 'CEO / Founder', 'https://www.linkedin.com/sales/lead/ACwAAAITZvoBYticpMZF7v7vQ3yw0ZJ3oNsWC8Y,NAME_SEARCH,p8SB', 'A customer-facing catalogue creates repeat questions about product choice, availability, delivery, returns and the best next step.', 90),
    ('NoCry Safety', 'https://nocry.com', null, 'Retail and e-commerce', 'Katre Liiberg', 'CEO', null, 'A customer-facing catalogue creates repeat questions about product choice, availability, delivery, returns and the best next step.', 90),
    ('Suun', 'https://suun.ee', 'Tallinn', 'Retail and e-commerce', 'Anna Strubel', 'CEO / Co-Founder', null, 'A customer-facing catalogue creates repeat questions about product choice, availability, delivery, returns and the best next step.', 90),
    ('Nanordica Medical', 'https://nanordica.com', 'Tallinn', 'Healthcare', 'Olesja Bondarenko', 'CEO', null, 'Patients need clear help choosing services, understanding preparation and reaching booking without the assistant giving medical diagnoses.', 90),
    ('Apollo Kauplused', 'https://www.apollo.ee', 'Tallinn', 'Retail and e-commerce', 'Kristi Juhandi', 'CEO', null, 'A customer-facing catalogue creates repeat questions about product choice, availability, delivery, returns and the best next step.', 90),
    ('ProVida Kliinik', 'https://provida.ee', 'Tartu', 'Healthcare', 'Kadri Adrat', 'CEO', null, 'Patients need clear help choosing services, understanding preparation and reaching booking without the assistant giving medical diagnoses.', 90),
    ('Macta Beauty', 'https://mactabeauty.com', 'Tallinn', 'Beauty and personal care', 'Andreas Julius Aduson', 'CEO', null, 'A broad beauty or personal-care range creates repeat questions about product choice, suitability, use and delivery.', 90),
    ('Old Hapsal Hotel', 'https://oldhapsalhotel.ee', 'Haapsalu', 'Hospitality', 'Daire Kaup', 'Owner / Hostess', null, 'Guests repeatedly ask about rooms, availability, amenities, policies and booking; an AI assistant could answer and qualify enquiries around the clock.', 90),
    ('Printall', 'https://printall.ee', null, 'Retail and e-commerce', 'Alo Ivask', 'CEO', null, 'A customer-facing catalogue creates repeat questions about product choice, availability, delivery, returns and the best next step.', 90),
    ('Anvol', 'https://anvol.eu', 'Tallinn', 'Retail and e-commerce', 'Margarita Prometnaja', 'Head of Ecommerce', null, 'A customer-facing catalogue creates repeat questions about product choice, availability, delivery, returns and the best next step.', 90),
    ('Sellme.ee', 'https://sellme.ee', 'Tallinn', 'Retail and e-commerce', 'Illia Haidar', 'Founder / CEO', 'https://www.linkedin.com/sales/lead/ACwAACr_gS4BANEMyaeLmzVEARJztTmTq7xXSOU,NAME_SEARCH,LeZ-', 'A customer-facing catalogue creates repeat questions about product choice, availability, delivery, returns and the best next step.', 90),
    ('Vunder', 'https://vunder.ee', null, 'Retail and e-commerce', 'Jörgen Vaikjärv', 'CEO', 'https://www.linkedin.com/sales/lead/ACwAAC3x7MoB9-fYeLlVmZwJgHfFk7cxFF42YoU,NAME_SEARCH,-Zyt', 'A customer-facing catalogue creates repeat questions about product choice, availability, delivery, returns and the best next step.', 90),
    ('Chemi-Pharm', 'https://chemi-pharm.com', 'Tallinn', 'Retail and e-commerce', 'Joonas Lahe', 'Managing Director', 'https://www.linkedin.com/sales/lead/ACwAABSCu7sB3sAI0CfXrx-uOx9VfgFmlRct_d0,NAME_SEARCH,ApY2', 'A customer-facing catalogue creates repeat questions about product choice, availability, delivery, returns and the best next step.', 90),
    ('Dharma Resort', 'https://dharmaresort.ee', 'Saaremaa', 'Hospitality', 'Sven Kotkas', 'Co-Founder', null, 'Guests repeatedly ask about rooms, availability, amenities, policies and booking; an AI assistant could answer and qualify enquiries around the clock.', 90),
    ('Pädaste Manor', 'https://www.padaste.ee', null, 'Hospitality', 'Martin Breuer', 'Owner / Hotelier', null, 'Guests repeatedly ask about rooms, availability, amenities, policies and booking; an AI assistant could answer and qualify enquiries around the clock.', 90),
    ('Rahva Raamat', 'https://rahvaraamat.ee', null, 'Retail and e-commerce', 'Rain Siemer', 'CEO', null, 'A customer-facing catalogue creates repeat questions about product choice, availability, delivery, returns and the best next step.', 90),
    ('Tasku Keskus', 'https://tasku.ee', 'Tartu', 'Retail and e-commerce', 'Diana Timberg', 'CEO', null, 'A customer-facing catalogue creates repeat questions about product choice, availability, delivery, returns and the best next step.', 90),
    ('Kaubamaja', 'https://www.kaubamaja.ee', 'Tallinn', 'Retail and e-commerce', 'Lenno Vaitovski', 'Head of Ecommerce', null, 'A customer-facing catalogue creates repeat questions about product choice, availability, delivery, returns and the best next step.', 90),
    ('T1 Tallinn', 'https://t1tallinn.com', 'Tallinn', 'Retail and e-commerce', 'Tarmo Hõbe', 'CEO / Board Member', null, 'A customer-facing catalogue creates repeat questions about product choice, availability, delivery, returns and the best next step.', 90),
    ('LaBocca Restaurants', 'https://labocca.ee', 'Tallinn', 'Hospitality', 'Gert Kerde', 'Co-Founder', null, 'Guests repeatedly ask about rooms, availability, amenities, policies and booking; an AI assistant could answer and qualify enquiries around the clock.', 90),
    ('ProScreen', 'https://proscreen.ee', null, 'Retail and e-commerce', 'Raido Reilson', 'Founder / CEO', 'https://www.linkedin.com/sales/lead/ACwAAAjUyyMBa5kpws7cORyDuBOOPHae7Q5SVz8,NAME_SEARCH,sDZN', 'A customer-facing catalogue creates repeat questions about product choice, availability, delivery, returns and the best next step.', 90),
    ('GRENARDI Group', 'https://grenardi.ee', null, 'Retail and e-commerce', 'Natalja Reinoja', 'CEO', null, 'A customer-facing catalogue creates repeat questions about product choice, availability, delivery, returns and the best next step.', 90),
    ('Renalis', 'https://renalis.ee', null, 'Healthcare', 'Tarmo Laanetu', 'Founder', null, 'Patients need clear help choosing services, understanding preparation and reaching booking without the assistant giving medical diagnoses.', 90),
    ('CareMate', 'https://caremate.ee', null, 'Retail and e-commerce', 'Marion Teder', 'Founder / Board Member', null, 'A customer-facing catalogue creates repeat questions about product choice, availability, delivery, returns and the best next step.', 90),
    ('Tervis Spa Group', 'https://www.terviseparadiis.ee', 'Pärnu', 'Hospitality', 'Heigo Vare', 'CEO / Board Member', null, 'Guests repeatedly ask about rooms, availability, amenities, policies and booking; an AI assistant could answer and qualify enquiries around the clock.', 90),
    ('SYNLAB Eesti', 'https://synlab.ee', 'Tallinn', 'Healthcare', 'Kärt Sildvee', 'Head of Customer Service', null, 'Patients need clear help choosing services, understanding preparation and reaching booking without the assistant giving medical diagnoses.', 84),
    ('Maxilla Hambakliinik', 'https://www.maxilla.ee', 'Tallinn', 'Healthcare', 'Jette-Kristina Abel', 'Head of Clinics', null, 'Patients need clear help choosing services, understanding preparation and reaching booking without the assistant giving medical diagnoses.', 84),
    ('OCCO', 'https://occo.ee', null, 'Furniture and interiors', 'Ander Soorumaa', 'CEO', null, 'Buyers often need help with dimensions, materials, configuration, delivery and matching products to a room or project.', 90),
    ('The Health Clinic', 'https://thehealthclinic.eu', null, 'Healthcare', 'Mihkel Adamson', 'Co-Founder / CEO', null, 'Patients need clear help choosing services, understanding preparation and reaching booking without the assistant giving medical diagnoses.', 90),
    ('EcoPetBox', 'https://ecopetbox.com', null, 'Retail and e-commerce', 'Priit Saarniit', 'CEO / Founder', null, 'A customer-facing catalogue creates repeat questions about product choice, availability, delivery, returns and the best next step.', 90),
    ('Seisuk Furniture', 'https://seisuk.ee', 'Tallinn', 'Furniture and interiors', 'Laura Laagus', 'CEO', null, 'Buyers often need help with dimensions, materials, configuration, delivery and matching products to a room or project.', 90),
    ('Unique Hotels Group', 'https://uhotelsgroup.com', null, 'Hospitality', 'Paul Taylor', 'Owner / Founding Partner', null, 'Guests repeatedly ask about rooms, availability, amenities, policies and booking; an AI assistant could answer and qualify enquiries around the clock.', 90),
    ('Eurobio Lab', 'https://eurobiolab.com', 'Tallinn', 'Beauty and personal care', 'Svetlana Kelman', 'CEO', null, 'A broad beauty or personal-care range creates repeat questions about product choice, suitability, use and delivery.', 90),
    ('Tradehouse', 'https://tradehouse.ee', 'Tallinn', 'Beauty and personal care', 'Laura Kuldkepp', 'CEO / Board Member', null, 'A broad beauty or personal-care range creates repeat questions about product choice, suitability, use and delivery.', 90),
    ('BEIGE | BROWN', 'https://beigebrown.com', 'Tallinn', 'Retail and e-commerce', 'Tamara Karpenko', 'CEO', null, 'A customer-facing catalogue creates repeat questions about product choice, availability, delivery, returns and the best next step.', 90),
    ('DecNord', 'https://decnord.ee', 'Tallinn', 'Furniture and interiors', 'Tõnis Erissaar', 'CEO', null, 'Buyers often need help with dimensions, materials, configuration, delivery and matching products to a room or project.', 90),
    ('Öun Drinks', 'https://oundrinks.com', 'Tallinn', 'Retail and e-commerce', 'Kristiina Kullo', 'Board Member / Partner', 'https://www.linkedin.com/sales/lead/ACwAAAGh5d4BSskAa8TH-q6wiahaU12sy3a9REI,NAME_SEARCH,YyR8', 'A customer-facing catalogue creates repeat questions about product choice, availability, delivery, returns and the best next step.', 84),
    ('Amanjeda', 'https://amanjeda.com', null, 'Retail and e-commerce', 'Katrin Kuldma', 'Founder / Creative Director', null, 'A customer-facing catalogue creates repeat questions about product choice, availability, delivery, returns and the best next step.', 90),
    ('Uuskasutuskeskus', 'https://uuskasutus.ee', 'Tallinn', 'Retail and e-commerce', 'Katriin Jüriska', 'CEO', null, 'A customer-facing catalogue creates repeat questions about product choice, availability, delivery, returns and the best next step.', 90),
    ('Liv Outdoor', 'https://livoutdoor.ee', 'Tallinn', 'Retail and e-commerce', 'Argo Ralja', 'CEO / Founder', null, 'A customer-facing catalogue creates repeat questions about product choice, availability, delivery, returns and the best next step.', 90),
    ('Liina Stein', 'https://liinastein.com', null, 'Retail and e-commerce', 'Sven Roosna', 'CEO', null, 'A customer-facing catalogue creates repeat questions about product choice, availability, delivery, returns and the best next step.', 90),
    ('vipMedicum', 'https://vipmedicum.ee', null, 'Healthcare', 'Roman Henson', 'Owner', null, 'Patients need clear help choosing services, understanding preparation and reaching booking without the assistant giving medical diagnoses.', 90),
    ('Tamec Trade', 'https://tamectrade.ee', null, 'Retail and e-commerce', 'Priit Vakkum', 'Managing Director', null, 'A customer-facing catalogue creates repeat questions about product choice, availability, delivery, returns and the best next step.', 90),
    ('Ergonomik', 'https://ergonomik.ee', 'Tallinn', 'Furniture and interiors', 'Taavi Vasserman', 'Founder / Owner / Board Member', 'https://www.linkedin.com/sales/lead/ACwAAAQXXZ0BnLUMCOEzmqTfT7vd38iHOsWwqRA,NAME_SEARCH,hxb-', 'Buyers often need help with dimensions, materials, configuration, delivery and matching products to a room or project.', 90),
    ('Salonshop Baltic', 'https://salonshop.ee', 'Tallinn', 'Beauty and personal care', 'Indrek Lõhmus', 'Co-Founder', null, 'A broad beauty or personal-care range creates repeat questions about product choice, suitability, use and delivery.', 90),
    ('Merianto', 'https://merianto.com', 'Tallinn', 'Retail and e-commerce', 'Raimo Grichin', 'Founder / CEO', null, 'A customer-facing catalogue creates repeat questions about product choice, availability, delivery, returns and the best next step.', 90),
    ('Wasa Resort', 'https://wasahotels.ee', 'Pärnu', 'Hospitality', 'Indrek Ilves', 'CEO', null, 'Guests repeatedly ask about rooms, availability, amenities, policies and booking; an AI assistant could answer and qualify enquiries around the clock.', 90),
    ('Alpaka', 'https://alpaka.ee', null, 'Retail and e-commerce', 'Peeter Pappel', 'CEO', null, 'A customer-facing catalogue creates repeat questions about product choice, availability, delivery, returns and the best next step.', 90),
    ('Pro Beauté Baltic', 'https://probeauty.ee', 'Tallinn', 'Retail and e-commerce', 'Liis Elts', 'CEO', null, 'A customer-facing catalogue creates repeat questions about product choice, availability, delivery, returns and the best next step.', 90),
    ('Sangar', 'https://sangar.ee', null, 'Retail and e-commerce', 'Raul Saks', 'CEO', null, 'A customer-facing catalogue creates repeat questions about product choice, availability, delivery, returns and the best next step.', 90),
    ('Medicum', 'https://www.medicum.ee', null, 'Healthcare', 'Tõnis Allik', 'CEO', null, 'Patients need clear help choosing services, understanding preparation and reaching booking without the assistant giving medical diagnoses.', 90),
    ('Goodpoint Chemicals', 'https://goodpointchemicals.com', null, 'Retail and e-commerce', 'Lauri Kallikorm', 'Owner', null, 'A customer-facing catalogue creates repeat questions about product choice, availability, delivery, returns and the best next step.', 90),
    ('Hoov Haapsalu', 'https://hoov.ee', 'Haapsalu', 'Retail and e-commerce', 'Hardi-Mikk Meitern', 'CEO', null, 'A customer-facing catalogue creates repeat questions about product choice, availability, delivery, returns and the best next step.', 90),
    ('Topauto', 'https://topauto.ee', 'Tallinn', 'Retail and e-commerce', 'Aivar Kagu', 'Managing Director', null, 'A customer-facing catalogue creates repeat questions about product choice, availability, delivery, returns and the best next step.', 90),
    ('The Club Estonia', 'https://theclub.ee', 'Tallinn', 'Retail and e-commerce', 'Mauri Dorbek', 'CEO / Co-Founder', null, 'A customer-facing catalogue creates repeat questions about product choice, availability, delivery, returns and the best next step.', 90),
    ('PsychEval', 'https://psycheval.ee', null, 'Retail and e-commerce', 'Eerik Kesküla', 'CEO', null, 'A customer-facing catalogue creates repeat questions about product choice, availability, delivery, returns and the best next step.', 90)
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
    when website in ('https://www.coffeeguru.lv', 'https://exomedica.eu', 'http://www.rock-distribution.com', 'http://www.gpnord.com', 'https://www.kaercher.com/lv', 'https://all.accor.com/hotel/B903/index.en.shtml', 'https://amelii.lv', 'https://www.menessaptieka.lv', 'https://intrex.lv', 'https://car.lv', 'https://houseofsipula.com', 'https://rupes.lv', 'https://kool.lv', 'https://mintprint.lv', 'https://lotos-pharma.com', 'https://aesthetica.lv', 'https://woof.lv', 'https://www.biostone.lv', 'https://www.ajprodukti.lv', 'https://labrains.eu', 'https://hairriga.lv', 'https://www.puruspet.com', 'https://outfish.lv', 'https://stacija.lv', 'https://adoro.lv', 'https://hestio.lv', 'https://www.karlamuiza.lv', 'https://barboleta.lv', 'https://ringbaltic.lv', 'https://arkolat.lv', 'https://carnitec.com', 'https://www.madaracosmetics.com', 'https://remedine.lv', 'https://skold.lv', 'https://nordi.lv', 'https://dinsbergasklinika.lv', 'https://www.amrita.lv', 'https://birne.lv', 'https://gemoss.lv', 'https://meimelin.lv', 'https://camlica.com', 'https://briva.lv', 'https://kinema.lv', 'https://vilbers.lv') then 'Latvia'
    else 'Estonia'
  end as country
  from qualified_leads
) as lead
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
