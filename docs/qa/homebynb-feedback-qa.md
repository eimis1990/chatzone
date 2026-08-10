# HomeByNB feedback round — manual QA script

Walkthrough for re-testing the 9 issues from the client's "ChatBOT v2.pdf" (2026-08-10).
Every case below was reproduced, fixed, and verified via the API — this script is for
confirming the same by hand in the widget UI.

## Before you start

- **Wait for the Vercel deploy** of commits `f7d8cdc` + `56754e7` to finish — the code half
  of the fixes only exists in prod after that. (DB half — retrieval RPC, prompt v3,
  bilingual canonical pages — is already live.)
- **Where to test:** preferably the **3IMIS test copy** of HomeByNB (your `e.kudarauskas@gmail.com`
  test user) — it has the same synced catalog and KB. Testing on the client's own bot works
  too but adds conversations to their stats.
- Ask in Lithuanian on the client's bot (Natali AI is LT). On the 3IMIS copy the bot replies
  in English (its language is set to EN) — the *behavior* is what matters, not the language.
- Product prices/stock are live — exact items and prices may differ from the expected
  examples below. That's fine; check the *shape* of the behavior.

---

## 1. Irrelevant products mixed into results (PDF p.1)

**Ask:** `Ieškau dovanos žmogui kuris mėgsta gaminti. Gal turite keptuvių?`

- ✅ Expect: pans / kitchen items only (e.g. "Puodų ir keptuvių rinkinys NÁTA" — a set that
  *includes* pans counts, and the bot should say it's a set). It may also ask one short
  clarifying question about budget — that's intended.
- ❌ Fail: dish soap, shampoo, or a hair straightener anywhere in the cards or "Žiūrėti visus".

## 2. Product cards on a discount question (PDF p.2)

**Ask:** `Ar yra NATA siurbliui nuolaida?`

- ✅ Expect: an honest answer about discounts. If it shows any cards at all, they must be
  **NATA vacuums** (the product asked about) — more likely it shows none and offers to look
  the product up.
- ❌ Fail: hair conditioner / shampoo cards (the old "12 random candidates" behavior).

## 3. Working hours (PDF p.3)

**Ask:** `Koks jūsų darbo laikas?`

- ✅ Expect: `I–V 09:00–17:00, VI 11:00–16:00` (+ usually the Vikingų g. address).
- ❌ Fail: "neturiu informacijos apie darbo laikus" + deflection to phone/email.

## 4. Phrasing-sensitive retrieval (PDF p.5)

**Ask, in this order in ONE conversation:**
1. `Kada dirba jusu parduotuve?` (deliberately without diacritics)
2. `o kur ji yra?`
3. `ar turite fizine parduotuve?`

- ✅ Expect: all three answered — hours for (1), Vikingų g. 5C-36 address for (2),
  "taip" + address + hours for (3). The follow-up "o kur ji yra?" is the key one: it used
  to retrieve privacy-policy noise.
- ❌ Fail: any of the three answered with "neturiu informacijos".

## 5. Bad fallback suggestions on the word "PRO" (PDF p.4)

**Ask:** `Ar turite Samsung Premium Pro keptuvę?`

- ✅ Expect: honest "neradau" + an offer to look for other kitchenware. **No cards.**
- ❌ Fail: hair straighteners or blow dryers offered as "alternatives" (they used to match
  on the shared word "PRO").

## 6. Concrete delivery prices (PDF p.6)

**Ask:** `Kiek kainuoja pristatymas?`

- ✅ Expect: the **live checkout options with prices**, e.g. DPD Paštomatai ~2,23 €,
  DPD kurjeris ~3,30 €, Omniva paštomatai ~2,31 €, free pickup at Vikingų g. (with hours) —
  plus the free-over-50 € rule and a note that the final price is confirmed at checkout.
  (Prices are fetched live for a small order — small drift vs. what you saw earlier is normal.)
- ❌ Fail: only the vague "kaina apskaičiuojama formuojant užsakymą" answer.

## 7. No invented carriers (PDF p.7)

**Ask (two separate questions):**
1. `Ar pristatote į paštomatus?`
2. `Ar pristatote kurjeriu?`

- ✅ Expect: (1) DPD Paštomatai + Omniva paštomatai, with prices. (2) DPD courier —
  Omniva may be mentioned only as a *paštomatai* option, never as a courier.
- ❌ Fail: **LP Express** mentioned anywhere, or "Omniva courier".

## 8. Cheapest product (PDF p.8)

**Ask:** `Kokia pigiausia prekė jūsų parduotuvėje?`

- ✅ Expect: a genuinely cheap item — currently `Matavimo indas MÚII, 30 ml — 0,20 €`.
- ❌ Fail: the 10,90 € PREVIA hand cream (or anything not actually cheapest).

## 9. Product specs from deep in the description (PDF p.9)

**Ask:** `Ar dulkių siurblys NATA COSMOS turi papildomų antgalių? Ar turi HEPA filtrą?`

- ✅ Expect: yes on both — nozzles for floors/furniture/shelves/corners/narrow gaps
  (optionally the extra NT-SP008W / NT-SP009W attachments) **and** the six-layer filtration
  with H13 HEPA.
- ❌ Fail: "aprašyme nėra aiškiai nurodyta" about either fact.

---

## Bonus checks (new capabilities worth showing the client)

- `What are your opening hours?` — English phrasing must work too (bilingual canonical pages).
- `Kokia brangiausia prekė?` — most-expensive should also come from a price-sorted search.
- Ask about any product's ingredients/specs ("papasakok daugiau apie …") — the bot now reads
  up to 6 000 chars of the live description instead of 1 500.

## If a case fails

Grab the exact question + answer + a screenshot, and check the model's actual search query
in the Vercel logs (`[agent] search_products query=...`) — the query the model wrote is
usually the clue. All root causes and fixes are documented in
[docs/wiki/log.md](../wiki/log.md) (entries dated 2026-08-10) and the
[commerce](../wiki/commerce.md) / [rag-and-knowledge](../wiki/rag-and-knowledge.md) wiki pages.
