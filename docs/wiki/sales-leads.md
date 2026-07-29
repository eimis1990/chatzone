# Sales leads

Owner-only outbound pipeline: researched prospects, prioritization, prepared
emails, and manual status progression.

## Data and flow

- `/owner/leads` reads every `sales_leads` row, ordered by score descending and
  then name (`app/(owner)/owner/leads/page.tsx:15`). The table was introduced in
  `supabase/migrations/0036_sales_leads.sql:8`; `has_chatbot` was added in
  `0037_sales_leads_has_chatbot.sql:7`.
- The client UI filters locally by text, vertical, status, and chatbot presence
  (`components/owner/SalesLeadsTable.tsx:297`). Status changes are optimistic,
  persist through `setLeadStatus`, update `status_updated_at`, and roll back both
  status and timestamp on error (`:313`; `app/(owner)/owner/leads/actions.ts:18`).
- The route heading follows the same compact title/subtitle pattern as other
  owner pages (`app/(owner)/owner/leads/page.tsx:23`). Desktop uses a flat,
  score-first data grid with platform in its own column; below `md`, leads become
  stacked cards rather than a horizontally overflowing table
  (`components/owner/SalesLeadsTable.tsx:421`, `:485`). City is intentionally
  detail-only (`:591`).
- Score is represented by the same compact percentage tile in the table, mobile
  list, and detail panel (`components/owner/SalesLeadsTable.tsx:98`). Status
  colors are lifecycle semantics: neutral Ready, amber Email sent, blue
  Follow-up email, red Rejected, green Accepted, and accent-orange Our client
  (`:66`).
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

## Prepared-email conventions

- `email_subject` and `email_body` are operational snapshots stored on each
  lead, not generated at send time. Existing-chatbot leads should acknowledge
  the incumbent respectfully and give a concrete reason to compare.
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
  `openLead.email_body` (`components/owner/SalesLeadsTable.tsx:559`, `:644`).
  The separate mail-app action is allowed to include recipient, subject, and
  body (`:560`). Do not reintroduce a `Tema:` prefix into clipboard copy.
- Manual name/URL/email signature lines do not belong in stored bodies. Webmail
  adds the configured signature, but API sends must append the same branded
  signature explicitly.

## Operational sending

- "Next Ready lead" follows the screen order: `status = 'ready'`, highest score
  first, then company name (`app/(owner)/owner/leads/page.tsx:15`).
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

- Researched batches belong in timestamped, idempotent migrations with
  `on conflict (website) do nothing`, so records inserted into the live pipeline
  during research are not duplicated when deployment later applies the migration
  (`supabase/migrations/20260720120000_add_furniture_sales_leads.sql:1`).
- Resolve suggested domains to their canonical storefront before inserting. A
  supplied alias or typo can otherwise bypass the unique website constraint; the
  July 2026 furniture batch resolved `sofaformabaldai.lt` to `sofaforma.lt` and
  detected that Guru Baldai was already present rather than inserting it twice.
- Platform compatibility is part of qualification, not a reason to invent an
  integration. WooCommerce, Shopify, Magento, and Verskis can use Smart product
  search directly; PrestaShop/CS-Cart/custom sites should explicitly say that a
  feed or new integration needs verification. See [commerce](commerce.md).
- An existing owner demo is strong qualification evidence, but it does not move
  the prospect's lifecycle by itself. Store the demo/catalog proof in the lead
  research and keep status `ready` until outreach or a buyer response occurs
  (`supabase/migrations/20260720130000_add_mobel_sales_lead.sql:1`).

_Last verified: 2026-07-29 (live schema and all 241 prepared email bodies)._
