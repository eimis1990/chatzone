# Loqara — Potential Product Features

Product-differentiation backlog for online stores. This is an ideas document,
not a committed delivery schedule. The implementation roadmap remains in
[`ROADMAP.md`](ROADMAP.md).

Status:

- `[x]` shipped
- `[ ]` potential future feature

## 1. Demand Radar

- [x] **Status: shipped**

Turn repeated unresolved shopper questions into evidence-backed opportunities
and safe actions for the merchant.

Included:

- [x] Per-bot Demand Radar screen with 7, 30, and 90-day views.
- [x] Detect repeated demand from fallbacks, missed product results, low success
      scores, and negative feedback.
- [x] Group signals into product gaps, knowledge gaps, and store limitations.
- [x] Show trends, affected shoppers, ranked opportunities, and redacted shopper
      evidence.
- [x] Let merchants review and approve suggested actions before anything is
      applied.
- [x] Offer the following actions:
  - [x] Fix product attributes.
  - [x] Add an FAQ.
  - [x] Improve a product description.
  - [x] Create a collection.
  - [x] Add a missing synonym.
  - [x] Notify the merchandising team.
  - [x] Show “Publish correction to store” as an approval-gated future action.
- [x] Apply approved FAQs to Loqara knowledge.
- [x] Apply approved synonyms to future Loqara product searches.
- [x] Save attributes, descriptions, collections, and merchandising
      notifications as review tasks.
- [x] Keep direct store publishing visibly disabled until a supported,
      approval-gated write-back integration exists.
- [x] Explain the workflow and store-editing boundary inside the product.
- [x] Persist action plans with organization-scoped access controls.

Related implementation details: [`wiki/demand-radar.md`](wiki/demand-radar.md).

## 2. Conversion Rescue

- [ ] **Status: not started**

Recognize purchase hesitation and help the store recover a sale while the
shopper is still engaged.

Potential scope:

- [ ] Detect high-intent hesitation such as price concerns, delivery doubts,
      missing information, or repeated comparison questions.
- [ ] Recommend the safest next action: answer, alternative product, incentive,
      human assistance, or follow-up.
- [ ] Let merchants configure when discounts or free-shipping offers may appear.
- [ ] Capture contact details and marketing consent when the shopper wants a
      later follow-up.
- [ ] Send approved recovery messages through email, Messenger, or another
      connected channel.
- [ ] Attribute recovered carts, orders, and revenue to the conversation.
- [ ] Provide a dashboard of rescue reasons, offers used, conversion rate, and
      margin impact.
- [ ] Optionally work as a standalone recovery widget without the full chatbot.

## 3. Guided Shopping Missions

- [ ] **Status: not started**

Replace generic chat with a structured buying journey for considered purchases
such as furniture, electronics, beauty, gifts, or equipment.

Potential scope:

- [ ] Let shoppers begin with a goal such as “furnish my dining room” or “build
      a skincare routine.”
- [ ] Ask only the questions needed to identify constraints, preferences, and
      budget.
- [ ] Maintain a visible shopping brief that the shopper can edit.
- [ ] Build a grounded shortlist using live products, prices, stock, and hard
      compatibility constraints.
- [ ] Explain why each product fits and what trade-offs remain.
- [ ] Save, share, email, or resume a shopping mission later.
- [ ] Allow a human sales adviser to join with the full brief already prepared.
- [ ] Measure mission completion, add-to-cart rate, and assisted revenue.

## 4. Product Comparison and Compatibility Advisor

- [ ] **Status: not started**

Help shoppers make confident decisions without manually opening many product
pages.

Potential scope:

- [ ] Compare selected products in a structured, mobile-friendly table.
- [ ] Highlight meaningful differences instead of repeating every attribute.
- [ ] Explain the best choice for a stated use case, budget, room, device, or
      customer profile.
- [ ] Validate compatibility between products, accessories, dimensions, or
      existing equipment.
- [ ] Clearly mark unknown or missing data instead of guessing.
- [ ] Let shoppers replace an item in the comparison without restarting.
- [ ] Add a chosen product or complete compatible bundle to the cart.
- [ ] Show merchants which attributes most often decide a purchase.

## 5. Catalog Quality Copilot

- [ ] **Status: not started**

Continuously audit product data and prepare improvements that make search,
recommendations, advertising, and product pages more effective.

Potential scope:

- [ ] Find missing, inconsistent, or low-quality product attributes.
- [ ] Detect weak descriptions, duplicate variants, broken links, missing
      images, and conflicting prices or stock states.
