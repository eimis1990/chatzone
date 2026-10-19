---
title: "Shopify Agentic Storefronts: setup checklist for AI sales channels"
description: "Set up Shopify Agentic Storefronts for ChatGPT, Copilot, Google AI Mode, Gemini, and Meta with the right catalog, channel, checkout, and reporting controls."
date: 2026-10-19
topic: platform-integrations
author: Eimantas Kudarauskas
authorRole: Founder
image: /blog/shopify-agentic-storefronts-guide.webp
related: agentic-commerce-ecommerce, shopify-ai-assistant-guide, how-to-get-products-recommended-by-chatgpt
---

Shopify now treats AI shopping assistants as sales channels. An eligible merchant can make products available to ChatGPT, Microsoft Copilot, Google AI Mode and Gemini, Meta surfaces, and the Shop app from one part of Shopify admin.

That sounds automatic—and some of it is. But “active” does not mean every product is eligible, represented correctly, selected for relevant questions, or ready for the checkout experience a merchant expects.

<blockquote class="quick-answer"><strong>Shopify Agentic Storefronts</strong> is the Shopify admin area for controlling how eligible products reach AI shopping channels. Start by checking Shopify Catalog eligibility, channel access, product mapping, policies, and checkout behavior. Then test real shopper queries in Catalog search preview and measure sales, orders, sessions, and conversion by channel instead of assuming activation equals visibility.</blockquote>

<div class="takeaways">
<p class="takeaways-title">Quick take</p>
<ul>
<li><strong>It may already be active:</strong> Shopify enables “Allow Shopify to manage for me” by default for eligible stores.</li>
<li><strong>Channels do not all work the same way:</strong> discovery source, eligibility, and checkout behavior vary.</li>
<li><strong>Catalog eligibility comes before ranking:</strong> an excluded product cannot be selected from Shopify Catalog.</li>
<li><strong>Mapping matters:</strong> custom metafields and separately listed variants may need explicit Catalog Mapping.</li>
<li><strong>Preview is directional:</strong> each AI channel can re-rank Shopify Catalog results using its own logic.</li>
</ul>
</div>

## What are Shopify Agentic Storefronts?

Shopify Agentic Storefronts is a sales-channel layer that makes eligible product data available to AI shopping experiences. The shopper may discover a product in a conversation, compare it with alternatives, and either continue to the merchant’s store or use a supported direct-checkout flow.

It is not Shopify Sidekick. Sidekick assists the merchant inside Shopify admin; Agentic Storefronts distributes catalog information to customer-facing AI channels. Our [Shopify AI assistant guide](/blog/shopify-ai-assistant-guide) explains the difference between the merchant copilot, Shopify Magic, storefront assistants, and external shopping agents.

