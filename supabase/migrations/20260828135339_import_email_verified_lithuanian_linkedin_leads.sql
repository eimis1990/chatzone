-- Qualified from the user's Lithuanian Sales Navigator search.
-- Every row has an active official website, a public business email published
-- by that website, a relevant decision-maker, and no detected website chatbot.
with qualified_leads (
  name,
  website,
  city,
  vertical,
  buyer,
  buyer_title,
  email,
  linkedin_url,
  email_evidence_url,
  hook,
  score
) as (
  values
    ('Pulsetto', 'https://pulsetto.tech/', null, 'Healthcare', 'Vitalijus Majorovas', 'Co-Founder', 'info@pulsetto.tech', 'https://www.linkedin.com/sales/lead/ACwAAAKGsxQBBiVSVgZCtaXWdPBgDflUPSIH85g,NAME_SEARCH,DdiS', 'https://pulsetto.tech/pages/about-us', 'Patients and buyers need clear help choosing services or products, understanding preparation and reaching the right booking or enquiry path without the assistant giving medical diagnoses.', 90),
    ('Kotryna Group', 'https://www.kotrynagroup.com/', null, 'Retail, e-commerce and services', 'Aidas Jasinauskas', 'Head of Ecommerce', 'kotryna@kotrynagroup.com', 'https://www.linkedin.com/sales/lead/ACwAAAyPA8oB83vP5saNdustRKYXLLcgYBMxes8,NAME_SEARCH,3RdU', 'https://www.kotrynagroup.com/about-us/', 'A customer-facing catalogue or service range creates repeat questions about choice, availability, delivery, policies and the best next step.', 90),
    ('greet', 'https://www.heygreet.com/en', 'Vilnius', 'Technology', 'Arnoldas Gritė', 'CEO & Co-Founder', 'info@greet.menu', 'https://www.linkedin.com/sales/lead/ACwAABDphUEB_j8ECrKNBVMmg3b5ZksbMwLI2f4,NAME_SEARCH,u6Ye', 'https://www.heygreet.com/en/contact', 'Prospects need fast answers about fit, setup, pricing and the best next step; an AI assistant could qualify and route enquiries around the clock.', 90),
    ('Self.co', 'https://self.co/', 'Vilnius', 'Healthcare', 'Tautvydas Gylys', 'CEO', 'hello@self.co', 'https://www.linkedin.com/sales/lead/ACwAAAJPXA8Bvubn0LeNeL8skCVH4Iorn9IQKkE,NAME_SEARCH,29T2', 'https://self.co/pages/about-us', 'Patients and buyers need clear help choosing services or products, understanding preparation and reaching the right booking or enquiry path without the assistant giving medical diagnoses.', 90),
    ('Betono Mozaika', 'https://www.betonomozaika.lt/', 'Kaunas', 'Retail, e-commerce and services', 'Gintaras Bagdonas', 'Chief Executive Officer', 'info@betonomozaika.lt', 'https://www.linkedin.com/sales/lead/ACwAACbRTfkB2TXRE9gIffJQFwjo0B_CnaW-BKA,NAME_SEARCH,fJ1d', 'https://www.betonomozaika.lt/kontaktai/', 'A customer-facing catalogue or service range creates repeat questions about choice, availability, delivery, policies and the best next step.', 90),
    ('EURIBIJA', 'https://euribija.lt/', 'Kaunas', 'Retail, e-commerce and services', 'Saulius Gabertas', 'CEO', 'info@euribija.lt', 'https://www.linkedin.com/sales/lead/ACwAACs-_AgBXJRXpeCTenJt3KwJoPmoz4K7LUs,NAME_SEARCH,nz-s', 'https://euribija.lt/apie-mus/', 'A customer-facing catalogue or service range creates repeat questions about choice, availability, delivery, policies and the best next step.', 90),
    ('Medžio bitės', 'https://www.medziobites.lt/', 'Klaipėdos', 'Retail, e-commerce and services', 'Laura S.', 'Head of Ecommerce', 'kaunas@medziobites.lt', 'https://www.linkedin.com/sales/lead/ACwAAAXNg0UB3Os4_FKUPs_-p0B4jOraF2HBsFE,NAME_SEARCH,w3C7', 'https://www.medziobites.lt/kontaktai', 'A customer-facing catalogue or service range creates repeat questions about choice, availability, delivery, policies and the best next step.', 90),
    ('UAB Limedika', 'https://limedika.lt/index.php/lt/', 'Kaunas', 'Healthcare', 'Ruta Bagdonaviciene, EMBA', 'CEO', 'ruta@limedika.lt', 'https://www.linkedin.com/sales/lead/ACwAAAUn94IB7Me7mnY5XxVDYIQ2UxXjqBhHcqs,NAME_SEARCH,dDr9', 'https://limedika.lt/index.php/lt/kontaktai', 'Patients and buyers need clear help choosing services or products, understanding preparation and reaching the right booking or enquiry path without the assistant giving medical diagnoses.', 90),
    ('Elesen Lietuva', 'https://www.elesen.lt/', 'Vilnius', 'Retail, e-commerce and services', 'Paulius Lingys', 'CEO', 'aptarnavimas@elesen.lt', 'https://www.linkedin.com/sales/lead/ACwAAAOv5ScBoC8KV0wDqbKvvTb0KFtrM1a1EWs,NAME_SEARCH,s64m', 'https://www.elesen.lt/apie-mus', 'A customer-facing catalogue or service range creates repeat questions about choice, availability, delivery, policies and the best next step.', 90),
    ('AZETA, UAB (Eurovaistine.lt)', 'https://www.eurovaistine.lt/', null, 'Healthcare', 'Andrius Jurgelevicius', 'Chief Executive Officer', 'info@eurovaistine.lt', 'https://www.linkedin.com/sales/lead/ACwAAA7WcDMBINMKyzDxokbRhakzlyQ8m2HTy0w,NAME_SEARCH,ktFI', 'https://www.eurovaistine.lt/apie-mus', 'Patients and buyers need clear help choosing services or products, understanding preparation and reaching the right booking or enquiry path without the assistant giving medical diagnoses.', 90),
    ('PLACENTA JSC', 'https://placenta.lt/', 'Vilnius', 'Healthcare', 'Ainis Zoruba', 'CEO, founder', 'info@placenta.lt', 'https://www.linkedin.com/sales/lead/ACwAAAKbfp8BtJ9Mn1wMGfqtmharRY-hhV7e_vs,NAME_SEARCH,4ZR0', 'https://www.santaklinika.lt/apie-mus/', 'Patients and buyers need clear help choosing services or products, understanding preparation and reaching the right booking or enquiry path without the assistant giving medical diagnoses.', 90),
    ('OrtoPro - ortopedijos profesionalai', 'https://ortopro.lt/', null, 'Healthcare', 'Ruta Vilemiene', 'CEO', 'info@ortopro.lt', 'https://www.linkedin.com/sales/lead/ACwAACk3dNABK7JBJPqaSukIkmLmBi11_JxyT0E,NAME_SEARCH,h2NX', 'https://ortopro.lt/kontaktai/', 'Patients and buyers need clear help choosing services or products, understanding preparation and reaching the right booking or enquiry path without the assistant giving medical diagnoses.', 90),
    ('Skaitmeninės šypsenos', 'https://skaitmeninessypsenos.lt/', 'Vilnius', 'Healthcare', 'Denas Danyla', 'Owner and CEO', 'info@skaitmeninessypsenos.lt', 'https://www.linkedin.com/sales/lead/ACwAAA0ydtoBiRpaqVuJIhkE91XZZ48TEZDbzUM,NAME_SEARCH,dUOa', 'https://skaitmeninessypsenos.lt/kontaktai/', 'Patients and buyers need clear help choosing services or products, understanding preparation and reaching the right booking or enquiry path without the assistant giving medical diagnoses.', 90),
    ('Projects by Woodline', 'https://www.projectsbywoodline.com/', 'Vilnius', 'Furniture and interiors', 'Daiva Zėčiutė', 'Chief Executive Officer', 'info@projectsbywoodline.com', 'https://www.linkedin.com/sales/lead/ACwAABIYVPkBlBt4NrNoih-1qEC1a9EKa0sDtYg,NAME_SEARCH,UrtN', 'https://www.projectsbywoodline.com/about', 'Buyers often need help with dimensions, materials, configuration, delivery and matching products to a room or project.', 90),
    ('Hansab Lietuva', 'https://www.hansab.lt/', 'Vilniaus', 'Retail, e-commerce and services', 'Darius Žekonis', 'Chief Executive Officer', 'info@hansab.lt', 'https://www.linkedin.com/sales/lead/ACwAAABd2ucBIJhm2MSpQZ1aDB7ogfBkCx2zaow,NAME_SEARCH,SdP1', 'https://www.hansab.lt/apie-mus/', 'A customer-facing catalogue or service range creates repeat questions about choice, availability, delivery, policies and the best next step.', 90),
    ('PANDO moto', 'https://pandomoto.com/', 'Vilnius', 'Retail, e-commerce and services', 'Marius Bieliauskas', 'Founder, CEO', 'info@pandomoto.com', 'https://www.linkedin.com/sales/lead/ACwAAAMH3q4BalL2WCsS0jCpAc88_DoxjWbgcXw,NAME_SEARCH,x58y', 'https://pandomoto.com/pages/about-us', 'A customer-facing catalogue or service range creates repeat questions about choice, availability, delivery, policies and the best next step.', 90),
    ('Lematics', 'https://lematics.com/', null, 'Furniture and interiors', 'Justas M.', 'Managing Director | COO', 'info@lematics.lt', 'https://www.linkedin.com/sales/lead/ACwAAAqqC1oB8GxzcRsnXcrlTkId4LSTda4P8Z8,NAME_SEARCH,17w_', 'https://lematics.com/susisiekite/', 'Buyers often need help with dimensions, materials, configuration, delivery and matching products to a room or project.', 90),
    ('UAB Arte Domestica', 'https://www.artedomestica.eu/', 'Vilnius', 'Furniture and interiors', 'Valentas Šulskis', 'CEO', 'info@artedomestica.eu', 'https://www.linkedin.com/sales/lead/ACwAAA-sCnUBmMoBw1ahfpVHOFexpImMIlTO8PY,NAME_SEARCH,PgUZ', 'https://www.artedomestica.eu/', 'Buyers often need help with dimensions, materials, configuration, delivery and matching products to a room or project.', 90),
    ('MOKI VEŽI', 'https://mokivezi.lt/', 'Kaunas', 'Retail, e-commerce and services', 'Donatas Zalobaitis', 'CEO', 'pagalba@mokivezi.lt', 'https://www.linkedin.com/sales/lead/ACwAABKdldABO_wQKLYFAWYIPuK4NYrXQTDleLM,NAME_SEARCH,IvDM', 'https://mokivezi.lt/kontaktai', 'A customer-facing catalogue or service range creates repeat questions about choice, availability, delivery, policies and the best next step.', 90),
    ('Solid Supply', 'https://solidsupply.eu/', 'Vilnius', 'Retail, e-commerce and services', 'Vaida Likauskė', 'CEO - Chief Executive Officer', 'arunas@solidsupply.eu', 'https://www.linkedin.com/sales/lead/ACwAADDWoLwB46UAgQvrV5VnfjGgBH4AHq_7Vp0,NAME_SEARCH,o24t', 'https://solidsupply.eu/kontaktai.html', 'A customer-facing catalogue or service range creates repeat questions about choice, availability, delivery, policies and the best next step.', 90),
    ('Topo centras', 'https://www.topocentras.lt/', 'Vilniaus', 'Retail, e-commerce and services', 'Gailė Rusteikaitė-Vištejūnė', 'Chief Executive Officer', 'info@topocentras.lt', 'https://www.linkedin.com/sales/lead/ACwAAAJBPtcB6X2uDL2Us0aWzRdn87-DDr8VdpU,NAME_SEARCH,6zhH', 'https://www.topocentras.lt/', 'A customer-facing catalogue or service range creates repeat questions about choice, availability, delivery, policies and the best next step.', 90),
    ('Linen Tales', 'https://linentales.com/', 'Vilnius', 'Beauty, fashion and personal care', 'Vladas Litvinas', 'Chief Executive Officer', 'support@linentales.com', 'https://www.linkedin.com/sales/lead/ACwAAAFjAakB2k65YroFn_t54_zOOdTycp8dM-c,NAME_SEARCH,Zsih', 'https://linentales.com/pages/contact-us', 'A broad product range creates repeat questions about product choice, suitability, use, availability and delivery.', 90),
    ('RAIT', 'https://raitgroup.com/', 'Vilnius', 'Retail, e-commerce and services', 'Ona Makauskaitė-Gudaitienė', 'Managing Director', 'info@raitgroup.com', 'https://www.linkedin.com/sales/lead/ACwAABOw_B0BweGAt2se2v30r_KKp8ROKwxR-KE,NAME_SEARCH,R_hZ', 'https://raitgroup.com/about-us/', 'A customer-facing catalogue or service range creates repeat questions about choice, availability, delivery, policies and the best next step.', 90),
    ('HOVDEN', 'https://hovden.lt/', null, 'Furniture and interiors', 'Tomas Mauricas', 'Company Owner', 'order@hovden.lt', 'https://www.linkedin.com/sales/lead/ACwAACcmaO4BOT_sTdajgAwy9cssIn2-38DdZVo,NAME_SEARCH,sZVt', 'https://hovden.lt/kontaktai/', 'Buyers often need help with dimensions, materials, configuration, delivery and matching products to a room or project.', 90),
    ('C&D Style', 'https://cdstyle.lt/', 'Kaunas District Municipality', 'Beauty, fashion and personal care', 'Lina Jakimova', 'CEO', 'info@cdstyle.lt', 'https://www.linkedin.com/sales/lead/ACwAABeCKCYBQbs0fl1gK9MuihOXzys3ACxznUU,NAME_SEARCH,xLlG', 'https://cdstyle.lt/apie-mus/', 'A broad product range creates repeat questions about product choice, suitability, use, availability and delivery.', 90),
    ('GOMES Hotel Intel', 'https://gomeshotelintel.com/', 'Vilnius', 'Hospitality', 'Jorge G.', 'Founder & CEO', 'info@gomeshotelintel.com', 'https://www.linkedin.com/sales/lead/ACwAAAC-tScBgtwON0-aTRSgM0wOPQc5xEkUo90,NAME_SEARCH,Zy5X', 'https://gomeshotelintel.com/', 'Guests repeatedly ask about availability, menus, amenities, policies and bookings; an AI assistant could answer and qualify enquiries around the clock.', 90),
    ('Lexano', 'https://lexano.eu/', null, 'Healthcare', 'Evaldas Rimselis', 'CEO', 'info@lexano.lt', 'https://www.linkedin.com/sales/lead/ACwAAAEHfm0B7SqHvZCI7JNhN5-P0lyaZCoYGC8,NAME_SEARCH,Z7jM', 'https://lexano.eu/apie-mus/', 'Patients and buyers need clear help choosing services or products, understanding preparation and reaching the right booking or enquiry path without the assistant giving medical diagnoses.', 90),
    ('iDeal Lietuva', 'https://www.cec.lt/', null, 'Retail, e-commerce and services', 'Lukas Vasiliauskas', 'Chief Executive Officer', 'info@cec.lt', 'https://www.linkedin.com/sales/lead/ACwAACb8waoB_OMvUnNrugAnWe6jmGFNOS4AssU,NAME_SEARCH,tzye', 'https://www.cec.lt/kontaktai', 'A customer-facing catalogue or service range creates repeat questions about choice, availability, delivery, policies and the best next step.', 90),
    ('Entryscope', 'https://entryscope.com/', null, 'Technology', 'Ronaldas B.', 'Co-Founder | CEO', 'info@entryscope.com', 'https://www.linkedin.com/sales/lead/ACwAAAiHXNcBzAl1YshHXLNwTVfmDrABFxxrypY,NAME_SEARCH,HNQ5', 'https://entryscope.com/', 'Prospects need fast answers about fit, setup, pricing and the best next step; an AI assistant could qualify and route enquiries around the clock.', 90),
    ('IDWDISPLAY', 'https://idwdisplay.com/', null, 'Furniture and interiors', 'Tadas Milasius', 'Chief Executive Officer', 'info@idwdisplay.com', 'https://www.linkedin.com/sales/lead/ACwAAAAF2UYBm6fN1WOmn3RTKB7qGhdHrAoP7FU,NAME_SEARCH,iGqS', 'https://idwdisplay.com/about/', 'Buyers often need help with dimensions, materials, configuration, delivery and matching products to a room or project.', 90),
    ('Tankos UAB', 'https://tankos.lt/', null, 'Furniture and interiors', 'Paulius Dailidonis', 'Chief Executive Officer', 'hello@tankos.lt', 'https://www.linkedin.com/sales/lead/ACwAAB5_t7gB2TJhvzLVnjYAMQQkBPhB2gQBJQk,NAME_SEARCH,uzS2', 'https://tankos.lt/about-us', 'Buyers often need help with dimensions, materials, configuration, delivery and matching products to a room or project.', 90),
    ('UAB Baldų Mozaika', 'https://www.baldumozaika.lt/', null, 'Furniture and interiors', 'Donatas Nanartavičius', 'CEO', 'projects@b-m.lt', 'https://www.linkedin.com/sales/lead/ACwAAAv9XQ4Bk1N5-aEylsOSBSOvfhMXInjXcx8,NAME_SEARCH,xi4v', 'https://www.baldumozaika.lt/', 'Buyers often need help with dimensions, materials, configuration, delivery and matching products to a room or project.', 90),
    ('REWO | Real Estate', 'https://rewo.lt/', null, 'Retail, e-commerce and services', 'Mickėnas Gediminas', 'Chief Executive Officer', 'info@rewo.lt', 'https://www.linkedin.com/sales/lead/ACwAAAHJPvYBxL76qQXHzJq1lbUIm7UpC8Q0xgU,NAME_SEARCH,zhWW', 'https://rewo.lt/kontaktai/', 'A customer-facing catalogue or service range creates repeat questions about choice, availability, delivery, policies and the best next step.', 90),
    ('BOISROIS', 'https://boisrois.com/', null, 'Furniture and interiors', 'Simonas Kasys', 'CEO', 'enquiry@boisrois.com', 'https://www.linkedin.com/sales/lead/ACwAAAK3NuoBCKpmuPg0ms0Yq9cxY8Y7kZUTTsY,NAME_SEARCH,BOIY', 'https://boisrois.com/about-us/', 'Buyers often need help with dimensions, materials, configuration, delivery and matching products to a room or project.', 90),
    ('PREVINA', 'https://previna.lt/', null, 'Retail, e-commerce and services', 'Robertas Klimavičius', 'CEO & co-owner', 'info@previna.lt', 'https://www.linkedin.com/sales/lead/ACwAAARNBE4BIJpn7ofJYpc8V47xsi15DpSuqsI,NAME_SEARCH,jkmA', 'https://previna.lt/apie-mus/', 'A customer-facing catalogue or service range creates repeat questions about choice, availability, delivery, policies and the best next step.', 90),
    ('Furniture Help', 'https://furniturehelp.lt/lt/', 'Šiauliai', 'Furniture and interiors', 'Aivaras Gudonavicius', 'CEO', 'help@furniturehelp.lt', 'https://www.linkedin.com/sales/lead/ACwAABLXKdEBFgIyfbGqUdzbQbV44tiCPTGApOE,NAME_SEARCH,B4ZJ', 'https://furniturehelp.lt/lt/about-us/', 'Buyers often need help with dimensions, materials, configuration, delivery and matching products to a room or project.', 90),
    ('ScienceForBrain', 'https://scienceforbrain.com/', 'Vilnius', 'Healthcare', 'Tad Svendrys, MBA', 'Chief Executive Officer', 'info@scienceforbrain.com', 'https://www.linkedin.com/sales/lead/ACwAAAV8t3IBQXOAybSc2a42aYFzXsyFBlZrPz0,NAME_SEARCH,Hxrs', 'https://scienceforbrain.com/', 'Patients and buyers need clear help choosing services or products, understanding preparation and reaching the right booking or enquiry path without the assistant giving medical diagnoses.', 90),
    ('MAKO HORECA', 'https://makohoreca.com/', 'Vilniaus', 'Retail, e-commerce and services', 'Mark Berkman', 'Founder & Managing Director', 'info@makohoreca.com', 'https://www.linkedin.com/sales/lead/ACwAABfecoQBracqwDz9DStZm92TUrzJHLUbZWw,NAME_SEARCH,0U91', 'https://makohoreca.com/kategorija/profesionali-virtuves-iranga/specializuota-iranga/kebabinu-iranga/kontaktiniai-griliai/', 'A customer-facing catalogue or service range creates repeat questions about choice, availability, delivery, policies and the best next step.', 90),
    ('Gadarvy Therapeutics', 'https://gadarvytherapeutics.com/', 'Vilniaus', 'Healthcare', 'Martynas Lunys', 'Chief Executive Officer', 'info@gadarvy.com', 'https://www.linkedin.com/sales/lead/ACwAAASNELUB4DGOSrcsEi5UKzG_vY9Sh1rV2zU,NAME_SEARCH,zQ4d', 'https://gadarvytherapeutics.com/', 'Patients and buyers need clear help choosing services or products, understanding preparation and reaching the right booking or enquiry path without the assistant giving medical diagnoses.', 90),
    ('FITSOUT', 'https://fitsout.com/', null, 'Furniture and interiors', 'Jonas Stragis', 'CEO', 'info@fitsout.com', 'https://www.linkedin.com/sales/lead/ACwAAAF6c_EB1WYeyK-qLy8OTV4KCK8q9g8xoOY,NAME_SEARCH,V3pv', 'https://fitsout.com/about-fitsout/', 'Buyers often need help with dimensions, materials, configuration, delivery and matching products to a room or project.', 90),
    ('Baros Medical Supplies', 'https://baros.lt/', 'Kaunas', 'Healthcare', 'Simonas Griskevicius', 'Chief Executive Officer', 'info@baros.lt', 'https://www.linkedin.com/sales/lead/ACwAADqRetcBOadPGU4G1-yaJSHkHxlFwflmzTY,NAME_SEARCH,XbZw', 'https://baros.lt/apie-mus/', 'Patients and buyers need clear help choosing services or products, understanding preparation and reaching the right booking or enquiry path without the assistant giving medical diagnoses.', 90),
    ('ADMODUM', 'https://www.admodum.lt/', null, 'Furniture and interiors', 'Donatas Česnulis', 'Founder / CEO', 'info@admodum.lt', 'https://www.linkedin.com/sales/lead/ACwAABrUKo4BkqcjJxTm6YJZyT-fstZ-LdvS51U,NAME_SEARCH,ap4Q', 'https://www.admodum.lt/apie-mus', 'Buyers often need help with dimensions, materials, configuration, delivery and matching products to a room or project.', 90),
    ('EMKO', 'https://emko-place.shop/', null, 'Furniture and interiors', 'Erika Mikulskiene', 'Managing Director', 'info@emko.lt', 'https://www.linkedin.com/sales/lead/ACwAAAJm9BYBSaJmu1L7mv_Wj2FLV0B5sra0ENc,NAME_SEARCH,aNzT', 'https://emko-place.shop/pages/contact', 'Buyers often need help with dimensions, materials, configuration, delivery and matching products to a room or project.', 90),
    ('GRIDA', 'https://www.grida.lt/', null, 'Retail, e-commerce and services', 'Kestutis Andriulaitis', 'Managing Director', 'info@grida.lt', 'https://www.linkedin.com/sales/lead/ACwAAAWsSLsBCWCv1mTGxDbOYCBiQfq8iYKAAZ4,NAME_SEARCH,uCQ1', 'https://www.grida.lt/apie-mus/', 'A customer-facing catalogue or service range creates repeat questions about choice, availability, delivery, policies and the best next step.', 90),
    ('Amber Esthetic', 'https://www.amberesthetic.lt/', null, 'Healthcare', 'Doneta Novakaitė', 'Chief Executive Officer', 'info@amberesthetic.lt', 'https://www.linkedin.com/sales/lead/ACwAACKOkYABVTXWiMWYSmTIwH09Ezsb9T5lHL0,NAME_SEARCH,MaAu', 'https://www.amberesthetic.lt/apie-mus', 'Patients and buyers need clear help choosing services or products, understanding preparation and reaching the right booking or enquiry path without the assistant giving medical diagnoses.', 90),
    ('Witsee', 'https://www.witsee.com/', null, 'Technology', 'Rūta Klimašauskė', 'Chief Executive Officer', 'tech@witsee.com', 'https://www.linkedin.com/sales/lead/ACwAACvn1ywB2mIbz8KnqVHipkXMs05taLHKqVI,NAME_SEARCH,-_c1', 'https://www.witsee.com/', 'Prospects need fast answers about fit, setup, pricing and the best next step; an AI assistant could qualify and route enquiries around the clock.', 90),
    ('Gergama', 'https://gergama.lt/', null, 'Furniture and interiors', 'Mindaugas Montvydas', 'Managing Director', 'info@gergama.lt', 'https://www.linkedin.com/sales/lead/ACwAAANzOz4BZumelkxkKlzSM8e6eWy_8zZLOFI,NAME_SEARCH,uyHQ', 'https://gergama.lt/about-us/', 'Buyers often need help with dimensions, materials, configuration, delivery and matching products to a room or project.', 90),
    ('Elevita.lt', 'https://elevita.lt/lt/', null, 'Beauty, fashion and personal care', 'Liudmila Dubrovskaja', 'Managing Director', 'eshop@elevita.lt', 'https://www.linkedin.com/sales/lead/ACwAAChcTU8BLyKnmOijuF4LKwOR6vbD8UxCMN8,NAME_SEARCH,CL2i', 'https://elevita.lt/lt/contact-us', 'A broad product range creates repeat questions about product choice, suitability, use, availability and delivery.', 90),
    ('Apvalaus stalo klubas', 'https://www.asklubas.lt/', 'Trakai', 'Hospitality', 'Rasa Snaideriene', 'CEO & Owner', 'info@asklubas.lt', 'https://www.linkedin.com/sales/lead/ACwAAAKBCWMBcIM1EhmuOBtNNoV8iQK76ej5fOA,NAME_SEARCH,9NR2', 'https://www.asklubas.lt/kontaktai1.htm', 'Guests repeatedly ask about availability, menus, amenities, policies and bookings; an AI assistant could answer and qualify enquiries around the clock.', 90),
    ('UAB Laurema', 'https://laurema.lt/', 'Šiauliai District Municipality', 'Retail, e-commerce and services', 'Jurate Kasperaviciene', 'Chief Executive Officer', 'info@laurema.eu', 'https://www.linkedin.com/sales/lead/ACwAAAXmL0QBBPf5Z3UVOE5Qfr7634rr74um-Mc,NAME_SEARCH,qKt4', 'https://laurema.lt/about-us/', 'A customer-facing catalogue or service range creates repeat questions about choice, availability, delivery, policies and the best next step.', 90),
    ('Aromika', 'https://aromika.lt/', null, 'Beauty, fashion and personal care', 'Andrius Kauspedas', 'Owner', 'labas@aromika.lt', 'https://www.linkedin.com/sales/lead/ACwAAASwD6MBQJQGhdmR9LAWgLUiortEBPnQGnA,NAME_SEARCH,BgDR', 'https://aromika.lt/pages/apie-mus', 'A broad product range creates repeat questions about product choice, suitability, use, availability and delivery.', 90),
    ('BALTEXIM', 'https://www.baltexim.lt/', 'Vilniaus', 'Retail, e-commerce and services', 'Vitalis Balčiūnas', 'Managing Director', 'info@baltexim.lt', 'https://www.linkedin.com/sales/lead/ACwAAAYedz4BeCdr512VHhLRzq_BSDCg3GC34hg,NAME_SEARCH,D9zg', 'https://www.baltexim.lt/apie-mus/', 'A customer-facing catalogue or service range creates repeat questions about choice, availability, delivery, policies and the best next step.', 90),
    ('HI-LABS', 'https://www.hi-labs.eu/', 'Kaunas', 'Healthcare', 'Lolita Bareikienė', 'Chief Executive Officer', 'info@hi-labs.eu', 'https://www.linkedin.com/sales/lead/ACwAABB1XqoB3B_dYDfpWqVNEcdmLgIK6qoIxtk,NAME_SEARCH,RMKz', 'https://www.hi-labs.eu/about-us', 'Patients and buyers need clear help choosing services or products, understanding preparation and reaching the right booking or enquiry path without the assistant giving medical diagnoses.', 90),
    ('Adele Notes', 'https://adelenotes.com/', 'Vilnius', 'Retail, e-commerce and services', 'Ieva Čepononė', 'CEO & Partner/ Co-Founder at ADELE NOTES', 'info@adelenotes.com', 'https://www.linkedin.com/sales/lead/ACwAABF9H5MBV6pqxHkQ3CtLeXLJIqiKIct-JJo,NAME_SEARCH,QQRm', 'https://adelenotes.com/pages/apie-mus', 'A customer-facing catalogue or service range creates repeat questions about choice, availability, delivery, policies and the best next step.', 90),
    ('Arredo Deko', 'https://arredodeko.lt/', null, 'Furniture and interiors', 'Jonas Mongirdas', 'Chief Executive Officer', 'info@arredodeko.lt', 'https://www.linkedin.com/sales/lead/ACwAABH_IB8BLyYSnS1Jedee4a5P8jqGdndo7wc,NAME_SEARCH,Disa', 'https://arredodeko.lt/kontaktai/', 'Buyers often need help with dimensions, materials, configuration, delivery and matching products to a room or project.', 90),
    ('SYNC longevity clinic', 'https://synclongevity.com/', 'Kaunas', 'Healthcare', 'Tadas Kavaliauskas', 'Co-Founder & CEO', 'info@synclongevity.com', 'https://www.linkedin.com/sales/lead/ACwAAAzOY-oBMHyn87ox-BRmLsmDxxhtQ4PV7DE,NAME_SEARCH,Vxh6', 'https://synclongevity.com/', 'Patients and buyers need clear help choosing services or products, understanding preparation and reaching the right booking or enquiry path without the assistant giving medical diagnoses.', 90),
    ('INDUSTEK UAB', 'https://industek.lt/', null, 'Retail, e-commerce and services', 'Vaidas Ragaišis', 'CEO, co-owner', 'info@industek.lt', 'https://www.linkedin.com/sales/lead/ACwAAAzQVKIBrWgASR7DllHfWKli0J8u_n1mzeQ,NAME_SEARCH,uS-T', 'https://industek.lt/apie-mus', 'A customer-facing catalogue or service range creates repeat questions about choice, availability, delivery, policies and the best next step.', 90),
    ('JSC Baldai Jums', 'https://www.baldaijums.lt/', 'Jonava District Municipality', 'Furniture and interiors', 'Nijole Meskauskiene', 'Owner', 'info@baldaijums.lt', 'https://www.linkedin.com/sales/lead/ACwAAAVlS2EBtAIjmKgmLwY0qK-dZaoTBqOIoO8,NAME_SEARCH,Snv3', 'https://www.baldaijums.lt/kontaktai/', 'Buyers often need help with dimensions, materials, configuration, delivery and matching products to a room or project.', 90),
    ('Medicinos namai', 'https://medicinosnamai.lt/', 'Kaunas', 'Healthcare', 'Vytautas Jakubauskas', 'CEO', 'info@medicinosnamai.lt', 'https://www.linkedin.com/sales/lead/ACwAAFnoPlsBbSeWKJKIzxWpv6LWm3HvqoBPn0I,NAME_SEARCH,ayJA', 'https://medicinosnamai.lt/kontaktai/', 'Patients and buyers need clear help choosing services or products, understanding preparation and reaching the right booking or enquiry path without the assistant giving medical diagnoses.', 90),
    ('Aromatic •89•', 'https://www.aromatic89.lt/', null, 'Beauty, fashion and personal care', 'Arnoldas Bružas', 'Business Owner', 'info@aromatic89.lt', 'https://www.linkedin.com/sales/lead/ACwAACbMM4EBs9pRZBNEkZBQz53HttxfgL6L-sc,NAME_SEARCH,nKLS', 'https://www.aromatic89.lt/p/kontaktai', 'A broad product range creates repeat questions about product choice, suitability, use, availability and delivery.', 90),
    ('Samana Samana - pasirūpins tavo įmonės dovana | samanasamana.lt', 'https://samanasamana.lt/', 'Palanga', 'Retail, e-commerce and services', 'Alina Gečaitė', 'Chief Executive Officer', 'info@samanasamana.lt', 'https://www.linkedin.com/sales/lead/ACwAADlRL50Be760qryz3q60CT9O5sseuE1fyYs,NAME_SEARCH,Lqsn', 'https://samanasamana.lt/apie-mus-samanasamana/', 'A customer-facing catalogue or service range creates repeat questions about choice, availability, delivery, policies and the best next step.', 90),
    ('jot.jot', 'http://www.jotjot.com/', null, 'Furniture and interiors', 'Jurgis Garmus', 'CEO', 'info@jotjot.com', 'https://www.linkedin.com/sales/lead/ACwAAC95ZSsBdcUZBP7kMGf3g575rYLDlDgYWWo,NAME_SEARCH,8N8J', 'http://www.jotjot.com/about-us-2/', 'Buyers often need help with dimensions, materials, configuration, delivery and matching products to a room or project.', 90),
    ('Green Town Restaurant', 'https://www.greentown.lt/', null, 'Hospitality', 'Silvija Jankūnaitė', 'Chief Executive Officer', 'info@greentown.lt', 'https://www.linkedin.com/sales/lead/ACwAABrhhugBan-JE5aKFBEUg4zINSwQnBhBWDU,NAME_SEARCH,YAzi', 'https://www.greentown.lt/kontaktai', 'Guests repeatedly ask about availability, menus, amenities, policies and bookings; an AI assistant could answer and qualify enquiries around the clock.', 90)
)
insert into public.sales_leads (
  name,
  website,
  city,
  vertical,
  ceo,
  email,
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
  lead.email,
  '1–200 employees by Sales Navigator filter; exact headcount not independently verified',
  lead.hook,
  'Relevant buyer and active official website verified 2026-08-28. The email is a public business contact published on the official website; it was not guessed or obtained from paid enrichment.',
  'LinkedIn Sales Navigator Lithuania email-verified batch; official email evidence 2026-08-28: ' || lead.email_evidence_url,
  lead.score,
  lead.buyer_title || '; Lithuania confirmed by person geography and company-HQ filters; official website email verified',
  false,
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
        regexp_replace(coalesce(existing.website, ''), '^https?://(www\.)?', ''),
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
    or lower(existing.email) = lower(lead.email)
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
    and source like 'LinkedIn Sales Navigator Lithuania email-verified batch;%';

  if imported_count <> 63 then
    raise exception
      'Expected exactly 63 email-verified Lithuanian LinkedIn leads, found %',
      imported_count;
  end if;
end
$$;