- [ ] Prioritize fixes using real shopper demand and commercial impact.
- [ ] Draft improved titles, descriptions, attributes, FAQs, image alt text, and
      collection assignments.
- [ ] Support bulk review with before/after previews and approval rules.
- [ ] Publish approved corrections through supported store integrations with an
      audit log and rollback information.
- [ ] Recheck corrected products and measure whether search success improves.
- [ ] Optionally operate as a standalone catalog-audit service.

## 6. Zero-result Search Optimizer

- [ ] **Status: not started**

Turn failed store searches into a measurable source of recovered product
discovery.

Potential scope:

- [ ] Collect zero-result and low-quality search queries from both Loqara and
      the store search bar.
- [ ] Cluster spelling variants, customer language, synonyms, and emerging
      product terms.
- [ ] Suggest synonym rules, query rewrites, filters, redirects, or new landing
      pages.
- [ ] Provide a test bench showing before/after results for each proposed rule.
- [ ] Require merchant approval before activating a rule.
- [ ] Track recovered searches, product clicks, add-to-cart events, and revenue.
- [ ] Export recommendations or integrate directly with supported store-search
      providers.
- [ ] Optionally work as a standalone search analytics and optimization tool.

## 7. Back-in-stock and Price-watch Concierge

- [ ] **Status: not started**

Keep demand instead of losing shoppers when the right product is unavailable or
outside their current budget.

Potential scope:

- [ ] Let shoppers subscribe to a product, variant, price threshold, or broader
      request such as “any oak table below €800.”
- [ ] Capture preferred channel and explicit notification consent.
- [ ] Suggest in-stock alternatives immediately without losing the original
      request.
- [ ] Notify shoppers when stock, price, or a matching new product changes.
- [ ] Deduplicate and rate-limit notifications across channels.
- [ ] Give merchants an aggregated demand list for inventory and buying
      decisions.
- [ ] Attribute resulting visits, carts, and orders to each alert.
- [ ] Optionally work as a standalone waitlist and price-alert widget.

## 8. Return Prevention and Exchange Assistant

- [ ] **Status: not started**

Reduce avoidable returns before purchase and make necessary exchanges easier
after purchase.

Potential scope:

- [ ] Ask fit, size, room, use-case, care, or compatibility questions before a
      risky purchase.
- [ ] Warn when a selected product conflicts with a confirmed constraint.
- [ ] Explain delivery, assembly, care, warranty, and return policies using
      grounded store information.
- [ ] Recommend a safer size, variant, accessory, or alternative product.
- [ ] Start an authenticated exchange or return request after purchase.
- [ ] Suggest exchanges before refunds when appropriate and merchant-approved.
- [ ] Capture structured return reasons and connect them to product records.
- [ ] Report preventable-return patterns to merchandising and operations teams.

## 9. Post-purchase Concierge

- [ ] **Status: not started**

Extend Loqara beyond order lookup into a useful customer relationship after the
sale.

Potential scope:

- [ ] Provide proactive delivery updates and explain delays.
- [ ] Surface setup, assembly, care, usage, and troubleshooting guidance for the
      purchased product.
- [ ] Help customers find manuals, compatible accessories, consumables, and
      replacement parts.
- [ ] Handle approved reorder, subscription, warranty, exchange, and return
      workflows.
- [ ] Ask for a review or referral only after a suitable delivery milestone.
- [ ] Recognize cross-sell opportunities based on the actual purchase without
      becoming intrusive.
- [ ] Escalate complex cases to a human with order and conversation context.
- [ ] Measure support deflection, repeat purchase, and customer satisfaction.

## 10. High-intent Sales Desk

- [ ] **Status: not started**

Give sales teams a focused queue of shoppers who are most likely to need human
help or complete a valuable purchase.

Potential scope:

- [ ] Score intent using product value, buying specificity, repeat visits,
      urgency, and conversation behavior.
- [ ] Create a priority queue separate from ordinary support handoffs.
- [ ] Notify the correct sales or merchandising owner through in-app, email,
      Slack, or Teams integrations.
- [ ] Generate a concise shopper brief with needs, objections, products viewed,
      and recommended next action.
- [ ] Support assignment, ownership, notes, follow-up dates, and outcome states.
- [ ] Let staff join the live conversation or follow up through an approved
      channel.
- [ ] Track response time, assisted conversion, order value, and won/lost
      reasons.
- [ ] Export qualified opportunities to a CRM.

## 11. Conversation-to-Campaign Studio

- [ ] **Status: not started**

