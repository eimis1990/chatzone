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

// Intent keywords that signal "I want to talk to a real person". Matched
// word-ish (substring on a normalized, lowercased message) per language.
const INTENT_KEYWORDS: Record<BotLanguage, string[]> = {
  en: [
    'talk to a human',
    'talk to a person',
    'talk to someone',
    'speak to a human',
    'speak to a person',
    'speak to someone',
    'speak with someone',
    'real person',
    'real human',
    'live agent',
    'human agent',
    'customer service',
    'customer support',
    'representative',
    'connect me to',
    'talk to an agent',
    'speak to an agent',
  ],
  lt: [
    'su žmogumi',
    'gyvu žmogumi',
    'gyvas žmogus',
    'tikru žmogumi',
    'operatoriu', // operatoriumi / operatorius
    'su agentu',
    'su darbuotoju',
    'su konsultantu',
    'klientų aptarnavim',
    'sujunkite',
    'sujunk su',
  ],
}

/** True when the visitor message asks for a human. */
export function detectHandoffIntent(text: string, lang: BotLanguage = 'en'): boolean {
  const normalized = text.toLowerCase()
  const keywords = INTENT_KEYWORDS[lang] ?? INTENT_KEYWORDS.en
  // Always also check English keywords (visitors often type English on LT bots).
  const all = lang === 'en' ? keywords : [...keywords, ...INTENT_KEYWORDS.en]
  return all.some((k) => normalized.includes(k))
}

/** Localized acknowledgement shown when the conversation is escalated. */
export const HANDOFF_ACK: Record<BotLanguage, string> = {
  en: "Sure — let me connect you with someone from our team. They'll join this chat shortly.",
  lt: 'Žinoma — sujungiu jus su mūsų komandos nariu. Jis netrukus prisijungs prie pokalbio.',
}
