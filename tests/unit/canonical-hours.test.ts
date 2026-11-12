import { describe, it, expect } from 'vitest'
import { dropAbsenceLines, expandRomanWeekdays, ungroundedHours } from '@/lib/ingestion/canonical'

describe('ungroundedHours', () => {
  const excerpts = 'Darbo laikas:\nI – V 09:00 – 17:00\nVI 11:00 – 16:00\nUžsakymai iki 14:00'

  it('accepts hours the excerpts state, whatever the zero padding', () => {
    const page = '## Santrauka (LT)\n- Pirmadienis–Penktadienis: 9:00–17:00\n- Šeštadienis: 11:00–16:00'
    expect(ungroundedHours(page, excerpts)).toEqual([])
  })

  it('flags a clock time the excerpts never mention', () => {
    expect(ungroundedHours('## Santrauka (LT)\n- Sekmadienis: 10:00–15:00', excerpts)).toEqual(['10:00', '15:00'])
  })

  it('flags a "closed" day the excerpts never mention (the 2026-11-12 invention)', () => {
    const page = '## Santrauka (LT)\n- Šeštadienis–Sekmadienis: Nedirbame\n## Summary (EN)\n- Saturday–Sunday: Closed'
    expect(ungroundedHours(page, 'Susisiekite darbo valandomis.')).toEqual(['closed'])
    expect(ungroundedHours(page, 'Sekmadieniais nedirbame.')).toEqual([])
  })

  it('ignores 12-hour times in the English section', () => {
    const page = '## Santrauka (LT)\n- 09:00–17:00\n## Summary (EN)\n- 9:00 AM–5:00 PM'
    expect(ungroundedHours(page, excerpts)).toEqual([])
  })
})

describe('expandRomanWeekdays', () => {
  it('names the days in each section language', () => {
    const page =
      '## Santrauka (LT)\n**Darbo laikas:**\nI – V 09:00 – 17:00\n- VI: 11:00 – 16:00\n- **VII** 11:00 – 16:00 (iki 12.20)\n' +
      '## Summary (EN)\nI-V 09:00 – 17:00'
    expect(expandRomanWeekdays(page)).toBe(
      '## Santrauka (LT)\n**Darbo laikas:**\nPirmadienis–Penktadienis 09:00 – 17:00\n- Šeštadienis: 11:00 – 16:00\n- **Sekmadienis** 11:00 – 16:00 (iki 12.20)\n' +
        '## Summary (EN)\nMonday–Friday 09:00 – 17:00',
    )
  })

  it('leaves numerals that are not in front of a clock time', () => {
    const page = '## Santrauka (LT)\nPVM LT 100013058016\nI etapas: užsakymas\nV. Pavardenis\nKaina 5 EUR, VIP 1.90 EUR'
    expect(expandRomanWeekdays(page)).toBe(page)
  })
})

describe('dropAbsenceLines', () => {
  it('removes "not specified" lines and keeps the rest', () => {
    const page = '- **Darbo valandos**: Nenurodytos.\n- El. paštas: a@b.lt\n- Įmonės kodas ir PVM informacija nėra pateikti.\n- Working hours: not specified'
    expect(dropAbsenceLines(page)).toBe('- El. paštas: a@b.lt')
  })
})
