import { describe, it, expect } from 'vitest'
import { toCsv } from '@/lib/csv'

describe('toCsv', () => {
  it('returns only header row for empty rows array', () => {
    const result = toCsv([], ['name', 'email'])
    expect(result).toBe('name,email')
  })

  it('returns header plus data rows', () => {
    const rows = [{ name: 'Alice', email: 'alice@example.com' }]
    const result = toCsv(rows, ['name', 'email'])
    expect(result).toBe('name,email\nAlice,alice@example.com')
  })

  it('quotes fields containing commas', () => {
    const rows = [{ value: 'hello, world' }]
    const result = toCsv(rows, ['value'])
    expect(result).toBe('value\n"hello, world"')
  })

  it('quotes fields containing double quotes and escapes them', () => {
    const rows = [{ value: 'say "hello"' }]
    const result = toCsv(rows, ['value'])
    expect(result).toBe('value\n"say ""hello"""')
  })

  it('quotes fields containing newlines', () => {
    const rows = [{ value: 'line1\nline2' }]
    const result = toCsv(rows, ['value'])
    expect(result).toBe('value\n"line1\nline2"')
  })

  it('quotes fields containing carriage-return newlines', () => {
    const rows = [{ value: 'line1\r\nline2' }]
    const result = toCsv(rows, ['value'])
    expect(result).toBe('value\n"line1\r\nline2"')
  })

  it('uses empty string for missing keys', () => {
    const rows = [{ name: 'Alice' }]
    const result = toCsv(rows, ['name', 'email'])
    expect(result).toBe('name,email\nAlice,')
  })

  it('respects column ordering from the columns parameter', () => {
    const rows = [{ b: 'B', a: 'A' }]
    const result = toCsv(rows, ['a', 'b'])
    expect(result).toBe('a,b\nA,B')
  })

  it('handles multiple rows', () => {
    const rows = [
      { name: 'Alice', age: '30' },
      { name: 'Bob', age: '25' },
    ]
    const result = toCsv(rows, ['name', 'age'])
    expect(result).toBe('name,age\nAlice,30\nBob,25')
  })

  it('handles fields with only whitespace without quoting', () => {
    const rows = [{ value: '  ' }]
    const result = toCsv(rows, ['value'])
    expect(result).toBe('value\n  ')
  })
})
