/**
 * Human-handoff state machine + escalation detection (Phase 2).
 *
 * A conversation flows through: bot → requested → live → resolved.
 *   - `bot`       the assistant answers normally.
 *   - `requested` a human has been asked for; the bot stops auto-replying.
 *   - `live`      a human agent has taken over and is answering.
 *   - `resolved`  the human episode is closed; the bot resumes on the next turn.
 *
 * These helpers are pure so they can be unit-tested and reused by both the
 * public chat/poll endpoints and the agent inbox.
 */
import type { BotLanguage, HandoffStatus } from '@/lib/types'

export type { HandoffStatus }
export type HandoffAction = 'take' | 'resolve' | 'return'

/** Whether the bot should answer for a conversation in this state. */
export function botShouldReply(status: HandoffStatus): boolean {
  return status === 'bot' || status === 'resolved'
}

/** Next status after an agent action. Actions are idempotent state sets. */
export function nextHandoffStatus(_current: HandoffStatus, action: HandoffAction): HandoffStatus {
  switch (action) {
    case 'take':
      return 'live'
    case 'resolve':
      return 'resolved'
    case 'return':
      return 'bot'
  }
}

// Lowercase + strip diacritics so "žmogumi" matches "zmogumi", "Norėčiau" →
// "noreciau", etc. (NFD decomposes accented letters; we drop the marks.)
function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
}

// Phrases that are a request all by themselves ("connect me to", "sujunkite").
// Stored diacritic-free and lowercase; matched as substrings.
const REQUEST_PHRASES: Record<BotLanguage, string[]> = {
  en: [
    'talk to a human',
    'talk to a person',
    'talk to someone',
    'talk to an agent',
    'speak to a human',
    'speak to a person',
    'speak to someone',
    'speak with someone',
    'speak to an agent',
    'connect me to',
    'live agent',
  ],
  lt: [
    'sujunk', // sujunkite/sujunk su
    'perjunk',
    'pakviesk', // pakvieskite žmogų
  ],
}

// Person nouns that signal a handoff ONLY with a request cue nearby. Visitors
// also merely MENTION staff — "jūsų darbuotoja man sakė…", "your customer
// service told me…" — and a mention must never escalate (a real bug: talking
// ABOUT an employee force-escalated a chat whose handoff was even disabled).
const PERSON_NOUNS: Record<BotLanguage, string[]> = {
  en: [
    'a human',
    'real person',
    'real human',
    'human agent',
    'representative',
    'customer service',
    'customer support',
  ],
  lt: [
    'zmog', // žmogus/žmogumi/žmogui (singular "person", not žmonės=plural)
    'operatori', // operatorius/operatoriumi
    'agentu',
    'darbuotoj', // darbuotoju/darbuotoja
    'konsultant', // konsultantu/konsultanto
    'klientu aptarnav',
    'su asmeniu',
    'gyvas asmuo',
  ],
}

// "I want / can I / please…" — the cue that turns a person-noun into a request.
const REQUEST_CUES: Record<BotLanguage, string[]> = {
  en: [
    'talk',
    'speak',
    'chat',
    'connect',
    'transfer',
    'want',
    'need',
    'can i',
    'could i',
    'get me',
    'give me',
    'reach',
  ],
  lt: [
    'noriu',
    'noreciau',
    'kalbet', // kalbėti/pakalbėti/pasikalbėti/kalbėtis all contain it
    'susisiek',
    'prasau',
    'gal galiu',
    'ar galiu',
    'ar galima',
  ],
}

// How far (in characters) a cue may sit from the noun and still count as one
// request. Lithuanian word order is free, so the cue may come before OR after.
const CUE_WINDOW = 40

/** A person-noun with a request cue within CUE_WINDOW chars on either side. */
function nounWithCue(normalized: string, nouns: string[], cues: string[]): boolean {
  // ponytail: nested indexOf scans — chat messages are short, clarity wins.
  for (const noun of nouns) {
    for (let n = normalized.indexOf(noun); n !== -1; n = normalized.indexOf(noun, n + 1)) {
      for (const cue of cues) {
        for (let c = normalized.indexOf(cue); c !== -1; c = normalized.indexOf(cue, c + 1)) {
          const gap = c < n ? n - (c + cue.length) : c - (n + noun.length)
          if (gap <= CUE_WINDOW) return true
        }
      }
    }
  }
  return false
}

/** True when the visitor message ASKS for a human (not merely mentions one). */
export function detectHandoffIntent(text: string, lang: BotLanguage = 'en'): boolean {
  const normalized = normalize(text)
  // Always also check English lists (visitors often type English on LT bots).
  const langs: BotLanguage[] = lang === 'en' ? ['en'] : [lang, 'en']
  const phrases = langs.flatMap((l) => REQUEST_PHRASES[l] ?? [])
  if (phrases.some((p) => normalized.includes(p))) return true
  // Mixed-language requests ("noriu customer service") are common — pair any
  // active-language noun with any active-language cue.
  const nouns = langs.flatMap((l) => PERSON_NOUNS[l] ?? [])
  const cues = langs.flatMap((l) => REQUEST_CUES[l] ?? [])
  return nounWithCue(normalized, nouns, cues)
}

/** Localized acknowledgement shown when the conversation is escalated. */
export const HANDOFF_ACK: Record<BotLanguage, string> = {
  en: "Sure — let me connect you with someone from our team. They'll join this chat shortly.",
  lt: 'Žinoma — sujungiu jus su mūsų komandos nariu. Jis netrukus prisijungs prie pokalbio.',
}
