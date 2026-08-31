# Organic landing-page funnel report

Implementation and production-verification record for Phase 0 Task 0.4 in the
[search-visibility program](../superpowers/plans/2026-08-25-search-visibility-growth.md).

## Funnel definition

| Stage | Source |
| --- | --- |
| Public visit | GA4/Vercel automatic page view |
| Engaged visit | GA4 engaged session |
| CTA click | `get_started_cta_clicked` |
| Dialog open | `get_started_opened` |
| Signup start | `signup_started` (first real form edit per opening) |
| Submit attempt | `signup_submitted` |
| Recorded signup | `signup_succeeded` only when the API inserted a new row |
| Failed submit | `signup_failed` with a bounded reason |

Every custom funnel event carries the same dimensions:

- `landingPath`
- `acquisitionSource`
- `acquisitionMedium`
- `referrerHost`
- `campaign`
- `ctaSource`

The owner signup CSV contains those fields plus the cleaned referrer, UTM
content, and first-touch timestamp. Honeypot, implausibly fast, and duplicate
submissions return success to the visitor but do not emit `signup_succeeded`.

## Attribution rules

- First touch is retained in browser local storage for 90 days.
- Only public marketing routes can create it.
- A landing URL contributes its pathname and explicit UTM fields. Its query,
  fragment, `utm_term`, ad click IDs, and unrelated parameters are discarded.
- An external referrer contributes origin + pathname only. Its query and fragment
  are discarded, so search terms are never retained.
- Recognized search engines use medium `organic`; recognized answer engines use
  `ai_referral`; other external hosts use `referral`; no referrer is `direct / none`.
- An existing valid first touch wins over later visits and campaigns.

## GA4 report setup after deployment

In GA4 Admin, register event-scoped custom dimensions for `landingPath`,
`acquisitionSource`, `acquisitionMedium`, `referrerHost`, `campaign`, and
`ctaSource`. Then create an Explore funnel with:

1. Session start or page view.
2. `get_started_cta_clicked`.
3. `get_started_opened`.
4. `signup_started`.
5. `signup_succeeded`.

Break down by `landingPath`, then `acquisitionSource` and
`acquisitionMedium`. Add `engaged sessions` alongside visits and conversion
events. Use an `acquisitionMedium = organic` segment for the primary SEO report;
keep `ai_referral` separate rather than merging it with search.

## Production acceptance test

- [x] Apply `20260826085019_signup_acquisition_attribution.sql` before deploying
      the application code.
- [x] Deploy application commit `94a9e4b` and confirm the live public bundle
      contains the attribution and funnel event code.
- [x] Register the six GA4 custom dimensions above.
- [x] Open a public article with a controlled URL such as
      `?utm_source=seo_test&utm_medium=organic&utm_campaign=phase0` in a clean
      browser profile.
- [x] Click Get Started, edit one field, and submit a clearly labeled internal
      test address.
- [x] Confirm the CTA click, dialog open, signup start, submit, and recorded-
      signup events in GA4 Realtime. The first deliberately too-fast attempt
      produced no `signup_succeeded`; the valid delayed attempt produced exactly
      one recorded-signup event, matching the API/DB result.
- [x] Confirm the owner signup card and CSV show the article pathname and
      `seo_test / organic`.
- [x] Delete the internal test signup after verification.
- [x] Confirm `/owner`, `/app`, `/embed`, `/present`, and `/login` traffic is
      absent from the public-site analytics stream.
- [x] Record the deployment SHA and production evidence in the main program log.

### Production evidence — 2026-08-26

- GA4 property `https://www.loqara.com`: six event-scoped custom dimensions
  registered and Explore `Organic landing-page signup funnel` created with an
  `Organic funnel` tab, organic-medium event segment, five funnel stages, and
  landing-path breakdown. Standard Explore data is still subject to GA4's normal
  processing delay.
- GA4 Realtime showed the controlled article as the only active public page and
  received `get_started_cta_clicked`, `get_started_opened`, `signup_started`,
  `signup_submitted`, and one `signup_succeeded`. Opening the authenticated owner
  page did not create a second public page view or active public-site user.
- Production signup `hello+seo-test-20260826@loqara.com` stored CTA source `nav`,
  landing path `/blog/best-ai-chatbot-for-ecommerce`, acquisition
  `seo_test / organic`, campaign `phase0`, and the first-touch timestamp. The
  owner card and `loqara-signups-2026-08-26.csv` exposed the same fields.
- Application/deployment commit: `94a9e4b` on `main`.

The production journey, report setup, and test-data cleanup pass Task 0.4's
acceptance criterion. After explicit owner confirmation, the labeled test signup
was deleted and a production query confirmed zero matching rows remain.
