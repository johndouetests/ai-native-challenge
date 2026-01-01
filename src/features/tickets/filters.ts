import type { LocationQuery, LocationQueryRaw } from 'vue-router'
import {
  PRIORITIES,
  PRIORITY_RANK,
  SORTS,
  STATUSES,
  type SortKey,
  type TicketPriority,
  type TicketStatus,
  type TicketSummary,
} from '@/lib/types'

export interface TicketFilters {
  status: TicketStatus[]
  priority: TicketPriority[]
  /** `me`, `unassigned`, an agent id, or null for anyone. */
  assignee: string | null
  q: string
  sort: SortKey
}

export const DEFAULT_SORT: SortKey = 'updated'
export const SEARCH_DEBOUNCE_MS = 300

function first(value: LocationQuery[string]): string {
  const v = Array.isArray(value) ? value[0] : value
  return typeof v === 'string' ? v : ''
}

function parseList<T extends string>(raw: string, allowed: readonly T[]): T[] {
  const parts = new Set(raw.split(',').map((s) => s.trim()))
  return allowed.filter((v) => parts.has(v))
}

export function parseFilters(query: LocationQuery): TicketFilters {
  const sort = first(query.sort) as SortKey
  const assignee = first(query.assignee)
  return {
    status: parseList(first(query.status), STATUSES),
    priority: parseList(first(query.priority), PRIORITIES),
    assignee: assignee || null,
    q: first(query.q),
    sort: SORTS.includes(sort) ? sort : DEFAULT_SORT,
  }
}

/** URL query for the filters; defaults are omitted so a clean inbox has a clean URL. */
export function filtersToQuery(filters: TicketFilters): LocationQueryRaw {
  const query: LocationQueryRaw = {}
  if (filters.status.length) query.status = STATUSES.filter((s) => filters.status.includes(s)).join(',')
  if (filters.priority.length) query.priority = PRIORITIES.filter((p) => filters.priority.includes(p)).join(',')
  if (filters.assignee) query.assignee = filters.assignee
  if (filters.q.trim()) query.q = filters.q
  if (filters.sort !== DEFAULT_SORT) query.sort = filters.sort
  return query
}

export function filtersKey(filters: TicketFilters): string {
  return JSON.stringify(filtersToQuery(filters))
}

export function hasActiveFilters(filters: TicketFilters): boolean {
  return filters.status.length > 0 || filters.priority.length > 0 || filters.assignee !== null || filters.q.trim() !== ''
}

export function toApiParams(filters: TicketFilters): Record<string, string | undefined> {
  return {
    status: filters.status.length ? filters.status.join(',') : undefined,
    priority: filters.priority.length ? filters.priority.join(',') : undefined,
    assigneeId: filters.assignee ?? undefined,
    q: filters.q.trim() || undefined,
    sort: filters.sort,
  }
}

/** Same rules as the API: used to place realtime updates into the current list. */
export function matchesFilters(ticket: TicketSummary, filters: TicketFilters, meId: string | null): boolean {
  if (filters.status.length && !filters.status.includes(ticket.status)) return false
  if (filters.priority.length && !filters.priority.includes(ticket.priority)) return false
  if (filters.assignee === 'unassigned' && ticket.assigneeId !== null) return false
  if (filters.assignee === 'me' && (meId === null || ticket.assigneeId !== meId)) return false
  if (filters.assignee && filters.assignee !== 'me' && filters.assignee !== 'unassigned') {
    if (ticket.assigneeId !== filters.assignee) return false
  }
  const q = filters.q.trim().toLowerCase()
  if (q) {
    const haystack = `${ticket.key} ${ticket.subject} ${ticket.requester.name}`.toLowerCase()
    if (!haystack.includes(q)) return false
  }
  return true
}

function idNumber(id: string): number {
  return Number(id.replace(/\D/g, ''))
}

/** Negative when `a` is listed before `b` for the given sort. */
export function compareTickets(a: TicketSummary, b: TicketSummary, sort: SortKey): number {
  const updated = Date.parse(b.updatedAt) - Date.parse(a.updatedAt)
  let diff = 0
  if (sort === 'created') diff = Date.parse(b.createdAt) - Date.parse(a.createdAt)
  else if (sort === 'priority') diff = PRIORITY_RANK[b.priority] - PRIORITY_RANK[a.priority] || updated
  else diff = updated
  return diff || idNumber(a.id) - idNumber(b.id)
}
