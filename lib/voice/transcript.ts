import type { BotLanguage } from '@/lib/types'

const LT_NUMBER_VALUES: Readonly<Record<string, number>> = Object.freeze({
  nulis: 0,
  vienas: 1,
  viena: 1,
  vieną: 1,
  vieno: 1,
  du: 2,
  dvi: 2,
  trys: 3,
  keturi: 4,
  keturios: 4,
  penki: 5,
  penkios: 5,
  šeši: 6,
  šešios: 6,
  septyni: 7,
  septynios: 7,
  aštuoni: 8,
  aštuonios: 8,
  devyni: 9,
  devynios: 9,
  dešimt: 10,
  vienuolika: 11,
  dvylika: 12,
  trylika: 13,
  keturiolika: 14,
  penkiolika: 15,
  šešiolika: 16,
  septyniolika: 17,
  aštuoniolika: 18,
  devyniolika: 19,
  dvidešimt: 20,
  trisdešimt: 30,
  keturiasdešimt: 40,
  penkiasdešimt: 50,
  šešiasdešimt: 60,
  septyniasdešimt: 70,
  aštuoniasdešimt: 80,
  devyniasdešimt: 90,
})

const EN_NUMBER_VALUES: Readonly<Record<string, number>> = Object.freeze({
  zero: 0,
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  eleven: 11,
  twelve: 12,
  thirteen: 13,
  fourteen: 14,
  fifteen: 15,
  sixteen: 16,
  seventeen: 17,
  eighteen: 18,
  nineteen: 19,
  twenty: 20,
  thirty: 30,
  forty: 40,
  fifty: 50,
  sixty: 60,
  seventy: 70,
  eighty: 80,
  ninety: 90,
})

function numberPattern(values: Readonly<Record<string, number>>): string {
  return Object.keys(values)
    .sort((a, b) => b.length - a.length)
    .join('|')
}

const LT_NUMBER = numberPattern(LT_NUMBER_VALUES)
const EN_NUMBER = numberPattern(EN_NUMBER_VALUES)

function parseNumberWords(value: string, values: Readonly<Record<string, number>>): number | null {
  const tokens = value.toLocaleLowerCase().split(/[\s-]+/).filter(Boolean)
  if (!tokens.length) return null
  let total = 0
  for (const token of tokens) {
    const number = values[token]
    if (number === undefined) return null
    total += number
  }
  return total
}

function decimalMetres(whole: number, centimetres: number, separator: ',' | '.'): string {
  const fraction = String(centimetres).padStart(2, '0').replace(/0$/, '')
  return `${whole}${separator}${fraction} m`
}

function normalizeLithuanianMeasurements(text: string): string {
  let normalized = text

  // Conversational Lithuanian commonly omits "vienas": "metro aštuoniasdešimt"
  // means one metre and eighty centimetres.
  normalized = normalized.replace(
    new RegExp(`\\bmetr(?:o|as|ą)\\s+((?:${LT_NUMBER})(?:\\s+(?:${LT_NUMBER}))?)\\b`, 'giu'),
    (match, fractionWords: string) => {
      const centimetres = parseNumberWords(fractionWords, LT_NUMBER_VALUES)
      return centimetres !== null && centimetres >= 0 && centimetres < 100
        ? decimalMetres(1, centimetres, ',')
        : match
    },
  )

  normalized = normalized.replace(
    new RegExp(
      `\\b((?:${LT_NUMBER})(?:\\s+(?:${LT_NUMBER}))?)\\s+` +
        '(metr(?:as|ai|ą|us|ų|u)|centimetr(?:as|ai|ą|us|ų|u)|milimetr(?:as|ai|ą|us|ų|u))\\b',
      'giu',
    ),
    (match, numberWords: string, unit: string) => {
      const number = parseNumberWords(numberWords, LT_NUMBER_VALUES)
      if (number === null) return match
      const canonicalUnit = unit.toLocaleLowerCase().startsWith('centi')
        ? 'cm'
        : unit.toLocaleLowerCase().startsWith('mili')
          ? 'mm'
          : 'm'
      return `${number} ${canonicalUnit}`
    },
  )

  return normalized.replace(
    /(\d+(?:[.,]\d+)?\s*m)\s+(?:ant|x|×)\s+(\d+(?:[.,]\d+)?\s*m)\b/giu,
    '$1 × $2',
  )
}

function normalizeEnglishMeasurements(text: string): string {
  let normalized = text.replace(
    new RegExp(
      `\\b((?:${EN_NUMBER})(?:[ -](?:${EN_NUMBER}))?)\\s+point\\s+` +
        `((?:${EN_NUMBER})(?:[ -](?:${EN_NUMBER}))?)\\s+` +
        '(met(?:er|re)s?|centimet(?:er|re)s?|millimet(?:er|re)s?)\\b',
      'giu',
    ),
    (match, wholeWords: string, fractionWords: string, unit: string) => {
      const whole = parseNumberWords(wholeWords, EN_NUMBER_VALUES)
      const fraction = parseNumberWords(fractionWords, EN_NUMBER_VALUES)
      if (whole === null || fraction === null) return match
      const canonicalUnit = unit.toLocaleLowerCase().startsWith('centi')
        ? 'cm'
        : unit.toLocaleLowerCase().startsWith('milli')
          ? 'mm'
          : 'm'
      return `${whole}.${fraction} ${canonicalUnit}`
    },
  )

  normalized = normalized.replace(
    new RegExp(
      `\\b((?:${EN_NUMBER})(?:[ -](?:${EN_NUMBER}))?)\\s+` +
        '(met(?:er|re)s?|centimet(?:er|re)s?|millimet(?:er|re)s?)\\b',
      'giu',
    ),
    (match, numberWords: string, unit: string) => {
      const number = parseNumberWords(numberWords, EN_NUMBER_VALUES)
      if (number === null) return match
      const canonicalUnit = unit.toLocaleLowerCase().startsWith('centi')
        ? 'cm'
        : unit.toLocaleLowerCase().startsWith('milli')
          ? 'mm'
          : 'm'
      return `${number} ${canonicalUnit}`
    },
  )

  return normalized.replace(
    /(\d+(?:\.\d+)?\s*m)\s+(?:by|x|×)\s+(\d+(?:\.\d+)?\s*m)\b/giu,
    '$1 × $2',
  )
}

/** Convert spoken measurements to compact digits for the visible transcript. */
export function normalizeVoiceTranscript(text: string, language: BotLanguage): string {
  return language === 'lt'
    ? normalizeLithuanianMeasurements(text)
    : normalizeEnglishMeasurements(text)
}

/**
 * Search documents usually store furniture dimensions in centimetres. Keep the
 * visible transcript human-friendly, but canonicalize metres to centimetres at
 * the voice-search boundary so multiple numeric constraints survive retrieval.
 */
export function normalizeVoiceSearchQuery(query: string, language: BotLanguage): string {
  return normalizeVoiceTranscript(query, language).replace(
    /(\d+)(?:[.,](\d+))?\s*m\b/giu,
    (_match, whole: string, fraction?: string) => {
      const metres = Number(`${whole}.${fraction ?? '0'}`)
      return `${Math.round(metres * 100)} cm`
    },
  )
}
