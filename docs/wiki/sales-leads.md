# Sales leads

Owner-only outbound pipeline: researched prospects, prioritization, prepared
emails, and manual status progression.

## Data and flow

- `/owner/leads` reads every `sales_leads` row, ordered by score descending and
  then name (`app/(owner)/owner/leads/page.tsx:15`). The table was introduced in
  `supabase/migrations/0036_sales_leads.sql:8`; `has_chatbot` was added in
  `0037_sales_leads_has_chatbot.sql:7`.
- Discovery channel is explicit: `lead_origin` is either `default` for regular
  web research or `linkedin` for LinkedIn/Sales Navigator. It is separate from
  the free-text `source` research evidence. Every row stores a nonblank canonical
  English `country`, plus an optional LinkedIn profile URL
  (`supabase/migrations/20260828101532_add_sales_lead_origin_and_country.sql:3-24`;
  `lib/types.ts:505-528`). The migration preserves the existing 300 leads as
  `default` / `Lithuania`.
- The client UI filters locally by text, vertical, status, and chatbot presence
  (`components/owner/SalesLeadsTable.tsx:297`). Status changes are optimistic,
  persist through `setLeadStatus`, update `status_updated_at`, and roll back both
  status and timestamp on error (`:313`; `app/(owner)/owner/leads/actions.ts:18`).
- The owner screen first scopes the full pipeline by the `Default` or `LinkedIn`
  source tab, so summary cards, status counts, categories, search, and results do
  not mix channels (`components/owner/SalesLeadsTable.tsx:470-505`, `:640-679`).
  Only the LinkedIn tab exposes the coarse `Lithuania` / `Other` filter; `Other`
  is a filter group, never a stored country value. The actual country name stays
  visible in LinkedIn desktop rows, mobile cards, and lead details
  (`lib/sales-leads.ts:3-16`; `components/owner/SalesLeadsTable.tsx:587-614`,
  `:826-845`, `:874-876`).
- The route heading follows the same compact title/subtitle pattern as other
  owner pages (`app/(owner)/owner/leads/page.tsx:23`). Desktop uses a flat,
  score-first data grid with platform in its own column; below `md`, leads become
  stacked cards rather than a horizontally overflowing table
  (`components/owner/SalesLeadsTable.tsx:421`, `:485`). City is intentionally
  detail-only (`:591`).
- Score is represented by the same compact percentage tile in the table, mobile
  list, and detail panel (`components/owner/SalesLeadsTable.tsx:110`). Status
  colors are lifecycle semantics: neutral Ready, amber Email sent, sky Follow-up
  email, violet-to-emerald demo progress, rose Delivery failed, red Rejected,
  and accent-orange Our client (`:67`). `Rejected` means an explicit prospect
  refusal; `Delivery failed` means the address was not reached.
- Desktop keeps Company compact, omits the redundant Chatbot column, and places
  a relative status age immediately after Status (`components/owner/SalesLeadsTable.tsx:467`).
  Chatbot qualification is still available in the summary/filter, mobile cards,
  and detail panel. The page supplies one server timestamp so relative labels do
  not change during hydration (`app/(owner)/owner/leads/page.tsx:31`);
  `lib/sales-leads.ts:10` owns the formatter.
- `status_updated_at` is deliberately separate from generic `updated_at`.
  Prepared-email rewrites must not make a lead appear newly contacted. The July
  29 migration backfilled existing rows from `updated_at` as the best available
  historical estimate; future lifecycle changes set both timestamps
  (`supabase/migrations/20260729105857_sales_leads_follow_up_opt_out.sql:1`).
- Lead selection and drawer visibility are separate state. Keeping the selected
  lead mounted while `Dialog` closes lets Base UI finish the exit transition
  (`components/owner/SalesLeadsTable.tsx:260`, `:526`). The drawer uses scoped
  starting/ending-state CSS instead of the shared centered-dialog zoom
  (`app/globals.css:789`).
