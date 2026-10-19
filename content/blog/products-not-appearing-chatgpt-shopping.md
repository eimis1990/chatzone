---
title: "Why your products don’t appear in ChatGPT Shopping (and how to fix it)"
description: "Diagnose missing products in ChatGPT Shopping across Shopify Catalog, direct feeds, crawler access, eligibility, variants, freshness, relevance, and market setup."
date: 2026-10-19
topic: ai-search-visibility
author: Eimantas Kudarauskas
authorRole: Founder
image: /blog/products-not-appearing-chatgpt-shopping.webp
related: how-to-get-products-recommended-by-chatgpt, openai-product-feed-ecommerce, product-variants-ai-shopping
---

You ask ChatGPT for a product your store clearly sells. Competitors appear; yours does not. The natural reaction is to change the title, add more keywords, or submit the feed again.

That is often the wrong first move. A missing product can be blocked at several different layers: merchant eligibility, source access, feed processing, product-level data, market availability, or relevance to the exact request. The fix depends on which layer failed.

<blockquote class="quick-answer">A product may not appear in <strong>ChatGPT Shopping</strong> because it is ineligible, unavailable to OpenAI’s product sources, rejected during feed processing, blocked from crawling, mapped to the wrong variant or market, stale, or simply not selected for that request. Diagnose source eligibility first, product data second, and prompt-level relevance last. Inclusion is never guaranteed.</blockquote>

<div class="takeaways">
<p class="takeaways-title">Quick take</p>
<ul>
<li><strong>Identify the source path:</strong> Shopify Catalog, an approved direct feed, and public web discovery have different checks.</li>
<li><strong>Eligibility is not selection:</strong> a valid product can still be absent from one answer.</li>
<li><strong>Test the exact variant:</strong> price, availability, image, URL, size, and color may differ at row level.</li>
<li><strong>Crawlability includes images:</strong> robots, WAFs, CDNs, login gates, and bot challenges can break access.</li>
<li><strong>Change one layer at a time:</strong> record the product, prompt, market, date, and correction before retesting.</li>
</ul>
</div>

## How does a product reach ChatGPT Shopping?

There is no single universal submission route.

