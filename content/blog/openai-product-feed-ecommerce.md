---
title: "OpenAI product feeds for e-commerce: the 2026 merchant checklist"
description: "Prepare an OpenAI product feed for ChatGPT shopping with the required fields, validation checks, update rules, and honest limits merchants need in 2026."
date: 2026-08-05
topic: ai-search-visibility
author: Eimantas Kudarauskas
authorRole: Founder
image: /blog/openai-product-feed-ecommerce.webp
related: how-to-get-products-recommended-by-chatgpt, product-variants-ai-shopping, product-qa-ai-shopping
---

ChatGPT can now help shoppers discover, compare, and refine products inside a conversation. For a merchant, that creates a practical data question:

> Is the product information complete, current, and structured well enough for an external shopping system to use without guessing?

An OpenAI product feed is one answer. It is not a magic ranking file, and publishing a feed does not guarantee that a product will appear for a particular prompt. It is a structured way to submit the facts that a shopping experience needs.

<blockquote class="quick-answer">An <strong>OpenAI product feed</strong> is a structured catalogue supplied for ChatGPT commerce experiences. A reliable feed gives every product or variant a stable identifier, accurate title, description, URL, image, brand, price, currency, and availability. Merchants should add useful variant, policy, Q&amp;A, and relationship data, validate every row, and keep dynamic facts synchronized.</blockquote>

<div class="takeaways">
<p class="takeaways-title">Quick take</p>
<ul>
<li><strong>One row means one purchasable item or variant:</strong> do not collapse different sizes, colours, prices, or stock states into an ambiguous row.</li>
<li><strong>Freshness is part of correctness:</strong> an elegant description cannot compensate for stale price or availability.</li>
<li><strong>Google-compatible does not mean automatic:</strong> OpenAI must confirm that the registered feed can use that compatibility path.</li>
<li><strong>Optional fields can carry the decision:</strong> variants, returns, Q&amp;A, related products, and compliance data answer questions the basic title cannot.</li>
<li><strong>Feed access and eligibility can change:</strong> check the current OpenAI merchant documentation before implementation.</li>
</ul>
</div>

## What is an OpenAI product feed?

An OpenAI product feed is a structured catalogue that OpenAI can ingest for commerce experiences. OpenAI's current stable file-upload specification says its purpose is to help ChatGPT index and display products with up-to-date price and availability ([OpenAI, Products feed specification](https://developers.openai.com/commerce/specs/file-upload/products)).

The feed is not the same thing as the product page. The page remains the customer-facing source where claims, price, stock, policies, and purchase controls must be clear. The feed gives the receiving system a consistent record of those visible facts.

It is also separate from an on-site AI shopping assistant. A [product recommendation chatbot](/blog/ai-product-recommendation-chatbot) helps visitors who are already on the merchant's store. An OpenAI feed concerns product discovery in OpenAI commerce surfaces. A merchant may benefit from both, but one does not configure the other.

OpenAI describes its stable schema as the supported file-upload path and labels the separate draft schema as planning material rather than a production integration. Because onboarding and commerce availability can vary, merchants should use the current documentation and the feed configuration OpenAI provides to them—not a copied template from an old article.

## Is an OpenAI feed the same as a Google Merchant Center feed?

Not exactly.

OpenAI has its own stable schema, with fields such as `item_id`, `url`, `image_url`, `group_id`, and `variant_dict`. Its documentation also describes a Google-compatible path for confirmed registered feeds. In that path, OpenAI can map familiar fields such as `id`, `link`, `image_link`, and `item_group_id` into its stable product model.