- The drawer's long-content region must keep `min-h-0`, `overflow-y-auto`, and
  non-shrinking content cards; otherwise flex sizing collapses research and
  email content instead of scrolling it (`components/owner/SalesLeadsTable.tsx:587`).
  The website metadata value is a real external link (`:597`).
- The drawer separates research from presentation with `Client details` and
  `Email body` tabs. Email body shows the single `Clean update` design and opens
  it in a centered, near-full-height rendered-email dialog without replacing
  the lead drawer. The preview dialog is
  deliberately mounted as the drawer dialog's sibling, not its descendant, so
  it cannot inherit the drawer's narrow positioning or stacking context
  (`components/owner/SalesLeadsTable.tsx:1150-1158`;
  `components/owner/LeadEmailTemplates.tsx:242-314`).
- The `Clean update` card also has `Send email`. It opens a separate confirmation
  dialog showing the immutable sender, live recipient, live subject, and format;
  no client message leaves the app until the owner presses the second Send
  button. A successful UI send disables the client-send action for that lead
  while keeping Preview available
  (`components/owner/LeadEmailTemplates.tsx:81-235`).
- The utility row beneath the tabs is a responsive two-by-two/four-column grid:
  copy body, repeatable self-test send, website, and pipeline status. The former
  `Open mail app` action was removed. `Send demo` always delivers the current
  Clean update HTML to `e.kudarauskas@gmail.com`
  (`components/owner/SalesLeadsTable.tsx:1001-1043`).

## Prepared-email conventions

- `email_subject` and `email_body` are operational snapshots stored on each
  lead, not generated at send time. Existing-chatbot leads should acknowledge
  the incumbent respectfully and give a concrete reason to compare.
- LinkedIn prepared emails are localized from the canonical `country` field:
  Lithuania receives Lithuanian subjects/bodies, while every other country
  receives English. `scripts/prepare-linkedin-sales-lead-emails.mjs` owns the
  dry-run/repair/apply workflow, reads concise first-party homepage metadata for
  the personalized two-sentence opening, preserves lifecycle timestamps, and
  enforces the platform boundary: only WooCommerce, Shopify, Magento, and
  Verskis may claim direct catalogue grounding. The 2026-09-04 plan populated
  all 200 LinkedIn rows (100 Lithuanian, 100 English); 198 have verified inboxes,
  while LAJO baldai and Pilnatvės Sodas intentionally remain addressless.
- Every first-touch body starts with `Laba diena,` followed by a blank line.
  Validate this alongside the opt-out before sending. Migration
  `20260730033800_restore_greeting_to_researched_sales_leads.sql:1` repaired the
  greeting omitted from the July 29 researched batch without changing lifecycle
  timestamps.