For Shopify merchants, OpenAI says product data is integrated through Shopify Catalog. For approved non-Shopify partners, the [OpenAI Agentic Commerce onboarding guide](https://developers.openai.com/commerce/guides/get-started) provides file-upload and API feed paths. ChatGPT shopping research can also use publicly available retail information.

That creates three diagnostic routes:

| Route | First place to check | Common failure |
| --- | --- | --- |
| Shopify Catalog | Shopify **Sales channels > Agentic** | Store or product is ineligible, channel access is off, or mapping is incomplete |
| Approved direct feed | Feed configuration, latest processing result, and product record | Missing fields, invalid values, wrong variant, stale upload, or unsupported market setup |
| Public web discovery | Product page, robots.txt, CDN/WAF logs, and rendered data | Page or image is blocked, unavailable, thin, inconsistent, or difficult to parse |

Do not apply direct-feed instructions to a normal Shopify store without confirming that a separate feed integration actually exists. OpenAI’s current [Shopping with ChatGPT documentation](https://help.openai.com/en/articles/11128490-improved-shopping-results-from-chatgpt-search) says individual Shopify merchants do not need additional work to send a direct feed because Shopify Catalog is already integrated.

## The seven layers to diagnose

### 1. Did the request trigger a shopping result?

Not every product-related prompt produces a shopping carousel. A broad informational request—“How does a heat-pump dryer work?”—may be answered with articles rather than product cards. A commercial request—“Find a quiet 9 kg heat-pump dryer under €900”—contains product type, constraint, and budget.

Test several natural, purchase-oriented queries. Record:

- the complete prompt;
- market and account context;
- whether any products appeared;
- which products and merchants appeared;
- whether the query was exact-brand, category, comparison, or problem-led;
- the date, because product availability and platform behavior change.

One missing result is not enough to diagnose a catalog failure. If no products appear for anyone, the prompt may not have triggered a shopping experience.

### 2. Is the merchant and product eligible?

OpenAI’s [Commerce Policies](https://openai.com/policies/commerce-policies/) apply to merchant participation and product listings. They prohibit categories and practices including misrepresented pricing or availability, counterfeit goods, fake reviews, hidden fees, and misleading return terms. OpenAI can remove listings or restrict participation.

Shopify adds its own Catalog requirements. A normal eligible product needs a title, image, non-zero price, public product URL, publication to a supported channel, and an allowed category. Products marked Unlisted or hidden from search engines are excluded from Shopify Catalog. Store plan, public status, account standing, verification, and policy compliance also matter ([Shopify Catalog requirements](https://help.shopify.com/en/manual/shopify-catalog/requirements)).

Check eligibility before editing keywords. A perfect description cannot override a prohibited category, hidden product, unavailable offer, or ineligible merchant.

### 3. Can OpenAI access the product page and images?

For public web inclusion, OpenAI says sites should allow **OAI-SearchBot** and ensure the host or CDN allows traffic from OpenAI’s published crawler IP ranges ([ChatGPT Search help](https://help.openai.com/en/articles/9237897-chatgpt-search)).

Check more than robots.txt:

- does the canonical product URL return HTTP 200 without login?
- does it work from the intended market rather than redirecting to a blank locale page?
- does robots.txt allow OAI-SearchBot on the product and image paths?
- does a CDN, firewall, rate limit, CAPTCHA, or JavaScript challenge return 403 or an interstitial?
- are the main images public and stable?
- does the server-rendered page expose product facts, or do they appear only after fragile client-side requests?
- does a variant URL resolve to that variant rather than resetting to the parent?

OpenAI’s [crawler-access guidance](https://help.openai.com/en/articles/20001243-advertiser-guidance-for-allowing-openai-web-crawlers) specifically warns that product image URLs can be blocked by a firewall or CDN even when the page itself works. Inspect server and CDN logs instead of testing only in a signed-in browser.

### 4. Did the catalog or feed accept the exact product?

For Shopify, open **Sales channels > Agentic**. Confirm:

1. the store is eligible for Shopify Catalog;
2. Shopify Catalog access for ChatGPT is enabled;
3. the included product count is plausible;
4. the missing product appears in the Catalog set;
5. custom data mapping and variant grouping are correct.

For an approved direct integration, a successful file transfer does not prove the rows were processed. Check the latest upload’s terminal status, accepted/rejected counts, and diagnostics. Validate the exact `item_id` or variant record after processing.

Typical feed failures include:

- a required column is missing;
- an enum, date, URL, price, or currency is invalid;
- multiple files contain the same product;
- item IDs change between uploads;
- a parent product is submitted instead of a purchasable variant;
- the upload is still processing, skipped, or completed with errors;
- a later full upload overwrote a correction made through an update API.

Our [OpenAI product-feed checklist](/blog/openai-product-feed-ecommerce) covers the current field model and validation routine in detail.

### 5. Does the product record match the visible offer?

A product can be technically present but unreliable.

Compare the submitted or syndicated record with the page:

| Fact | What must agree |
| --- | --- |
| Identity | Item ID consistently represents the same purchasable item |
| Variant | Size, color, material, configuration, image, and URL resolve to the intended option |
| Price | Amount, currency, sale timing, and visible page price match |
| Availability | In-stock, out-of-stock, preorder, and discontinued state are current |
| Seller | Merchant name and destination domain are consistent |
| Images | Main image depicts the exact item or variant |
| Policies | Returns, warnings, shipping conditions, and seller terms are public and accurate |

OpenAI’s current [feed best practices](https://developers.openai.com/commerce/guides/best-practices) say variant-specific title, URL, description, media, availability, and price should remain specific when they differ. A single parent row for every size or color hides the state ChatGPT needs to recommend an actual option.

See our [product variants for AI shopping guide](/blog/product-variants-ai-shopping) for stable IDs, group relationships, and variant landing pages.

### 6. Is the product available in the tested market?

A product can exist globally in the merchant’s system but remain ineligible for the buyer’s country, currency, delivery destination, or current integration.

The stable [OpenAI file-upload specification](https://developers.openai.com/commerce/specs/file-upload/products) currently says standard OpenAI-format uploads target the United States unless OpenAI confirms additional market configuration. Shopify also describes current Agentic Storefronts availability in terms of eligible stores and supported buyer/channel rollouts.

Verify:

- registered target countries for the integration;
- supported currency and price;
- whether the merchant ships to the shopper’s location;
- local product restrictions;
- whether the product page redirects or hides the offer by region;
- whether a country field is actually used by the configured feed rather than merely present in the file.

Do not infer worldwide eligibility from a EUR price, international domain, or `target_countries` column that the integration has not been configured to process.

### 7. Is the product relevant enough for the specific request?

Passing every previous check makes a product **eligible for consideration**, not guaranteed to appear.

OpenAI says ChatGPT selects products based on perceived relevance to the shopper’s intent and can consider structured metadata, public information, price, reviews, availability, and other context. It also says merchant ordering can consider availability, price, merchant quality, and whether the seller is the maker or primary seller. Not all eligible products are shown.

Test whether the product record contains the facts embedded in the request:

- “wide-fit” needs a supported fit attribute, not only a lifestyle description;
- “fits a 16-inch laptop” needs a compartment dimension or supported compatibility claim;
- “quiet” needs a measured noise value and scope;
- “fragrance-free” needs a verified formulation claim;
- “arrives by Friday” needs current fulfillment information, not a generic shipping slogan.

Avoid adding claims simply to match prompts. If evidence is missing, improve the product source or leave the constraint unknown.

## A 30-minute troubleshooting workflow

Use one representative product rather than changing the whole catalog.

### Step 1: Create the incident record

Write down the SKU or variant ID, canonical URL, source path, test market, exact prompt, observed result, and date.

### Step 2: Check eligibility and source access

For Shopify, verify Catalog eligibility and ChatGPT access. For a direct feed, verify approved onboarding and latest upload status. For public web discovery, verify OAI-SearchBot access and page/image responses.

### Step 3: Reconcile the product facts

Compare title, description, variant, image, URL, price, currency, availability, brand, and policy fields with the visible page.

### Step 4: Test one qualifying attribute

Choose the most important fact in the prompt. Confirm it is explicit, accurate, and attached to the exact item. Do not rewrite every field.

### Step 5: Correct one cause

Fix the eligibility setting, crawler block, rejected feed value, mapping, variant row, or missing attribute. Record the exact change and time.

### Step 6: Allow processing, then retest a prompt set

Retest several stable prompts after the relevant catalog, crawler, or feed has processed the change. Compare like with like. ChatGPT results are dynamic, so repeated identical output is not guaranteed.

### Step 7: Escalate with evidence

If a product remains absent, provide the platform or partner with the store domain, product URL, item ID, source/feed ID, market, timestamps, upload diagnostics, HTTP evidence, and prompts already tested. “My products do not show” is difficult to investigate; a documented product path is not.

## What should you not do?

### Do not stuff titles with prompt phrases

Unreadable titles can damage the customer experience and still fail to express structured attributes accurately.

### Do not submit the same product through uncontrolled duplicates

Duplicate feeds, regenerated IDs, conflicting prices, and separate parent/variant records can make identity and freshness worse.

### Do not confuse an organic product result with an ad

OpenAI says product results are selected independently and are separate from ads. Advertising eligibility and product discovery have different controls.

### Do not change five variables at once

If you alter crawler rules, feed fields, product titles, variant grouping, and price together, you will not know which correction mattered—or which one introduced a new mismatch.

### Do not promise placement

OpenAI does not guarantee that an eligible product will appear for a specific prompt, position, account, or market. A useful service can improve inputs and diagnose blockers; it cannot sell certainty that the platform does not offer.

## How do you measure improvement?

Track the path rather than only screenshots:

- percentage of intended products eligible and accepted;
- rejected-row and warning counts;
- crawler success rate for product and image URLs;
- mismatch rate between feed and landing page;
- important query coverage in a fixed prompt sample;
- ChatGPT referral sessions and product destinations;
- assisted orders or conversions where attribution is available;
- stale price, stock, or discontinued-product incidents;
- share of failures with a known cause.

Use referral tracking consistently. OpenAI also says ChatGPT Search referral URLs include `utm_source=chatgpt.com`, while direct-feed integrations can use durable attribution parameters where supported.

## Where does Loqara fit?

Loqara does not enroll merchants in OpenAI commerce, upload direct feeds to OpenAI, fix Shopify Catalog eligibility, or guarantee ChatGPT Shopping placement.

Loqara helps customers once they reach the merchant’s own storefront. It can search supported connected catalogs, answer from approved product and policy knowledge, preserve context, capture leads, and hand uncertain questions to a person.

The useful overlap is diagnostic: shopper conversations reveal missing attributes, recurring comparison questions, ambiguous variants, and policy gaps. Those findings can improve both the onsite assistant and the product source supplied to external discovery systems.

## Frequently asked questions

### Does a valid product feed guarantee ChatGPT Shopping visibility?

No. A valid feed means the product data passed the relevant ingestion requirements. Selection still depends on product and merchant eligibility, availability, market setup, the shopper’s intent, relevance, quality signals, and the experience’s current behavior.

### Do Shopify merchants need to apply for an OpenAI direct feed?

OpenAI says Shopify merchant data is already integrated through Shopify Catalog and individual Shopify merchants do not need extra direct-feed work for that route. Check Shopify’s **Sales channels > Agentic** area for eligibility, product count, mapping, and ChatGPT access.

### How long does it take for a correction to appear?

There is no universal time. It depends on whether the change must propagate through Shopify Catalog, an OpenAI feed upload, an API update, a web recrawl, or another provider. Record the submission time and wait for the relevant processing state before testing again.

### Can robots.txt stop products from appearing?

It can block OAI-SearchBot from crawling the page or image. A CDN, firewall, bot challenge, login gate, rate limit, or geographic rule can also block access even when robots.txt allows it. Catalog and feed sources may still supply some data, so identify the source path before drawing a conclusion.

### Why does ChatGPT show the product but not my store as the merchant?

Multiple merchants may sell the same product. OpenAI says merchant ordering can consider availability, price, quality, and whether the seller is the maker or primary seller. Verify that your offer is current, reachable, accurately identified, eligible, and competitive without misrepresenting price or terms.

### Should I add more keywords to the product description?

Add missing factual attributes in natural language and structured fields where appropriate. Do not repeat prompt phrases or invent benefits. A specific dimension, material, compatibility rule, measured performance fact, or included component is more useful than generic keyword repetition.

### Can Loqara make my products appear in ChatGPT Shopping?

No. Loqara is an onsite commerce assistant, not an OpenAI merchant-enrollment or placement service. It can help expose the customer questions and missing product facts that the merchant should improve at the source.

---

**The practical next step:** choose one missing product and trace it through all seven layers. When the source, eligibility, exact variant, page access, market, freshness, and qualifying attributes are known, the problem becomes a testable catalog issue instead of a vague ranking mystery.

[Try Loqara free](/#get-started) to learn which product questions shoppers still cannot answer after they reach your store.
