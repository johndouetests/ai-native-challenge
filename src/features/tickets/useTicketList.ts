import { useCallback, useEffect, useLayoutEffect, useRef } from 'react'
import { isAbortError, request } from '@/lib/api'
import type { RealtimeEvent, TicketPage, TicketSummary } from '@/lib/types'
import { useStateRef } from '@/lib/useStateRef'
import { useRealtime } from '@/features/realtime/useRealtime'
import { useDirectory } from './directory'
import { compareTickets, matchesFilters, toApiParams, type TicketFilters } from './filters'
import { inbox } from './inbox'

export type ListStatus = 'loading' | 'ready' | 'error'

export const PAGE_SIZE = 25

export interface TicketListState {
  items: TicketSummary[]
  nextCursor: string | null
  status: ListStatus
  loadingMore: boolean
  loadMoreFailed: boolean
  /** Changes that arrive while the first page is loading; applied once it is in. */
  pending: TicketSummary[]
}

const INITIAL: TicketListState = {
  items: [],
  nextCursor: null,
  status: 'loading',
  loadingMore: false,
  loadMoreFailed: false,
  pending: [],
}

export function fetchTickets(filters: TicketFilters, cursor: string | null, signal: AbortSignal) {
  return request<TicketPage>('/tickets', {
    query: { ...toApiParams(filters), cursor, limit: PAGE_SIZE },
    signal,
  })
}

/** True when `a` is a more recent state of the same ticket than `b`. */
function isNewer(a: TicketSummary, b: TicketSummary): boolean {
  return a.version > b.version || (a.version === b.version && Date.parse(a.updatedAt) > Date.parse(b.updatedAt))
}

/** Places a changed ticket according to the filters and sort (FR-L-13). Pure. */
export function placeTicket(
  state: TicketListState,
  ticket: TicketSummary,
  filters: TicketFilters,
  meId: string | null,
): TicketListState {
  if (state.status === 'loading') return { ...state, pending: [...state.pending, ticket] }
  if (state.status !== 'ready') return state
  const known = state.items.find((t) => t.id === ticket.id)
  if (known && isNewer(known, ticket)) return state
  const rest = state.items.filter((t) => t.id !== ticket.id)
  const existed = rest.length !== state.items.length
  if (!matchesFilters(ticket, filters, meId)) {
    return existed ? { ...state, items: rest } : state
  }
  const position = rest.findIndex((t) => compareTickets(ticket, t, filters.sort) < 0)
  if (position === -1) {
    // Belongs after the loaded rows: a later page will bring it.
    return { ...state, items: state.nextCursor === null ? [...rest, ticket] : rest }
  }
  return { ...state, items: [...rest.slice(0, position), ticket, ...rest.slice(position)] }
}

function markRead(state: TicketListState, ticketId: string): TicketListState {
  const index = state.items.findIndex((t) => t.id === ticketId)
  if (index === -1 || !state.items[index].unread) return state
  const items = state.items.slice()
  items[index] = { ...items[index], unread: false }
  return { ...state, items }
}

export function useTicketList(filters: TicketFilters) {
  const [state, setState, stateRef] = useStateRef<TicketListState>(INITIAL)
  const meId = useDirectory().me?.id ?? null
  // Every request of the current query shares this controller; a new query aborts it.
  const controllerRef = useRef<AbortController | null>(null)
  const meIdRef = useRef(meId)
  useEffect(() => {
    meIdRef.current = meId
  }, [meId])

  const reload = useCallback(async () => {
    controllerRef.current?.abort()
    const current = new AbortController()
    controllerRef.current = current
    setState(INITIAL)
    try {
      const page = await fetchTickets(filters, null, current.signal)
      if (current.signal.aborted) return
      inbox.setUnreadCount(page.meta.unreadCount, page.items)
      setState((prev) => {
        let next: TicketListState = { ...INITIAL, items: inbox.withLocalReads(page.items), nextCursor: page.nextCursor, status: 'ready' }
        for (const ticket of prev.pending) next = placeTicket(next, ticket, filters, meIdRef.current)
        return next
      })
    } catch (err) {
      if (isAbortError(err) || current.signal.aborted) return
      setState((prev) => ({ ...prev, status: 'error', pending: [] }))
    }
  }, [filters, setState])

  const loadMore = useCallback(async () => {
    const current = new AbortController()
    const { nextCursor: cursor, loadingMore, status } = stateRef.current
    if (!current || !cursor || loadingMore || status !== 'ready') return
    setState((prev) => ({ ...prev, loadingMore: true, loadMoreFailed: false }))
    try {
      const page = await fetchTickets(filters, cursor, current.signal)
      if (current.signal.aborted) return
      inbox.setUnreadCount(page.meta.unreadCount, page.items)
      setState((prev) => {
        const seen = new Set(prev.items.map((t) => t.id))
        return {
          ...prev,
          items: [...prev.items, ...inbox.withLocalReads(page.items).filter((t) => !seen.has(t.id))],
          nextCursor: page.nextCursor,
          loadingMore: false,
        }
      })
    } catch (err) {
      if (isAbortError(err) || current.signal.aborted) return
      setState((prev) => ({ ...prev, loadingMore: false, loadMoreFailed: true }))
    }
  }, [filters, setState, stateRef])

  const applyTicket = useCallback(
    (ticket: TicketSummary) => setState((prev) => placeTicket(prev, ticket, filters, meId)),
    [filters, meId, setState],
  )

  const onEvent = useCallback(
    (event: RealtimeEvent) => {
      if (event.type === 'ticket.created' || event.type === 'ticket.updated') applyTicket(event.data)
    },
    [applyTicket],
  )
  const onResync = useCallback(() => void reload(), [reload])
  useRealtime({ onEvent, onResync })

  useEffect(
    () =>
      inbox.subscribe((change) => {
        if (change.type === 'ticket') applyTicket(change.ticket)
        else setState((prev) => markRead(prev, change.ticketId))
      }),
    [applyTicket, setState],
  )

  // A new query (filters from the URL) reloads from the first page as soon as it is committed;
  // leaving aborts requests.
  useLayoutEffect(() => {
    void reload()
    return () => controllerRef.current?.abort()
  }, [reload])

  return { ...state, reload, loadMore }
}