- Prepared-email openings use two sentences: a verifiable observation grounded
  in `hook`/the previous opening, then one concrete task Loqara could help with.
  Do not turn inferred buyer behavior into fact (for example, "customers often
  ask"); use possibility/task language instead. Long brand dumps, registry
  revenue/staff facts, hype, and unsupported comparisons are excluded
  (`scripts/rewrite-sales-lead-emails.mjs:79`).
- The shared pitch has separate variants: e-commerce leads mention the live
  product catalog; other verticals describe a content-grounded website
  consultant and never force catalog/stock/shopper wording. Healthcare openings
  stay with factual service, specialist, location, preparation, and registration
  information—not diagnosis or treatment advice
  (`scripts/rewrite-sales-lead-emails.mjs:40`, `:96`).
- First-touch copy emphasizes contextual Lithuanian conversation rather than a
  FAQ widget. Plan allowances (1,500–12,000 conversations) are intentionally
  omitted until a prospect is evaluating the product.
- Every prepared cold email ends with the exact polite opt-out:
  `Jei tokie pasiūlymai šiuo metu neaktualūs, tiesiog atsakykite „ne“ – daugiau
  nerašysiu.` The July 29 migration appended it once to all existing non-empty
  bodies without changing lifecycle timestamps, and the rewrite generator keeps
  it in future bodies (`supabase/migrations/20260729105857_sales_leads_follow_up_opt_out.sql:31`;
  `scripts/rewrite-sales-lead-emails.mjs:44`).
- Bulk rewrites go through the dry-run/repair/apply workflow in
  `scripts/rewrite-sales-lead-emails.mjs:235`; validation checks full row
  coverage, duplicate ids, unsupported behavior claims, incumbent-chatbot
  acknowledgement, vertical vocabulary, and stale-row timestamps before writes.
- **Copy means body only.** Both detail-panel copy actions pass exactly
  `openLead.email_body` (`components/owner/SalesLeadsTable.tsx:1003`, `:1110`).
  Do not reintroduce a `Tema:` prefix into clipboard copy.
- Manual name/URL/email signature lines do not belong in stored bodies. Webmail
  adds the configured signature. API sends must provide an HTML body plus the
  plain-text fallback and append the same branded signature: the inline fox at
  `public/loqara-email-logo.jpg` via `cid:loqara-logo`, bold founder name,
  founder title, muted product tagline, and orange linked `loqara.com`. A
  plain-text-only API send is invalid; stop before sending if the inline asset
  or HTML signature cannot be constructed.
- The single Clean update renderer splits the stored body at the first
  `Esu Eimantas` paragraph:
  the client-specific opening remains plain and unchanged, while the shared
  pitch, question, opt-out, and signature receive one inline-styled, table-safe
  treatment (`lib/sales-email-templates.ts:27-46`, `:81-138`). The
  preview dialog's `Copy styled email` writes both `text/html` and the exact
  stored body as `text/plain` (`components/owner/LeadEmailTemplates.tsx:67-79`,
  `:257-265`).
- `Clean update` is the only outbound design: a compact logo lockup, generous
  white space, and neutral bordered pitch rows. Its orange top rule is the
  outer card's border (not a wider inner row), so it stays inside the rounded
  card at narrow widths. Every shared pitch paragraph, including the
  `Esu Eimantas...` introduction, lives under one `Trumpai apie Loqara` heading
  (`lib/sales-email-templates.ts:81-128`).
- Do not add `mailto:` response buttons to the Clean update question. A mailto
  URL can open a new draft with a matching `Re:` subject, but email HTML cannot
  supply the original message's `In-Reply-To`/`References` headers, so it cannot
  guarantee a real reply in the existing conversation. The template therefore
  keeps the question as text and relies on the recipient's normal Reply action
  (`lib/sales-email-templates.ts:107-108`). A hosted response endpoint would be
  required for reliable one-click responses or tracking. The renderer remains
  table-only and inline-styled, with the shared signature built in.

## Operational sending

- The unattended weekday outreach automation was paused on 2026-08-17 at the
  owner's request. New cold-email batches are manual until explicitly
  re-enabled; do not infer permission to resume the worker from a request to
  send one manual batch.
- Owner-triggered sends use the real `hello@loqara.com` Hostinger mailbox, not
  the app's separate Resend notification helper. Hostinger Email's official
  client settings are SMTP `smtp.hostinger.com:465` and IMAP
  `imap.hostinger.com:993`, both SSL/TLS. The username is fixed in code and
  `HOSTINGER_EMAIL_PASSWORD` is the only new server secret
  (`lib/hostinger-mail.ts:30-131`; `lib/env.ts:61-63`; `.env.example:31`).
- The server action re-reads the live lead and validates recipient, subject,
  greeting/blank line, and exact opt-out. It always builds the single Clean
  update design as one RFC822
  message containing styled HTML, a branded plain-text fallback, and the fox as
  inline `cid:loqara-logo`; that same raw message is sent over SMTP and appended
  to Hostinger's special-use Sent folder over IMAP, preserving one Message-ID
  (`app/(owner)/owner/leads/actions.ts:61-205`;
  `lib/sales-email-send.ts:6-40`; `lib/hostinger-mail.ts:71-131`).
- Migration `20260817182240_sales_email_sends.sql` adds the owner-only
  `sales_email_sends` audit table and lead-level sent markers. A partial unique
  index permits only one `sending`/`sent` initial-email record per lead, so
  double clicks, concurrent actions, and browser retries fail closed rather
  than duplicating outreach. Failed SMTP attempts release the claim by becoming
  `failed`. After SMTP acceptance, never retry automatically—even if Sent-folder
  archiving or the final database update fails, because the recipient may
  already have the message. The table enables RLS and grants only the server's
  `service_role` the direct Data API privileges used by the action
  (`supabase/migrations/20260817182240_sales_email_sends.sql:20-51`).
- `Send demo` is a separate owner-only action. It re-reads and validates the
  selected lead, sends the same Clean update HTML and exact subject to
  `e.kudarauskas@gmail.com`, and archives the raw message in Hostinger Sent. It
  is intentionally repeatable and never inserts a client-send audit row, marks
  an initial email as sent, or changes pipeline status
  (`app/(owner)/owner/leads/actions.ts:208-274`).
- A successful send moves `ready` to `email_sent`. Leads already farther along
  the demo pipeline keep their current stage while receiving the durable sent
  timestamp/template/Message-ID. This lets a prepared demo email be sent from
  `demo_ready` without incorrectly moving the lead backward.
- Confirmed provider bounces use `delivery_failed`, with the provider timestamp
  and a concise diagnostic in `delivery_failed_at` and
  `delivery_failure_reason`. These leads are not counted as contacted and never
  become follow-up-due (`lib/sales-leads.ts:23-39`). The detail drawer exposes
  both failure fields so the bad address can be corrected without treating a
  technical rejection as a prospect rejection
  (`components/owner/SalesLeadsTable.tsx:752-775`). Migration
  `20260825065654_sales_leads_delivery_failures.sql` introduced the fields and
  backfilled the nine confirmed current-address bounces known on 2026-08-25.
- The existing first-touch audit remains intentionally one-send-only. Correcting
  an address does not silently enable a resend; a future retry workflow must
  preserve the same explicit confirmation and concurrent-send safeguards
  (`supabase/migrations/20260817182240_sales_email_sends.sql:32-37`).
- Email-client HTML must encode body structure explicitly. Do not wrap escaped
  plain text in a `white-space: pre-wrap` container and assume blank lines will
  survive: Gmail collapsed all ten 2026-08-17 messages into one continuous
  paragraph. Split the normalized body on blank lines and render each escaped
  block as its own `<p>` (or use explicit `<br><br>`). Before sending, require
  multiple body paragraph tags ahead of the signature and inspect the rendered
  Sent copy. Merely confirming `text/html`, the CID logo, and signature markers
  does not validate readability.
- "Next Ready lead" follows the screen order: `status = 'ready'`, highest score
  first, then company name (`app/(owner)/owner/leads/page.tsx:15`).
- Before it was paused, the Codex weekday outreach worker ran at 10:15
  Europe/Vilnius. If the owner explicitly re-enables it, keep its recurrence as
  a direct weekday/hour/minute rule; an anchored `DTSTART` rule
  was active while the app and Mac were awake on 2026-08-06 but created no run.
  A missed batch must be checked against both Hostinger Sent and today's
  `status_updated_at` rows before any manual catch-up, preventing duplicates.
- Hostinger's send endpoint reports success as a structured top-level numeric
  HTTP status. Treat `204` as definitive success regardless of serialized JSON
  whitespace or an empty body, then proceed to Sent-folder verification. A
  whitespace-sensitive raw-response check stopped the 2026-08-07 worker after
  one valid send; the worker prompt now explicitly forbids that comparison.
- A transient Supabase lifecycle-update failure after a verified Sent copy must
  never trigger another email. Read the lead by id: continue if it is already
  `email_sent`; if it remains `ready`, retry the same conditional update once
  and verify it. Continue the batch after successful reconciliation, and stop
  only when the status remains unresolved. This prevents both duplicates and
  needless partial batches.
- Hostinger may accept a send with HTTP 204 before the new copy is searchable
  in `INBOX.Sent`. Verification therefore uses up to four searches across about
  20 seconds (initial, then short 3/5/10-second waits), without resending. Stop
  only when every bounded check fails; an immediate empty search is an indexing
  delay, not proof that delivery failed.
- Send the live row's `email_subject` and `email_body` snapshots unchanged from
  `hello@loqara.com` with the Loqara sender name and branded signature. Validate
  recipient, subject, and body before sending.
- Treat the lifecycle update as a post-send commit: confirm the exact recipient
  and subject in the provider's Sent folder, then conditionally change only that
  row from `ready` to `email_sent` with fresh `status_updated_at` and `updated_at`
  (`app/(owner)/owner/leads/actions.ts:18`). If delivery is not confirmed, leave
  the status untouched.
- After a follow-up is confirmed in Sent, move the row from `email_sent` to
  `follow_up_email`; this records the follow-up time using the same dedicated
  status timestamp. A follow-up status is not inferred from elapsed time.

## Prospect seeds

- LinkedIn list membership is only a discovery signal. Before import, qualify
  the company and role, resolve the canonical website, deduplicate against the
  existing pipeline, and retain the real country name and profile URL. Do not
  bulk-import a Sales Navigator list from title/geography alone.
- Email readiness is a separate qualification step. Mark a lead email-ready
  only when the address is published on the company's official website; prefer
  a generic business inbox, retain a named address only when the company itself
  publishes it, and never infer or guess an address from a domain.
- The first qualified LinkedIn batch retained 37 of 148 Lithuanian list members:
  one relevant buyer per company, an active official website, no email or phone
  harvesting, and normalized-domain/profile deduplication. Four retained sites
  exposed an existing chat widget and two could not be conclusively checked, so
  `has_chatbot` remains evidence rather than an import gate
  (`supabase/migrations/20260828104419_import_clean_lithuanian_linkedin_leads.sql:1-134`).
- The follow-on Latvia/Estonia Sales Navigator search was configured for
  1–200-person companies; Owner/Partner, CXO, Director, or Experienced Manager;
  Founder, Co-Founder, CEO, Owner, Managing Director, Head of Ecommerce, or
  Ecommerce Manager; and consumer-facing retail, apparel, grocery, furniture,
  personal care, sporting goods, medical, health-care, and hospitality
  industries. Person geography and company headquarters must both be filtered;
  the corrected search produced 589 discovery results. The qualified batch
  retained 100 active official sites (44 Latvia, 56 Estonia), no personal
  emails or phones, and no duplicate normalized hosts. Fourteen profile URLs
  loaded cleanly and were retained; the remaining rows keep the buyer and
  Sales Navigator provenance without fabricating a URL
  (`supabase/migrations/20260828114048_import_baltic_linkedin_leads.sql:1`).
- The same role, company-size, and industry filters were run for Lithuania with
  both person geography and company headquarters set to Lithuania. From 547
  discovery results, 182 unique companies were extracted from the first eight
  result pages. The follow-on batch retained 63 net-new companies with unique
  official domains, unique Sales Navigator profile URLs, a public
  official-site email on every row, and no detected chatbot. Three otherwise
  valid email-ready companies were excluded because a chatbot was detected.
  Migration `20260828135339_import_email_verified_lithuanian_linkedin_leads.sql`
  raised the live pipeline to 500 leads: 300 Default and 200 LinkedIn, with the
  LinkedIn set split 100 Lithuania / 100 Other
  (`supabase/research/lithuania_linkedin_email_verified.json:1`;
  `scripts/generate-lithuania-linkedin-email-import.mjs:1`).
- The original 37-lead Lithuania batch was later checked separately for
  outreach readiness. Official-site research verified 35 public business
  emails; LAJO baldai exposes only a contact form and Pilnatvės Sodas exposes
  phone/WhatsApp but no company email, so both remain blank rather than using a
  guessed address. Migration
  `20260831065717_enrich_existing_lithuanian_linkedin_emails.sql` updates only
  those 35 existing rows and preserves their lifecycle status
  (`supabase/research/lithuania_linkedin_existing_email_enrichment.json:1`).
- The 100 Latvia/Estonia LinkedIn leads were checked separately on 2026-08-31.
  Official-site research found a published business address for all 100 rows
  (44 Latvia, 56 Estonia). Generic company inboxes are preferred; the small
  number of branch, property, or named addresses are retained only where the
  official company site itself publishes them. Owner-approved and applied live
  on 2026-08-31 via `20260831160910_enrich_baltic_linkedin_emails.sql` (matched
  by row UUID from the evidence artifact,
  `supabase/research/baltic_linkedin_existing_email_enrichment.json:1`).
  LinkedIn email coverage is now 198/200 — the two intentional Lithuanian
  blanks (LAJO baldai, Pilnatvės Sodas) remain.
- Platform qualification was subsequently completed for all 200 LinkedIn leads
  and applied live. The verifier uses first-party HTML, headers/cookies, native
  endpoint probes, and rendered assets for blocked sites. WooCommerce now
  requires multiple active storefront signals or an active Store API plus a
  storefront signal; a generic WordPress or plugin mention is not sufficient.
  The final set contains 72 native Loqara commerce platforms (WooCommerce,
  Shopify, Magento, or Verskis), 55 storefronts needing a feed/API/custom
  connector, and 73 content/service sites that can use the normal knowledge-base
  assistant without catalog integration. In particular, 1STOP is correctly
  recorded as `Custom (Laravel)`, not WooCommerce
  (`scripts/research-sales-lead-platforms.mjs:1`;
  `supabase/research/linkedin_200_platform_verified.json:1`;
  `supabase/migrations/20260831102808_update_linkedin_lead_platforms.sql:1`).
- Researched batches belong in timestamped, idempotent migrations with
  normalized-host and normalized-email guards plus
  `on conflict (website) do nothing`. Exact batch-size assertions should make
  the migration fail atomically if live data changed during research
  (`supabase/migrations/20260729201426_add_59_verified_sales_leads.sql:1`).
- Resolve suggested domains to their canonical storefront before inserting. A
  supplied alias or typo can otherwise bypass the unique website constraint; the
  July 2026 furniture batch resolved `sofaformabaldai.lt` to `sofaforma.lt` and
  detected that Guru Baldai was already present rather than inserting it twice.
- Public-web prospecting uses first-party evidence for the final row. The
  verifier checks the homepage plus same-origin contact/about pages, extracts
  public business contacts, detects common commerce platforms and chat widgets,
  and records canonical redirects (`scripts/research-sales-leads.mjs:1`). Search
  results can discover candidates, but do not qualify a row by themselves.
- The 2026-07-29 research batch added 59 Lithuania-focused small/mid-market
  specialists across furniture, cycling, beauty, HVAC, home improvement, pets,
  fishing, automotive, and security. All 59 landed as `ready`, with a public
  email, prepared copy, opt-out, and no chat widget detected in public HTML
  (`supabase/migrations/20260729201426_add_59_verified_sales_leads.sql:1`).
- Platform compatibility is part of qualification, not a reason to invent an
  integration. WooCommerce, Shopify, Magento, and Verskis can use Smart product
  search directly; PrestaShop/CS-Cart/custom sites should explicitly say that a
  feed or new integration needs verification. See [commerce](commerce.md).
- An existing owner demo is strong qualification evidence, but it does not move
  the prospect's lifecycle by itself. Store the demo/catalog proof in the lead
  research and keep status `ready` until outreach or a buyer response occurs
  (`supabase/migrations/20260720130000_add_mobel_sales_lead.sql:1`).

_Last verified: 2026-09-04 (source tabs, LinkedIn country grouping, 200 localized prepared emails, official-site email coverage, and live platform classification for every LinkedIn lead)._