The important qualification is **confirmed**. OpenAI states that merchants may use the compatible format when OpenAI confirms the registered feed supports it. The compatibility path accepts delimited UTF-8 files and does not represent every Google program, market, field, or file format ([OpenAI, Google-compatible product feeds](https://developers.openai.com/commerce/specs/file-upload/products#google-compatible-product-data-feeds)).

| Question | OpenAI stable schema | Google-compatible path |
| --- | --- | --- |
| Product ID | `item_id` | `id` |
| Product page | `url` | `link` |
| Main image | `image_url` | `image_link` |
| Variant group | `group_id` | `item_group_id` |
| Core file format | Follow the registered OpenAI specification | Confirmed CSV, TSV, TXT, or supported compressed delimited file |
| Can every Google field be reused? | Not applicable | No; unsupported columns may be ignored |

Do not rename columns casually or assume that a feed accepted by one service is complete for another. Maintain one canonical catalogue model, then export each destination's supported representation.

## Which fields belong in the minimum viable feed?

For OpenAI's native stable schema, the currently documented core includes eligibility controls plus product, merchant, image, price, and availability information. The Google-compatible core requires `id`, `title`, `description`, `link`, `image_link`, `availability`, `price`, and `brand` on every row.

Use this merchant checklist:

| Field group | What to verify | Why it matters |
| --- | --- | --- |
| Identity | Stable item ID; correct GTIN or MPN where available | Prevents products and variants from being merged or recreated accidentally |
| Description | Accurate title, plain-language description, brand, category | Establishes what the item is and which needs it can satisfy |
| Destination | Canonical product or variant URL returning HTTP 200 | Gives the shopper a valid next step |
| Media | Public main image plus useful additional views | Supports visual discovery and comparison |
| Commercial facts | Price with ISO currency, sale timing, current availability | Prevents misleading offers and dead-end recommendations |
| Variants | Stable group plus exact size, colour, material, or custom option | Helps the system recommend a purchasable combination |
| Merchant | Seller identity, seller URL, and required checkout policies | Makes the seller and transaction boundary clear |
| Decision support | Returns, Q&amp;A, warnings, related products, reviews where valid | Answers the questions that determine whether an item fits |

OpenAI requires product URLs to resolve successfully and documents `item_id` as unique per variant and stable over time. It also requires a main image, price with currency, and availability in the native schema ([OpenAI, feed reference](https://developers.openai.com/commerce/specs/file-upload/products)).

## How should a merchant prepare the feed?

### 1. Start from a canonical product source

Choose the store database, product information management system, or other governed source that owns current product facts. Do not build the feed from a spreadsheet that nobody updates after launch.

Document which system owns each field:

- commerce platform: ID, URL, price, sale price, stock;
- product information system: title, description, material, dimensions;
- policy source: returns, warnings, merchant details;
- approved content workflow: product Q&amp;A and relationships.

If two systems disagree, resolve the conflict before export. A feed should not become a new place where contradictory facts are hidden.

### 2. Give every purchasable variant its own identity

A blue shoe in size 42 and the same shoe in size 43 can have different stock. They therefore need distinct item IDs even when they share a product group.

OpenAI recommends `group_id` and variant attributes for listings with variations. Its Google-compatible mapping turns `item_group_id` into the shared group and uses colour, size, material, and other attributes in the normalized variant data. The companion guide explains [how to structure product variants for AI shopping](/blog/product-variants-ai-shopping).

### 3. Verify the landing experience

Each submitted URL should:

- return HTTP 200 without authentication;
- open the intended product or preselected variant;
- show the same title, image, price, currency, and availability as the feed;
- allow the shopper to understand and select the item;
- state important warnings or conditions visibly;
- avoid redirect chains to unrelated categories or search pages.

The feed should describe what the shopper can actually buy—not an internal parent record with no purchasable state.

### 4. Treat images as product data

Use a clear main image that represents the exact item. Add useful secondary views when colour, texture, scale, included parts, or fit influence the decision. Do not attach an image of a premium bundle to a base product unless the page clearly distinguishes what is included.

OpenAI's stable schema currently accepts a main `image_url`, additional image URLs, video, and a 3D model URL. Availability of a media field does not make a weak asset useful: accurate subject matter and consistent URLs still matter.

### 5. Add decision fields, not marketing filler

The useful optional fields are those that resolve a real choice:

- variant attributes;
- return window and policy link;
- warnings and restrictions;
- frequently asked product questions;
- related products marked as an accessory, substitute, required part, set component, or commonly bought item;
- verified review totals and ratings;
- shipping and pickup information where supported.

Do not manufacture values to fill every column. Unknown is better than a plausible invention.

<figure>
<img src="/blog/openai-product-feed-checklist-diagram.webp" alt="A product record passes through identity, variant, price and stock, policy, and validation gates before reaching an AI shopping surface" width="1200" height="800" loading="lazy" />
<figcaption>A reliable feed is a controlled path from governed store data to validated commerce records—not a one-time catalogue dump.</figcaption>
</figure>

## How often should product feeds be updated?

Update dynamic facts as quickly as the store can support accurately. Price, sale periods, stock, pre-order dates, expired products, and URLs can change independently from descriptive content.

OpenAI's specification requires an availability date for pre-orders and documents availability as a required field. Its March 2026 ChatGPT shopping update specifically highlighted improvements to product-data coverage, freshness, and speed ([OpenAI, ChatGPT release notes](https://help.openai.com/en/articles/6825453-chatgpt-release-notes)). That makes feed freshness an operational requirement, not an annual SEO task.

A practical monitoring routine checks:

- export completed at the expected time;
- row count changed within an expected range;
- every required column exists;
- duplicate item IDs are rejected;
- prices contain the correct currency;
- product and image URLs return successfully;
- sale dates and pre-order dates are valid;
- discontinued items are removed or marked correctly;
- a sample of feed values matches the visible page.

Alert on failures. A silently stale feed is worse than a visibly failed export because staff may assume the data remains current.

## What are the most common feed mistakes?

### One parent row for many different variants

This hides which size, colour, or configuration is actually available. Submit one row per variant and connect them with a stable group identifier.

### Reusing or changing IDs

An item ID should represent the same item over time. Do not regenerate IDs during every export or recycle a discontinued product's ID for something new.

### Price or stock disagrees with the page

Dynamic data should share the same source and update path. Test sale boundaries, currencies, regional values, and out-of-stock transitions.

### Sending a Google feed without confirmation

Google compatibility is a documented OpenAI path, but only for registered feeds OpenAI confirms. It is not permission to upload an arbitrary Google XML or spreadsheet to an unspecified endpoint.

### Assuming accepted means recommended

Validation means the record met the ingestion rules. It does not promise visibility, ranking, traffic, or sales for a prompt. OpenAI states that shopping results are selected using factors including relevance and product context; merchants should avoid making guaranteed-placement claims.

### Treating optional data as a place for unsupported claims

Q&amp;A, relationships, popularity, reviews, and warnings must be real, current, and governed. Do not create fake reviews, false scarcity, or a relationship between products merely to influence recommendations. OpenAI's commerce policies prohibit deceptive merchant practices ([OpenAI, Commerce policies](https://openai.com/policies/commerce-policies/)).

## How do you test a feed before relying on it?

Use three layers of tests.

### Structural tests

- correct delimiter and UTF-8 encoding;
- one header row;
- exact field names for the chosen schema;
- one item or variant per row;
- no duplicate stable IDs;
- valid enums, dates, currencies, and URLs.

### Truth tests

Select representative products and compare the export with the live store. Include:

- a normal in-stock product;
- a sale item;
- an out-of-stock variant beside an in-stock sibling;
- a pre-order;
- a product without a GTIN;
- a product with a special return rule;
- a discontinued or redirected URL.

### Shopper-question tests

Ask questions whose answers depend on different fields:

- “Is the blue version available in size 42?”
- “Which option is under €100?”
- “Can this be returned after opening?”
- “Is this cable required for the device?”
- “Show me the waterproof version, not merely a similarly named product.”

The goal is not to prove that one prompt always returns the merchant. It is to determine whether the supplied facts support an accurate answer when the product is considered.

## What can Loqara do—and what is separate?

Loqara provides an on-site conversational agent for connected stores. It can search supported product catalogues, answer from approved product and knowledge sources, preserve context, and hand uncertain questions to a person.

Loqara does **not** currently submit an OpenAI merchant feed, enroll a store in OpenAI commerce, guarantee placement in ChatGPT shopping, or enable ChatGPT checkout. Those are separate merchant and platform workflows.

The overlap is data quality. The same exact product identities, variants, policies, and customer questions that improve an external feed also make on-site assistance more dependable. If shoppers repeatedly ask questions the catalogue cannot answer, improve the source rather than asking either system to infer the missing fact.

## Frequently asked questions

### Can any merchant upload an OpenAI product feed today?

OpenAI publishes a stable feed specification, merchant terms, and onboarding information, but access and supported commerce experiences can depend on merchant registration, market, and OpenAI's current rollout. Follow the current merchant process rather than assuming that a public specification alone creates an active feed.

### Can I reuse my Google Merchant Center feed?

Possibly, if OpenAI confirms that your registered feed supports its Google-compatible path. The supported path uses delimited files and maps a defined subset of fields. It does not mean every Google program, XML format, or attribute is supported.

### Does submitting a feed guarantee that ChatGPT recommends my products?

No. A valid feed makes product facts available in the expected structure. It does not guarantee inclusion, position, citations, traffic, or sales for any prompt.

### Does the feed replace Product structured data on my website?

No. Product structured data helps search systems interpret the visible product page and can support merchant experiences. The OpenAI feed is a separate submitted dataset. Keep the page, markup, and destination feeds consistent.

### Should every product variant be a separate row?

Yes when it is a distinct purchasable item with its own combination of attributes, stock, price, image, or URL. Give it a unique item ID and connect related variants through the supported group fields.

### What happens when a product is out of stock?

Update the availability instead of leaving the item marked in stock. If the product is discontinued, follow the current feed rules for removal or expiration and ensure its page has an appropriate customer experience.

### Is an OpenAI feed part of GEO?

It is one product-discovery input, not the whole of generative engine optimization. Crawlable product pages, clear visible evidence, structured data, merchant trust, internal links, and useful non-commodity content still matter. See the broader [e-commerce GEO guide](/blog/generative-engine-optimization-ecommerce) for that context.

---

**The practical next step:** export ten representative products and variants, validate every required field, and reconcile every mismatch with the visible store before scaling the feed.

[Try Loqara free](/#get-started) to see how the same governed product and policy data can support accurate conversations inside your own store.
