import { describe, expect, it } from 'vitest'
import { formatDayLabel, formatRelative } from '@/lib/time'

// Tests run in Europe/Kyiv (UTC+2 in March).
const NOW = Date.parse('2026-03-09T10:00:00Z')

describe('formatRelative', () => {
  it('shows minutes and hours for the current day', () => {
    expect(formatRelative('2026-03-09T09:59:30Z', NOW)).toBe('just now')
    expect(formatRelative('2026-03-09T09:55:00Z', NOW)).toBe('5m ago')
    expect(formatRelative('2026-03-09T07:00:00Z', NOW)).toBe('3h ago')
  })

  it('uses local calendar days for Yesterday', () => {
    // 21:30 UTC on Mar 8 is 23:30 in Kyiv: still yesterday.
    expect(formatRelative('2026-03-08T21:30:00Z', NOW)).toBe('Yesterday')
    // 22:30 UTC on Mar 8 is 00:30 on Mar 9 in Kyiv: today.
    expect(formatRelative('2026-03-08T22:30:00Z', NOW)).toBe('11h ago')
  })

  it('shows a short date for older timestamps', () => {
    expect(formatRelative('2026-03-04T12:00:00Z', NOW)).toBe('Mar 4')
    expect(formatRelative('2025-12-30T12:00:00Z', NOW)).toBe('Dec 30, 2025')
  })
})

describe('formatDayLabel', () => {
  it('labels Today, Yesterday and older days', () => {
    expect(formatDayLabel('2026-03-09T08:00:00Z', NOW)).toBe('Today')
    expect(formatDayLabel('2026-03-08T08:00:00Z', NOW)).toBe('Yesterday')
    expect(formatDayLabel('2026-03-02T08:00:00Z', NOW)).toBe('Mon, Mar 2')
  })
})