Turn verified shopper demand into marketing and merchandising work without
starting from a blank page.

Potential scope:

- [ ] Start from a Demand Radar opportunity or selected conversation cluster.
- [ ] Draft a collection concept, landing-page outline, campaign angle, email,
      social copy, and FAQ set from the same evidence.
- [ ] Select relevant live products and exclude unavailable or non-matching
      items.
- [ ] Preserve the store's brand voice, approval rules, and supported languages.
- [ ] Let teams edit and approve each asset independently.
- [ ] Publish or export to supported commerce and marketing platforms.
- [ ] Attach campaign performance back to the originating demand signal.
- [ ] Optionally work as a standalone demand-to-campaign planning tool.

## 12. Storefront QA / AI Mystery Shopper

- [ ] **Status: not started**

Automatically test whether the store and assistant can complete important
shopping journeys correctly.

Potential scope:

- [ ] Run scheduled scenarios such as finding a constrained product, checking a
      policy, using a discount, or tracking an order.
- [ ] Test the chatbot, product search, product pages, links, prices, stock, and
      key checkout handoffs together.
- [ ] Detect hallucinations, stale answers, dead ends, contradictory data, and
      regressions after catalog or prompt changes.
- [ ] Store evidence with screenshots, responses, and reproducible steps.
- [ ] Separate critical failures from content-quality suggestions.
- [ ] Notify owners when an important customer journey breaks.
- [ ] Compare results over time and verify that a fix actually worked.
- [ ] Optionally operate as a standalone storefront monitoring service.

## 13. Visual Product Finder

- [ ] **Status: not started**

Let shoppers use an image as the start of product discovery, complementing the
existing room visualizer.

Potential scope:

- [ ] Upload or take a photo of a product, style, room, color, material, or
      pattern.
- [ ] Find visually similar products from the connected live catalog.
- [ ] Combine visual similarity with text constraints such as budget, size,
      stock, brand, or delivery location.
- [ ] Explain which visual properties matched and where products differ.
- [ ] Let shoppers refine results conversationally.
- [ ] Save inspiration boards or share a shortlist.
- [ ] Respect image privacy, retention, and deletion controls.
- [ ] Optionally offer a standalone visual-search entry point on category and
      search pages.

## 14. Customer Preference Memory

- [ ] **Status: not started**

Create an opt-in preference layer that makes repeat shopping more useful while
keeping the customer in control.

Potential scope:

- [ ] Remember explicitly approved preferences such as sizes, materials,
      allergies, room dimensions, brands, budget ranges, or pet/child needs.
- [ ] Separate temporary session context from long-term saved preferences.
- [ ] Let customers view, edit, export, or delete everything remembered.
- [ ] Reuse preferences in search, comparisons, alerts, and guided shopping
      missions.
- [ ] Support household or project profiles without mixing their constraints.
- [ ] Avoid inferring or storing sensitive traits that are unnecessary for the
      shopping task.
- [ ] Show merchants only aggregated insights unless the customer has consented
      to identifiable follow-up.
- [ ] Measure repeat-session usefulness and conversion without dark patterns.

## 15. Merchant Intelligence Digest

- [ ] **Status: not started**

Deliver a concise, action-oriented summary of what the store should know and do
each week.

Potential scope:

- [ ] Summarize demand changes, failed searches, recurring objections, support
      issues, high-intent opportunities, and recovered revenue.
- [ ] Rank recommendations by likely customer impact, revenue, effort, and
      confidence.
- [ ] Link every claim back to evidence inside Loqara.
- [ ] Separate urgent operational issues from longer-term merchandising ideas.
- [ ] Let merchants assign, snooze, approve, or dismiss recommendations.
- [ ] Deliver the digest in-app and optionally through email, Slack, or Teams.
- [ ] Track which recommendations were acted on and whether the underlying
      metric improved.
- [ ] Provide an executive version and an operational team version.

## Possible sequencing

This is a starting hypothesis, not a commitment:

1. Catalog Quality Copilot — extends the Demand Radar action model and unlocks
   safe store write-back.
2. Zero-result Search Optimizer — uses data and synonym infrastructure already
   introduced for Demand Radar.
3. Guided Shopping Missions + Product Comparison — directly improve storefront
   conversion and make the widget visibly different from generic chatbots.
4. Back-in-stock / Price-watch + Conversion Rescue — turn unresolved demand
   into attributable revenue.
5. Storefront QA and Merchant Intelligence Digest — package Loqara's data into
   valuable standalone merchant tools.

_Last reviewed: 2026-08-02._