Shopify’s current [Agentic Storefronts management documentation](https://help.shopify.com/en/manual/online-sales-channels/agentic-storefronts/agentic-home) puts these controls under **Sales channels > Agentic**. From there, an authorized store owner or staff member can:

- see Shopify Catalog eligibility and included-product counts;
- control catalog access for supported third-party channels;
- decide whether Shopify should auto-enroll future channels;
- review direct-checkout eligibility where a channel supports it;
- inspect product mapping and grouping;
- preview Catalog search results;
- view sales, orders, sessions, and conversion by channel.

This is the operational layer beneath the broader trend described in our [agentic commerce guide](/blog/agentic-commerce-ecommerce).

## Is Shopify Agentic Storefronts enabled automatically?

For eligible stores, Shopify says **Allow Shopify to manage for me** is the default. That setting gives available agentic channels access to eligible products through Shopify Catalog, activates direct checkout where supported, and automatically enrolls the store in future agentic channels.

That default is convenient, but it is also a governance choice. A merchant should review it rather than discover later that a new channel was added automatically.

Turning the default off does not necessarily disable agentic commerce. It exposes manual controls for:

- Shopify Catalog access;
- automatic enrollment in new storefronts;
- individual channels;
- direct checkout where applicable;
- a grouped “Other channels” option for smaller or emerging AI agents.

Shopify notes that removing Shopify Catalog access can take up to seven days to propagate. It also does not stop every other discovery path: a public product page may still be found through ordinary crawling or another feed.

## Which AI channels use Shopify Agentic Storefronts?

The channel list and rollout can change, so verify the current screen in Shopify admin. As of this review on **October 19, 2026**, the important distinctions are:

| Channel | Product-discovery source | Checkout behavior to verify |
| --- | --- | --- |
| ChatGPT | Shopify Catalog for eligible Shopify products; public web sources may also contribute | The shopper completes purchase on the merchant’s online store through an in-app browser or web tab; there is no separate Shopify direct-checkout toggle for ChatGPT |
| Microsoft Copilot | Shopify Catalog | Eligible merchants may have Shopify-powered direct checkout; otherwise redirect to the store |
| Google AI Mode and Gemini | Google & YouTube sales channel / Google Merchant Center | Direct checkout is rolling out and may not be available to every store |
| Meta AI surfaces | Facebook and Instagram by Meta sales channel | Availability and direct checkout depend on the current Meta setup and eligibility |
| Shop | Shopify Catalog | Managed through Shop’s own selling settings; it is not disabled by removing third-party Agentic access |

The current [Shopify Catalog product-discovery guide](https://help.shopify.com/en/manual/online-sales-channels/agentic-storefronts/products) is the best source for channel-specific changes. Do not assume that a setting visible for one channel exists for all of them.

## Shopify Agentic Storefronts setup checklist

### 1. Review the global channel decision

Go to **Sales channels > Agentic** and decide whether Shopify should manage enrollment automatically.

Keep the default if broad distribution and automatic enrollment match the business’s policy. Switch to manual control if the team needs to review every destination, restrict experimental channels, or approve direct checkout individually.

Record the decision, date, and owner. Otherwise, a future audit cannot distinguish an intentional setting from a default nobody reviewed.

### 2. Confirm Shopify Catalog eligibility

Shopify Catalog is the structured source used by channels such as ChatGPT and Microsoft Copilot. Shopify’s current [Catalog requirements](https://help.shopify.com/en/manual/shopify-catalog/requirements) include store-, account-, and product-level conditions.

A product generally needs:

- a title and at least one image;
- a price greater than zero;
- publication to an eligible storefront channel;
- an identifiable, public product URL;
- a status that is neither Unlisted nor hidden from search engines;
- a permitted product category and compliant content.

The store also needs an eligible plan, a public operating state, and acceptable account standing. Shopify says identity verification, legitimate order history, fulfillment, chargebacks, invoices, payment standing, and policy issues can affect eligibility over time.

If Shopify displays **Ineligible**, open the reason instead of repeatedly changing product copy. The blocker may be the plan, store state, account standing, policy category, or product data.

### 3. Check which products are actually included

The product count beside Shopify Catalog is more useful than a green channel switch. Compare it with the catalog the business intended to distribute.

Review samples from every important category, including:

- an in-stock bestseller;
- an out-of-stock product;
- a product with many variants;
- a sale item with compare-at pricing;
- a bundle or separately listed color family;
- a product with custom metafields;
- a D2C product also sold through B2B channels;
- an item with a special return, shipping, or age restriction.

Shopify Agentic Storefronts supports D2C sales. Shopify says it excludes B2B-only products when it can identify them through Shopify B2B catalogs, account requirements, or private-store access. Custom theme logic that hides prices or products for wholesale customers may not be recognized reliably, so custom B2B setups need particular care.

### 4. Map custom product data

Shopify Catalog normally structures title, description, options, images, price, availability, and other attributes. If the decisive product facts live in metafields, metaobjects, tags, title delimiters, or custom grouping rules, review **Shopify Catalog Mapping**.

Map the facts shoppers use to decide—not every internal field. Useful examples include:

- material, dimensions, fit, capacity, and compatibility;
- model number and included components;
- color, size, finish, and other variant dimensions;
- use-case or audience attributes;
- care, installation, warranty, and safety information;
- relationships between separately listed variants.

If several Shopify products represent variants of one customer-facing item, group them intentionally. Otherwise, an AI channel may show an untidy set of near-duplicates or select the wrong variant context. Our [AI shopping variant guide](/blog/product-variants-ai-shopping) explains the underlying identity and grouping decisions.

### 5. Review public business facts and policies

AI shoppers need more than products. Store identity, contact details, delivery, returns, privacy, and terms influence whether a recommendation can become a confident purchase.

For ordinary Shopify stores, keep those facts complete and consistent across admin, public pages, feeds, and checkout. Shopify also provides a Knowledge Base app for FAQs in some agentic setups. Treat it as a governed source: answer real questions, use the same policy language customers will encounter later, and remove expired promotions or exceptions.

Do not place decisive facts only inside an image. The visible product page should state them as accessible text even when the Catalog mapping is correct.

### 6. Verify each channel’s own prerequisites

Google product discovery depends on the Google & YouTube channel or Google Merchant Center. Meta depends on its own Shopify sales channel and product sync. ChatGPT and Microsoft Copilot use Shopify Catalog for eligible products.

A Shopify setting cannot repair a disconnected Google feed or a failed Meta sync. Audit each source path separately.

### 7. Decide what checkout experience you want

Direct checkout is not one universal Agentic Storefronts feature. It is channel- and eligibility-specific.

Where direct checkout is available, verify:

- payment-provider readiness;
- shipping zones, rates, weights, and delivery restrictions;
- tax configuration;
- discounts the channel may apply;
- refund ownership;
- fulfillment and status synchronization;
- customer notifications;
- the support route after purchase.

Where it is disabled, confirm that the channel sends shoppers to the correct product or variant and that the store works well inside an in-app browser.

## How do you improve product visibility after setup?

Eligibility creates a path; relevance earns consideration.

Use Shopify’s Catalog search preview with customer language, not only exact product names. Test prompts such as:

- “waterproof commuter backpack for a 16-inch laptop under €120”;
- “linen tablecloth for a six-seat oval table”;
- “fragrance-free moisturizer for very dry skin”;
- “quiet 60 cm dishwasher for an open-plan kitchen.”

If the right item does not rank in preview, inspect the facts that distinguish it. A generic product title and atmospheric description may not contain the size, material, compatibility, performance, or use-case attribute embedded in the shopper’s request.

Shopify warns that preview shows raw Shopify Catalog results. An external channel can re-rank them, so preview is a diagnostic tool—not a promise of placement.

## How should performance be measured?

Shopify’s Agentic section currently reports sales, orders, online-store sessions, and online-store conversion by channel. Shopify says sales combine referral-based purchases and direct-checkout sales.

Use those reports with store analytics:

| Metric | What it tells you |
| --- | --- |
| Eligible product count | Whether the intended catalog can participate |
| Search-preview coverage | Whether catalog facts match important customer requests |
| Sessions by AI channel | Which channels send visitors to the store |
| Orders and sales | Whether discovery creates transactions |
| Online-store conversion | Whether referred visitors complete checkout |
| Product-data corrections | Which attributes or mappings repeatedly fail |
| Returns and support reasons | Whether AI-discovered shoppers received accurate expectations |

Do not compare a direct-checkout channel with a referral-only channel using sessions alone. Also label Shopify’s own growth statistics as platform-reported. Shopify reported that AI-driven traffic rose eightfold and orders from AI-powered searches nearly thirteenfold year over year in Q1 2026, but those aggregate figures are not a forecast for an individual store ([Shopify, June 2026](https://www.shopify.com/blog/how-agentic-commerce-works)).

## What are the most common setup mistakes?

### Assuming “active” means “visible”

The channel can be active while the store is ineligible, individual products are excluded, or a shopper’s request is unrelated.

### Treating every channel as identical

Catalog source, rollout, direct checkout, reporting, and market availability differ. Verify each route.

### Leaving decisive facts in custom fields

If a product’s capacity, compatibility, or material exists only in an unmapped metafield, the AI-facing record may miss the very fact that should qualify it.

### Using Unlisted as a narrow AI opt-out

Shopify warns that Unlisted also removes a product from sitemaps, search engines, and online-store search. Use it only when that broader effect is intended.

### Expecting an onsite chatbot to configure external channels

An onsite assistant and Agentic Storefronts serve different moments. The former helps visitors on the merchant’s website; the latter distributes product information to external AI shopping channels.

## Where does Loqara fit?

Loqara does not activate Shopify Agentic Storefronts, change Shopify Catalog eligibility, configure external AI checkout, or guarantee that another platform will recommend a product.

Loqara provides the conversational layer on the merchant’s own storefront. It can search a connected Shopify product catalog, answer from approved store knowledge, keep context across follow-up questions, capture leads, and hand a conversation to a person. Shopify order lookup is not currently supported by Loqara; order-status lookup is available only for supported WooCommerce and Magento stores.

The two layers can share the same discipline: complete product facts, clear policies, current availability, explicit limitations, and a human route for uncertainty.

## Frequently asked questions

### Do I need to install an app for Shopify Agentic Storefronts?

Eligible Shopify stores manage Agentic Storefronts from Shopify admin, and the global setting is active by default. Individual destinations can still require their own sales channel—for example, Google & YouTube for Google AI Mode and Gemini, or Facebook and Instagram by Meta for Meta surfaces.

### Are all Shopify products automatically shown in ChatGPT?

No. Eligible products can be made available through Shopify Catalog, but ChatGPT decides which products are relevant to a shopper’s request. Store eligibility, product eligibility, channel access, data quality, availability, merchant factors, and the specific prompt all matter.

### Can I opt out of one AI channel but keep another?

Yes, Shopify provides individual controls when **Allow Shopify to manage for me** is turned off. The exact settings depend on the channel. Public products can still be discovered through ordinary web crawling or separate feeds even when Shopify Catalog access is removed.

### Does ChatGPT use Shopify direct checkout?

Shopify’s current documentation says ChatGPT sends the shopper to the merchant’s existing online-store checkout through an in-app browser or a new web tab. Shopify-powered direct checkout applies to other eligible channels where supported, not to the current ChatGPT flow.

### How can I tell why my store is ineligible for Shopify Catalog?

Open the **Ineligible** notice under **Sales channels > Agentic**. Shopify may identify an unsupported plan, unmet store or product requirements, account-standing issues, a policy restriction, or another catalog-eligibility condition. Follow that reason before optimizing descriptions or search terms.

### Does Shopify Catalog Mapping improve rankings?

Mapping can make decisive product facts available and group variants more accurately. That can improve the quality of matching, but it does not guarantee ranking or placement. External AI channels can apply their own relevance and quality logic after receiving Shopify Catalog results.

### Should I enable automatic enrollment in future AI channels?

Enable it when broad distribution matches the business’s data-sharing and channel strategy. Disable it when legal, brand, market, or operational review is required before a new destination receives catalog access or offers checkout. Review the choice periodically either way.

---

**The practical next step:** open **Sales channels > Agentic**, record the global setting, eligible product count, active channels, checkout behavior, and three important search-preview results. That five-minute snapshot will show whether the next job is governance, eligibility, data mapping, or merchandising.

[Try Loqara free](/#get-started) when the external channel brings shoppers to your store and they still need accurate, conversational product help.
