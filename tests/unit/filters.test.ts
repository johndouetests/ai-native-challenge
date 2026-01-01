import { describe, expect, it } from 'vitest'
import { compareTickets, filtersToSearch, matchesFilters, parseFilters } from '@/features/tickets/filters'
import { ticket } from './factories'

const params = (query: Record<string, string>) => new URLSearchParams(query)

describe('filters in the URL', () => {
  it('round-trips through the query string and drops defaults', () => {
    const filters = parseFilters(params({ status: 'pending,open,bogus', priority: 'urgent', assignee: 'me', q: 'invoice' }))
    expect(filters).toEqual({ status: ['open', 'pending'], priority: ['urgent'], assignee: 'me', q: 'invoice', sort: 'updated' })
    expect(filtersToSearch(filters)).toBe('?status=open,pending&priority=urgent&assignee=me&q=invoice')
    expect(filtersToSearch(parseFilters(params({})))).toBe('')
  })
})

describe('matchesFilters', () => {
  it('applies status, assignee and search like the API', () => {
    const t = ticket({ status: 'pending', assigneeId: null })
    const base = parseFilters(params({}))
    expect(matchesFilters(t, { ...base, status: ['pending'] }, 'a_1')).toBe(true)
    expect(matchesFilters(t, { ...base, status: ['open'] }, 'a_1')).toBe(false)
    expect(matchesFilters(t, { ...base, assignee: 'unassigned' }, 'a_1')).toBe(true)
    expect(matchesFilters(t, { ...base, assignee: 'me' }, 'a_1')).toBe(false)
    expect(matchesFilters(t, { ...base, q: 'dsk-1042' }, 'a_1')).toBe(true)
    expect(matchesFilters(t, { ...base, q: 'alex' }, 'a_1')).toBe(true)
  })
})

describe('compareTickets', () => {
  it('puts urgent before low and breaks ties by updatedAt', () => {
    const urgent = ticket({ id: 't_1', priority: 'urgent', updatedAt: '2026-03-01T00:00:00Z' })
    const low = ticket({ id: 't_2', priority: 'low', updatedAt: '2026-03-09T00:00:00Z' })
    const urgentNewer = ticket({ id: 't_3', priority: 'urgent', updatedAt: '2026-03-05T00:00:00Z' })
    const sorted = [low, urgent, urgentNewer].sort((a, b) => compareTickets(a, b, 'priority'))
    expect(sorted.map((t) => t.id)).toEqual(['t_3', 't_1', 't_2'])
  })
})
