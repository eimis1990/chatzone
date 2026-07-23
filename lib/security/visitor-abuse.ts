export type VisitorBlockReason =
  | 'directed_abuse'
  | 'sexual_spam'
  | 'message_spam'
  | 'prompt_attack'
  | 'manual_review'

export interface AbuseAssessment {
  shouldBlock: boolean
  reason?: Exclude<VisitorBlockReason, 'manual_review'>
  signals: string[]
}

const DIRECTED_ABUSE = [
  /\b(?:you(?:'re| are)?|u r|bot|assistant|agent|fox|mascot)\b.{0,40}\b(?:retard(?:ed)?|idiot|moron|stupid|dumb|worthless|bitch)\b/i,
  /\b(?:retard(?:ed)?|idiot|moron|stupid|dumb|worthless|bitch)\b.{0,40}\b(?:you|bot|assistant|agent|fox|mascot)\b/i,
]

const DIRECTED_THREAT = [
  /\b(?:i(?:'ll| will| am going to)?|we(?:'ll| will)?)\b.{0,24}\b(?:kill|hurt|attack|destroy)\b.{0,32}\b(?:you|your team|the team|staff|agent|bot)\b/i,
]

const SEVERE_PROMPT_ATTACK = [
  /\b(?:ignore|disregard|override|bypass|forget)\b.{0,50}\b(?:instructions?|rules?|system prompt|guardrails?|policy|policies)\b/i,
  /\b(?:reveal|show|print|repeat|quote|give|tell)\b.{0,50}\b(?:system prompt|hidden instructions?|developer message|api key|credentials?|secrets?|confidential information)\b/i,
  /\b(?:system prompt|hidden instructions?|developer message)\b.{0,50}\b(?:reveal|show|print|repeat|quote|give|tell)\b/i,
  /\b(?:jailbreak|prompt injection)\b/i,
  /\b(?:most secret thing|secret thing you know|confidential thing you know)\b/i,
]

const CAPABILITY_PROBE = [
  /\bwhat (?:ai |language )?model (?:are you|do you use|powers you)\b/i,
  /\bwhat (?:specific )?tools? (?:can|do) you (?:call|use|have)\b/i,
  /\b(?:list|name|enumerate)\b.{0,24}\b(?:your )?(?:tools?|functions?|capabilities)\b/i,
  /\b(?:internal|backend|underlying)\b.{0,24}\b(?:tools?|stack|architecture|instructions?|model)\b/i,
]

const ROLE_HIJACK = [
  /\bcomplete (?:this|the) sentence\b.{0,120}\b(?:as an assistant|i(?:'m| am) here to help|my goal as an assistant|secret|system prompt)\b/i,
  /\b(?:pretend|act|respond) as\b.{0,40}\b(?:system|developer|unrestricted|unfiltered)\b/i,
]

const EXPLICIT_SEXUAL = /\b(?:porn|pornhub|sexual(?:ly)? explicit|xxx)\b/i

function normalize(value: string): string {
  return value.normalize('NFKC').toLowerCase().replace(/\s+/g, ' ').trim()
}

function matchesAny(value: string, patterns: RegExp[]): boolean {
  return patterns.some((pattern) => pattern.test(value))
}

function isRepeatedFlood(value: string): boolean {
  const normalized = normalize(value)
  const clauses = normalized
    .split(/[.!?]+/)
    .map((clause) => clause.trim())
    .filter((clause) => clause.length >= 8)
  const frequencies = new Map<string, number>()
  for (const clause of clauses) {
    frequencies.set(clause, (frequencies.get(clause) ?? 0) + 1)
  }
  if ([...frequencies.values()].some((count) => count >= 4)) return true

  const words = normalized.split(/\s+/).filter(Boolean)
  if (words.length < 40) return false
  return new Set(words).size / words.length < 0.22
}

function isProbe(value: string): boolean {
  return matchesAny(value, CAPABILITY_PROBE) || matchesAny(value, ROLE_HIJACK) || matchesAny(value, SEVERE_PROMPT_ATTACK)
}

/**
 * High-confidence, deterministic abuse guard.
 *
 * Ordinary criticism, profanity about a product, adult-store policy questions,
 * and one-off technical questions are intentionally not enough to block. The
 * guard acts immediately on directed slurs/threats, obvious prompt extraction,
 * or repeated-message floods, and requires a sustained sequence for softer
 * capability/role probes.
 */
export function assessVisitorAbuse(
  currentMessage: string,
  recentUserMessages: string[] = [],
): AbuseAssessment {
  const signals: string[] = []

  if (matchesAny(currentMessage, DIRECTED_ABUSE) || matchesAny(currentMessage, DIRECTED_THREAT)) {
    signals.push('directed_abuse')
    return { shouldBlock: true, reason: 'directed_abuse', signals }
  }

  if (isRepeatedFlood(currentMessage)) {
    const sexual = EXPLICIT_SEXUAL.test(currentMessage)
    signals.push(sexual ? 'repeated_explicit_content' : 'repeated_message_flood')
    return {
      shouldBlock: true,
      reason: sexual ? 'sexual_spam' : 'message_spam',
      signals,
    }
  }

  if (matchesAny(currentMessage, SEVERE_PROMPT_ATTACK)) {
    signals.push('explicit_prompt_extraction')
    return { shouldBlock: true, reason: 'prompt_attack', signals }
  }

  const capabilityProbe = matchesAny(currentMessage, CAPABILITY_PROBE)
  const roleHijack = matchesAny(currentMessage, ROLE_HIJACK)
  if (capabilityProbe) signals.push('capability_probe')
  if (roleHijack) signals.push('role_hijack')

  if (capabilityProbe || roleHijack) {
    const priorProbeCount = recentUserMessages.filter(isProbe).length
    if (priorProbeCount >= (roleHijack ? 2 : 3)) {
      signals.push('sustained_probe_sequence')
      return { shouldBlock: true, reason: 'prompt_attack', signals }
    }
  }

  return { shouldBlock: false, signals }
}
