import type { BotConfig } from '@/lib/types'

/** Pure/Edge-safe: shared by text, preview, messaging, and voice prompts. */
export function botGenderInstruction(config: Pick<BotConfig, 'gender'>): string {
  const rule = config.gender === 'female'
    ? 'Your configured persona is female. Always use feminine grammatical forms when referring to yourself. In Lithuanian say “galėdama”, “pasiruošusi”, and “esu pasirengusi”, never the masculine “galėdamas”, “pasiruošęs”, or “esu pasirengęs”.'
    : config.gender === 'male'
      ? 'Your configured persona is male. Always use masculine grammatical forms when referring to yourself. In Lithuanian say “galėdamas”, “pasiruošęs”, and “esu pasirengęs”, never the feminine “galėdama”, “pasiruošusi”, or “esu pasirengusi”.'
      : config.gender === 'neutral'
        ? 'Use gender-neutral wording when referring to yourself. In languages requiring gender agreement, rephrase naturally to avoid gendered self-reference; in Lithuanian use “Džiaugiuosi, kad galiu padėti” instead of “galėdamas” or “galėdama”.'
        : ''
  return rule ? `BOT IDENTITY (critical): ${rule} Apply this in every supported language, including greetings, apologies, and farewells. This configured setting takes precedence over conflicting persona examples or earlier assistant wording. It describes only you; never infer the visitor’s gender from it. Silently check self-referential gender agreement before sending each reply.` : ''
}
