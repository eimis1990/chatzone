# Phase 1 watch-list triage — 2026-08-26

Evidence and per-URL change log for Phase 1 Task 1.3. Status: **completed
locally; deployment, recrawl, rendering checks, and timed reviews pending**.

## Method and limits

- Source: live Google Search Console Performance report for the verified
  `https://www.loqara.com/` property.
- Search type: Web; exact page filter; Last 28 days compared with Previous 28
  days; extracted 26 August 2026.
- Metrics: clicks, impressions, CTR, average position, and every visible query.
- GSC privacy thresholds hide query rows. Page totals remain authoritative; a
  page with no visible query row does not have “no queries.”
- Classification options were `keep`, `snippet refresh`, `content refresh`, or
  `consolidation candidate`. No page was edited simply because its CTR was zero
  on a tiny sample.

## Page comparison and decision

| URL | Clicks now/prior | Impressions now/prior | Position now/prior | Visible query evidence | Classification |
| --- | ---: | ---: | ---: | --- | --- |
| `/blog/best-ai-chatbot-for-ecommerce` | 0 / 0 | 5 / 9 | 15.2 / 12.1 | None visible | **Keep** |
| `/blog/how-to-choose-ai-support-agent` | 0 / 0 | 0 / 11 | — / 8.5 | None visible | **Keep** |
| `/blog/multilingual-ai-customer-support` | 0 / 0 | 0 / 14 | — / 11.4 | Prior: `multilingual voice customer support`, 1 impression at position 73 | **Content refresh** |
| `/blog/live-chat-vs-ai-chatbot-ecommerce` | 0 / 0 | 11 / 0 | 10.7 / — | None visible | **Keep** |
| `/blog/where-is-my-order-ai` | 0 / 0 | 6 / 3 | 16.3 / 5.0 | None visible | **Keep** |
| `/blog/best-chatbot-platforms` | 0 / 1 | 24 / 19 | 54.7 / 19.6 | `chatbot platform` 8 at 87.3; `chatbot platforms` 3 at 75.7; five smaller variants | **Content refresh already completed** |

## Per-URL change log

### `best-ai-chatbot-for-ecommerce` — keep

- Kept the title and description. Five current impressions with hidden query
  text cannot diagnose CTR or justify a snippet test.
- Existing direct answer, vendor-fit decisions, limitations, buyer-checklist
  link, and commercial next step remain.
- No consolidation: this page owns e-commerce-specific platform selection,
  while `best-chatbot-platforms` owns the broad generic comparison.

### `how-to-choose-ai-support-agent` — keep

- Kept the title and description. Current impressions are zero, so there is no
  live query sample to optimise against.
- Added only the contextual backlink to the dated 2026 developments review as
  part of Task 1.2; the existing e-commerce comparison backlink remains.
- No consolidation: this URL owns the evaluation method, not a ranked vendor
  list.

### `multilingual-ai-customer-support` — content refresh

- Kept the title because the current query sample is empty.
- Replaced the universal-language description and direct answer with an
  explicit supported-language evaluation brief.
- Corrected Loqara scope to English and Lithuanian and told stores needing other
  languages to choose a product that documents and passes them.
- Added a six-part test covering product-level coverage, grounding, missing
  information, structured store data, handoff, and native review.
- Removed guarantees that grounding makes every language accurate and that
  enabling another language is always just a setting.
- Added two-way contextual links with `live-chat-vs-ai-chatbot-ecommerce`.

### `live-chat-vs-ai-chatbot-ecommerce` — keep

- Kept title and description. Eleven new impressions at position 10.7 are an
  encouraging but too-small sample for a snippet change.
- Added a contextual link to the multilingual test where language changes the
  human/AI division of work; the multilingual page links back.
- No consolidation: comparison intent differs from multilingual setup intent.

### `where-is-my-order-ai` — keep

- Kept title and description. Six current impressions and hidden queries do not
  support a title test; the page already owns the specific order-status job.
- Existing links to ticket reduction, handoff, WooCommerce, and returns provide
  the relevant operational cluster. No forced generic-platform link was added.
- No consolidation: the page is the focused order-lookup owner.

### `best-chatbot-platforms` — content refresh completed

- Kept title and description despite the position decline because the visible
  generic queries rank too low for CTR to be the diagnosis.
- Phase 0's official-source review corrected vendor pricing and availability,
  dated the comparison 26 August 2026, and retained buyer-fit limitations.
- Task 1.2 added a contextual link to the dated developments review. The page
  already links to the buyer checklist and e-commerce comparison, which link
  back into the comparison cluster.
- No consolidation: its generic platform query owner differs from the narrower
  e-commerce shortlist.

## Review schedule

For each locally changed URL, record the deployment SHA, request recrawl only
after the deployment is live, then review:

- **7 complete days after deployment:** indexing/canonical/status smoke check,
  page/query impressions, any newly visible query rows, and obvious regressions.
- **28 complete days after deployment:** compare the exact URL against the
  matched preceding 28 complete days; assess clicks, CTR only where position is
  comparable, average position, and organic CTA/signup events.

Unchanged `keep` URLs remain in the same 28-day watch list so a future edit is
based on a larger query sample rather than absence of evidence.

## Verification

- `npm run audit:blog`: 65 posts, zero errors; the unrelated existing warning
  for `conversational-ai-shopping-assistant` remains.
- `git diff --check`: passed on 2026-08-26.
