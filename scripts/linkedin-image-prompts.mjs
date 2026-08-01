/** Prompt manifests for the AI-generated LinkedIn editorial sets. */
const illustratedShared = `Use case: LinkedIn editorial content
Asset type: landscape social post image, generate at 16:9 with the important composition safe inside a centred 1.91:1 crop
Style/medium: bold premium magazine illustration made from hand-cut paper, screen-printed ink grain, crisp geometric shapes, and selective translucent layers; tactile and dimensional but clearly illustrative, never a generic glossy 3D render
Composition/framing: one surprising visual story, dynamic asymmetry, dramatic scale contrast, a strong silhouette readable at feed-thumbnail size, generous safe margins
Lighting/mood: confident, intelligent, energetic, slightly playful, beautifully art-directed
Color palette: saturated Loqara orange, warm cream, charcoal black, soft lavender, and restrained cobalt; allow one topic-specific accent when useful
Constraints: absolutely no text, letters, numbers, logos, brand marks, interface screenshots, labels, watermarks, humanoid robots, neon sci-fi effects, or generic corporate stock imagery`

export const CURRENT_DRAFT_IMAGE_PROMPTS = [
  {
    filename: '05-support-metrics-illustrated.webp',
    prompt: `${illustratedShared}\nPrimary request: a gigantic hollow tower built from countless speech bubbles leans precariously like a vanity monument, while below it four small honest instruments align into one reliable compass: a completed-path check, a broken-loop detector, a human handoff bridge, and a product-to-purchase spark; the visual contrast should make message volume feel empty and resolution quality feel solid`,
  },
  {
    filename: '04-repetitive-questions-illustrated.webp',
    prompt: `${illustratedShared}\nPrimary request: a warm stylized solo store owner calmly packing an order at a central worktable while a dynamic cyclone of repeated parcel, delivery, size, stock, and return symbols is diverted into one smooth orange support channel around the perimeter, leaving a protected pool of uninterrupted focus around the person`,
  },
  {
    filename: '03-voice-shopping-illustrated.webp',
    prompt: `${illustratedShared}\nPrimary request: a stylized shopper on a rain-slick city street with both hands occupied by everyday bags; their spoken waveform becomes a vivid orange running trail that flows through several abstract footwear options and naturally circles one weather-ready running shoe, making voice feel like a direct path into the store rather than a phone interface`,
  },
  {
    filename: '10-context-memory-illustrated.webp',
    prompt: `${illustratedShared}\nPrimary request: one continuous orange conversational ribbon links two moments around the same small-office coffee machine: the first chooses the machine, the second adds an easy-clean requirement represented by a water droplet and cleaning brush; disconnected FAQ fragments fall away at the edges while the central context remains visibly unbroken`,
  },
  {
    filename: '06-conversational-lead-illustrated.webp',
    prompt: `${illustratedShared}\nPrimary request: a cold rigid wall of blank form fields cracks open as a warm conversational ribbon passes through, first delivering a useful product answer represented by a glowing product card, and only afterwards reaching a single envelope contact token; the sequence must clearly communicate value before identity`,
  },
  {
    filename: '08-five-tests-illustrated.webp',
    prompt: `${illustratedShared}\nPrimary request: a central conversational agent form surrounded by five dramatic test portals in a ring: an unknown-data void where the path stops, a coherent two-colour language braid, a locked parcel privacy vault, a clean bridge to a human hand, and a bright source document anchoring a claim; make the five trials visually distinct but compositionally unified`,
  },
  {
    filename: '09-right-sized-support-illustrated.webp',
    prompt: `${illustratedShared}\nPrimary request: a tiny independent online shop faces an absurdly enormous enterprise control machine crowded with levers, cables, seats, and unused panels; the shop owner deliberately chooses one compact orange support toolkit that fits neatly beside the counter, a witty visual about right-sized software without mocking either option`,
  },
  {
    filename: '19-model-vs-system-illustrated.webp',
    prompt: `${illustratedShared}\nPrimary request: an exploded architectural system diagram where one glowing conversational prism is visibly only a single component among a knowledge library, live commerce conveyor, privacy vault, measurement instrument, multilingual bridge, and open human doorway; all parts connect into one functioning customer-support machine`,
  },
  {
    filename: '11-shopify-context-illustrated.webp',
    prompt: `${illustratedShared}\nPrimary request: a cutaway online storefront with product shelves, variants, inventory markers, and an order journey flowing through green-accented channels into one continuous customer conversation; the same orange ribbon carries product context into the follow-up instead of restarting, with no platform logo or interface`,
  },
  {
    filename: '07-woocommerce-stack-illustrated.webp',
    prompt: `${illustratedShared}\nPrimary request: a chaotic purple knot of many plugin plugs and cables wraps around a small online shop, then passes through one bold orange portal and emerges as a single clean conversational line connected to a catalogue shelf, policy book, protected order parcel, and human doorway`,
  },
  {
    filename: '14-generous-limits-illustrated.webp',
    prompt: `${illustratedShared}\nPrimary request: a large transparent reservoir comfortably absorbs a steady stream of daily conversation bubbles plus one dramatic campaign wave while retaining generous headroom; outside the reservoir, a tiny anxious per-message meter has been set aside, creating a visual feeling of capacity rather than scarcity`,
  },
  {
    filename: '13-lithuanian-language-illustrated.webp',
    prompt: `${illustratedShared}\nPrimary request: a contemporary Baltic-inspired loom weaves several differently shaped speech ribbons and international product symbols into one coherent flowing textile; yellow, green, and red threads appear as a restrained Lithuanian accent within the Loqara palette, showing natural multilingual context without any written words`,
  },
  {
    filename: '16-privacy-by-design-illustrated.webp',
    prompt: `${illustratedShared}\nPrimary request: a cutaway architectural privacy vault protects one warm customer conversation through four visible controlled gates: an identity token, a minimal contact envelope, store-scoped data shelves, and an authorised human doorway; unrelated data remains blurred and physically blocked outside the structure`,
  },
  {
    filename: '17-small-store-capacity-illustrated.webp',
    prompt: `${illustratedShared}\nPrimary request: one stylized small-store owner works at a central packing table while elegant autonomous orange pathways quietly resolve routine question bubbles, find products, follow a parcel, and route one exception around the perimeter; the owner gains a large calm open workspace instead of a crowded software control room`,
  },
  {
    filename: '15-cart-question-illustrated.webp',
    prompt: `${illustratedShared}\nPrimary request: a shopping cart pauses at the edge of a checkout canyon while four large translucent uncertainty spirits hover around it, represented by shoe fit, plug compatibility, delivery calendar, and return-arrow imagery; one warm conversational lantern reveals a safe bridge forward without using a discount symbol`,
  },
  {
    filename: '18-campaign-readiness-illustrated.webp',
    prompt: `${illustratedShared}\nPrimary request: a small online store stands backstage before a spectacular incoming campaign storm; five illuminated stepping stones representing grounded knowledge, current products, privacy, human handoff, and stress testing form a stable path toward the traffic wave, conveying preparation before launch rather than panic during it`,
  },
]

