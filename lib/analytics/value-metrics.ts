/**
 * Pure helpers for the proof-of-value analytics: parsing display prices from
 * clicked-product payloads and classifying conversation times as in/out of
 * business hours. Kept dependency-free so they're trivially unit-testable.
 */

/**
 * Parse a formatted display price ("3,99 €", "€1,240.00", "1 240,00 €") into
 * cents. Product prices are stored as formatted strings (never numerics — see
 * the commerce sync design), so analytics has to parse defensively; returns
 * null for anything that doesn't look like a price.
 */
export function parsePriceToCents(price: string | null | undefined): number | null {
  if (!price) return null
  const cleaned = price.replace(/[^\d.,]/g, '')
  if (!cleaned || !/\d/.test(cleaned)) return null

  let intPart = cleaned
  let frac = ''
  const sepIdx = Math.max(cleaned.lastIndexOf(','), cleaned.lastIndexOf('.'))
  if (sepIdx >= 0) {
    const after = cleaned.slice(sepIdx + 1)
    // 1–2 digits after the last separator = decimal part; 3 digits reads as a
    // thousands group ("1.240" → 1240 €).
    if (/^\d{1,2}$/.test(after)) {
      intPart = cleaned.slice(0, sepIdx)
      frac = after
    }
  }
  const intDigits = intPart.replace(/[.,]/g, '')
  if (!/^\d*$/.test(intDigits)) return null
  const euros = parseInt(intDigits || '0', 10)
  const cents = frac === '' ? 0 : frac.length === 1 ? parseInt(frac, 10) * 10 : parseInt(frac, 10)
  const total = euros * 100 + cents
  return Number.isFinite(total) ? total : null
}

/** Format cents as a Euro amount for the dashboard ("1 240,50 €"). */
export function formatCentsEur(cents: number): string {
  return new Intl.NumberFormat('lt-LT', { style: 'currency', currency: 'EUR' }).format(cents / 100)
}

/** Per-bot working hours (from `config.businessHours`); fields are "HH:MM". */
export interface BusinessHours {
  start?: string
  end?: string
  tz?: string
}

// ponytail: Mon–Fri with a per-bot start/end; per-day schedules and a TZ
// picker only when a client asks.
export const DEFAULT_BUSINESS_HOURS = { start: '08:00', end: '17:00', tz: 'Europe/Vilnius' }

/** "HH:MM" → minutes since midnight, or null when malformed. */
export function parseHM(value: string | null | undefined): number | null {
  const m = /^([01]?\d|2[0-3]):([0-5]\d)$/.exec(value ?? '')
  return m ? Number(m[1]) * 60 + Number(m[2]) : null
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

/** Local hour (0–23), minutes since midnight, and weekday (0=Sun) in the TZ. */
export function localHourAndDay(
  iso: string,
  tz: string = DEFAULT_BUSINESS_HOURS.tz,
): { hour: number; minutes: number; weekday: number } {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    hour: 'numeric',
    minute: 'numeric',
    hourCycle: 'h23',
    weekday: 'short',
  }).formatToParts(new Date(iso))
  const hour = Number(parts.find((p) => p.type === 'hour')?.value ?? '0')
  const minute = Number(parts.find((p) => p.type === 'minute')?.value ?? '0')
  const weekday = WEEKDAYS.indexOf(parts.find((p) => p.type === 'weekday')?.value ?? 'Mon')
  return { hour, minutes: hour * 60 + minute, weekday: weekday === -1 ? 1 : weekday }
}

/** True when the timestamp falls outside Mon–Fri working hours (local TZ). */
export function isAfterHours(iso: string, hours?: BusinessHours): boolean {
  const tz = hours?.tz ?? DEFAULT_BUSINESS_HOURS.tz
  const { minutes, weekday } = localHourAndDay(iso, tz)
  if (weekday === 0 || weekday === 6) return true
  const start = parseHM(hours?.start) ?? parseHM(DEFAULT_BUSINESS_HOURS.start)!
  const end = parseHM(hours?.end) ?? parseHM(DEFAULT_BUSINESS_HOURS.end)!
  return minutes < start || minutes >= end
}
