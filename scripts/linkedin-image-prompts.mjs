/** Prompt manifest for the OpenAI-generated July 2026 LinkedIn editorial set. */
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