const shared = `Use case: ads-marketing
Asset type: LinkedIn editorial post image, landscape 1.91:1
Style/medium: premium tactile 3D editorial collage, sophisticated and minimal, realistic paper and translucent acrylic materials
Composition/framing: strong single visual metaphor, bold shapes readable at feed-thumbnail size, generous outer padding
Lighting/mood: crisp studio lighting, intelligent and optimistic rather than corporate stock imagery
Color palette: Loqara orange, warm cream, charcoal black, with one restrained secondary accent
Constraints: no text, no letters, no numbers, no logos, no interface screenshots, no watermark, no generic humanoid robot, no neon sci-fi clichés`

export const LINKEDIN_IMAGE_PROMPTS = [
  {
    filename: '21-repeat-yourself.webp',
    prompt: `${shared}\nPrimary request: a lone customer silhouette at the centre while one speech ribbon loops around them again and again, becoming visibly tangled; a clean open path appears just beyond the loops`,
  },
  {
    filename: '22-returned-attention.webp',
    prompt: `${shared}\nPrimary request: many scattered fragments of a workday reconnecting into one calm, uninterrupted beam of focused light; visual metaphor for automation returning attention`,
  },
  {
    filename: '23-policy-friction.webp',
    prompt: `${shared}\nPrimary request: a polished fast-moving orange message bubble meeting an immovable rough stone barrier; visual metaphor that fast communication cannot repair a bad policy`,
  },
  {
    filename: '24-question-elimination.webp',
    prompt: `${shared}\nPrimary request: a field of repeated sculptural question-mark shapes dissolving after one central source document becomes clear and brightly illuminated`,
  },
  {
    filename: '25-help-centre-infrastructure.webp',
    prompt: `${shared}\nPrimary request: a luminous library of knowledge cards acting as the foundation beneath four distinct channels represented by abstract search, chat, voice-wave, and human-support forms`,
  },
  {
    filename: '26-invisible-uncertainty.webp',
    prompt: `${shared}\nPrimary request: a sculptural shopping cart approaching a clean checkout threshold while translucent question-shaped shadows surround it, suggesting hidden doubts about fit, delivery, compatibility, and returns`,
  },
  {
    filename: '27-predictable-personal.webp',
    prompt: `${shared}\nPrimary request: one path splits into orderly repeated blocks moving toward automation and one warm nuanced human conversation protected in a softly lit circular space`,
  },
  {
    filename: '28-trust-before-speed.webp',
    prompt: `${shared}\nPrimary request: a bright speed trail races toward a fragile glass bridge while a slower grounded orange path crosses safely on solid supports; visual metaphor for trust before speed`,
  },
  {
    filename: '29-catalogue-conversation.webp',
    prompt: `${shared}\nPrimary request: orderly rows of neutral product-data tiles unfold into rich conversational ribbons and contextual scenes, showing a catalogue transforming into real customer questions`,
  },
  {
    filename: '30-voice-accessibility.webp',
    prompt: `${shared}\nPrimary request: four diverse everyday hands occupied with cooking, carrying, repairing, and navigating connect through one calm central voice waveform to the same glowing information source`,
  },
]
