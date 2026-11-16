import { describe, it, expect } from 'vitest'
import { chooseTables, bucketsFor, dayHours } from '../services/seating/seatingService.js'
import { normalizeMobile } from '../utils/helpers.js'

const t = (tableNumber, capacity, combinationGroup) => ({ _id: tableNumber, tableNumber, capacity, combinationGroup })

describe('seating engine units', () => {
  it('chooses the smallest table that fits', () => {
    expect(chooseTables([t('A', 6), t('B', 2), t('C', 4)], 3).map((x) => x.tableNumber)).toEqual(['C'])
  })
  it('combines tables only within a configured group', () => {
    expect(chooseTables([t('A', 4), t('B', 4)], 6)).toBeNull()
    expect(chooseTables([t('A', 4, 'g'), t('B', 4, 'g')], 6)).toHaveLength(2)
  })
  it('computes lock buckets including buffer', () => {
    expect(bucketsFor(19 * 60, 20 * 60 + 30, 15)).toHaveLength(7)
  })
  it('honours holidays and closed days', () => {
    const settings = { openingHours: [{ day: 0, closed: true }], holidays: [{ date: '2026-12-25', closed: true, note: 'Christmas' }] }
    expect(dayHours(settings, '2026-12-25').closed).toBe(true)
    expect(dayHours(settings, '2026-11-15').closed).toBe(true) // Sunday
  })
  it('normalises Indian mobile numbers', () => {
    expect(normalizeMobile('+91 98765-43210')).toBe('9876543210')
    expect(normalizeMobile('09876543210')).toBe('9876543210')
    expect(normalizeMobile('1234567890')).toBeNull()
  })
})
