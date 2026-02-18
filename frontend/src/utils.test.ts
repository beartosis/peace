import { describe, it, expect } from 'vitest'
import { formatDuration, computeStepDuration, formatTimestamp, parseJsonArray, parsePrNumbers } from './utils'

describe('formatDuration', () => {
  it('returns -- for null', () => {
    expect(formatDuration(null)).toBe('--')
  })

  it('returns -- for undefined', () => {
    expect(formatDuration(undefined)).toBe('--')
  })

  it('returns -- for negative values', () => {
    expect(formatDuration(-1)).toBe('--')
  })

  it('formats zero seconds', () => {
    expect(formatDuration(0)).toBe('0s')
  })

  it('formats seconds under a minute', () => {
    expect(formatDuration(45)).toBe('45s')
  })

  it('formats exact minutes', () => {
    expect(formatDuration(60)).toBe('1m 00s')
  })

  it('formats minutes and seconds', () => {
    expect(formatDuration(180)).toBe('3m 00s')
    expect(formatDuration(842)).toBe('14m 02s')
  })

  it('formats hours', () => {
    expect(formatDuration(3661)).toBe('1h 01m')
  })
})

describe('computeStepDuration', () => {
  it('returns null for missing start', () => {
    expect(computeStepDuration(null, '2026-02-17T09:00:00Z')).toBeNull()
  })

  it('returns null for missing end', () => {
    expect(computeStepDuration('2026-02-17T08:00:00Z', null)).toBeNull()
  })

  it('returns null for invalid dates', () => {
    expect(computeStepDuration('not-a-date', '2026-02-17T09:00:00Z')).toBeNull()
  })

  it('computes duration in seconds', () => {
    expect(computeStepDuration(
      '2026-02-17T08:00:00Z',
      '2026-02-17T08:12:00Z',
    )).toBe(720)
  })
})

describe('formatTimestamp', () => {
  it('returns -- for null', () => {
    expect(formatTimestamp(null)).toBe('--')
  })

  it('returns -- for invalid date', () => {
    expect(formatTimestamp('not-a-date')).toBe('--')
  })

  it('formats a valid ISO timestamp', () => {
    const result = formatTimestamp('2026-02-17T01:48:27-08:00')
    expect(result).toContain('Feb')
    expect(result).toContain('17')
  })
})

describe('parseJsonArray', () => {
  it('returns empty array for null', () => {
    expect(parseJsonArray(null)).toEqual([])
  })

  it('returns empty array for invalid JSON', () => {
    expect(parseJsonArray('not json')).toEqual([])
  })

  it('returns empty array for non-array JSON', () => {
    expect(parseJsonArray('"hello"')).toEqual([])
    expect(parseJsonArray('42')).toEqual([])
    expect(parseJsonArray('{}')).toEqual([])
  })

  it('returns parsed array for valid JSON array of strings', () => {
    expect(parseJsonArray('["a", "b"]')).toEqual(['a', 'b'])
  })

  it('returns parsed array for valid JSON array of objects', () => {
    expect(parseJsonArray('[{"decision":"Use X"}]')).toEqual([{ decision: 'Use X' }])
  })
})

describe('parsePrNumbers', () => {
  it('returns empty array for null', () => {
    expect(parsePrNumbers(null)).toEqual([])
  })

  it('returns empty array for invalid JSON', () => {
    expect(parsePrNumbers('not json')).toEqual([])
  })

  it('returns empty array for non-array JSON', () => {
    expect(parsePrNumbers('"hello"')).toEqual([])
  })

  it('parses array of numbers', () => {
    expect(parsePrNumbers('[195, 196]')).toEqual([195, 196])
  })

  it('filters out non-numbers', () => {
    expect(parsePrNumbers('[195, "abc", 196]')).toEqual([195, 196])
  })
})
