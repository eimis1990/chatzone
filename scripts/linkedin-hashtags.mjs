/**
 * Per-draft LinkedIn hashtags, keyed by post id. 3–5 tightly relevant tags per
 * post (more reads as spam). Core tags (#Ecommerce, #CustomerSupport,
 * #AICustomerService) recur across posts on purpose — repetition builds topical
 * authority. Shared by the seed script and the DB backfill so both stay in sync.
 */
export const HASHTAGS = {
  // The hardest answer is "I don't know" (grounded / no hallucination)
  'fa6dec03-f9f4-4b38-a454-a44d8f66e3d2': '#AICustomerService #CustomerSupport #Ecommerce #ConversationalAI',
  // "One line of code" took much more than one line of work (building in public)
  '10000000-0000-4000-8000-000000000020': '#BuildInPublic #SaaS #AICustomerService #Ecommerce',
  // A support bot should earn the right to keep talking (human handoff)
  '27f065e1-6e79-4649-9c8f-13426b3bb6d4': '#CustomerSupport #AICustomerService #CustomerExperience #Ecommerce',
  // The most expensive support question (WISMO / order tracking)
  '10000000-0000-4000-8000-000000000012': '#Ecommerce #CustomerSupport #AICustomerService #CX',
  // I stopped caring how many messages a chatbot handled (ROI metrics)
  '0c374f60-2f73-491b-90e5-9a22648a5446': '#CustomerSupport #CustomerExperience #AICustomerService #Ecommerce',
  // A small store does not need AI to answer everything (reduce tickets)
  '45138260-6e18-482a-9e5a-800532c6ae3f': '#CustomerSupport #Ecommerce #AICustomerService #Automation',
  // The first time I spoke to our store widget (voice)
  'f670a481-b17a-4510-b42c-b9c8c1ba9f4a': '#VoiceAI #ConversationalAI #CustomerExperience #Ecommerce',
  // You can spot an FAQ widget after the second question (conversational vs chatbot)
  '74c54440-2c79-418e-a255-4ff107a580e7': '#ConversationalAI #Chatbots #CustomerExperience #Ecommerce',
  // Contact forms ask for trust before they provide value (lead capture)
  '57764012-de66-49e0-8112-774e99556205': '#LeadGeneration #ConversationalAI #Ecommerce #CustomerExperience',
  // Five questions before putting AI in front of customers (how to choose)
  '4fd1af10-4cb3-4c90-a610-33eec5ff9c95': '#AICustomerService #CustomerSupport #Ecommerce #CX',
  // Gorgias can be the right tool and still be too much tool (comparison)
  '968f7f5f-3e4a-4cb4-8bee-5decf401aff6': '#CustomerSupport #Helpdesk #AICustomerService #Ecommerce',
  // ChatGPT is a model. Customer support is a system.
  '10000000-0000-4000-8000-000000000019': '#AI #ChatGPT #CustomerSupport #AICustomerService',
  // A Shopify chat widget should know the storefront
  '9095a072-057f-463d-a6a5-7c9d3121fa57': '#Shopify #Ecommerce #AICustomerService #CustomerSupport',
  // A WooCommerce support setup (platform)
  '6bb4b086-3d5f-4ae5-a9ed-ec99033ff333': '#WooCommerce #WordPress #Ecommerce #AICustomerService',
  // An AI agent becomes useless when conversations feel expensive (cost)
  '10000000-0000-4000-8000-000000000014': '#AI #CustomerSupport #AICustomerService #Ecommerce',
  // Lithuanian customer support exposes weak multilingual AI
  '10000000-0000-4000-8000-000000000013': '#MultilingualSupport #CustomerExperience #AICustomerService #Ecommerce',
  // Customer support AI needs a privacy model (GDPR)
  '10000000-0000-4000-8000-000000000016': '#GDPR #DataPrivacy #CustomerSupport #Ecommerce',
  // Small stores need less software, more support capacity
  '10000000-0000-4000-8000-000000000017': '#SmallBusiness #Ecommerce #CustomerSupport #RetailTech',
  // Many abandoned carts are unanswered questions
  '10000000-0000-4000-8000-000000000015': '#Ecommerce #AbandonedCart #ConversionRate #CustomerExperience',
  // The worst time to test automation is the campaign (Black Friday)
  '10000000-0000-4000-8000-000000000018': '#BlackFriday #BFCM #Ecommerce #CustomerSupport',
  // Broader editorial series: customer experience, operations, knowledge, and accessibility
  '30000000-0000-4000-8000-000000000021': '#CustomerExperience #CustomerSupport #CX #ServiceDesign',
  '30000000-0000-4000-8000-000000000022': '#Productivity #Automation #SmallBusiness #FounderLife',
  '30000000-0000-4000-8000-000000000023': '#CustomerExperience #CustomerSupport #ServiceDesign #AI',
  '30000000-0000-4000-8000-000000000024': '#CustomerSupport #CustomerExperience #KnowledgeManagement #CX',
  '30000000-0000-4000-8000-000000000025': '#KnowledgeManagement #CustomerExperience #ContentStrategy #AI',
  '30000000-0000-4000-8000-000000000026': '#Ecommerce #ConversionRate #CustomerExperience #UX',
  '30000000-0000-4000-8000-000000000027': '#Automation #CustomerSupport #SmallBusiness #CustomerExperience',
  '30000000-0000-4000-8000-000000000028': '#Trust #ResponsibleAI #CustomerSupport #CustomerExperience',
  '30000000-0000-4000-8000-000000000029': '#Ecommerce #ProductData #SemanticSearch #CustomerExperience',
  '30000000-0000-4000-8000-000000000030': '#Accessibility #VoiceAI #InclusiveDesign #CustomerExperience',
}
