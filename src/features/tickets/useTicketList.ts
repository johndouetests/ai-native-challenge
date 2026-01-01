import { onScopeDispose, ref, shallowRef, watch, type Ref } from 'vue'
import { isAbortError, request } from '@/lib/api'
import type { TicketPage, TicketSummary } from '@/lib/types'
import { useRealtime } from '@/features/realtime/useRealtime'
import { useDirectory } from './directory'
import { compareTickets, filtersKey, matchesFilters, toApiParams, type TicketFilters } from './filters'
import { inbox } from './inbox'

export type ListStatus = 'loading' | 'ready' | 'error'

export const PAGE_SIZE = 25

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

export function useTicketList(filters: Ref<TicketFilters>) {
  const items = shallowRef<TicketSummary[]>([])
  const nextCursor = ref<string | null>(null)
  const status = ref<ListStatus>('loading')
  const loadingMore = ref(false)
  const loadMoreFailed = ref(false)
  const directory = useDirectory()
  const realtime = useRealtime()

  // Every request of the current query shares this controller; a new query aborts it.
  let controller: AbortController | null = null
  // Changes that arrive while the first page is loading are applied once it is in.
  let pending: TicketSummary[] = []

  async function reload() {
    controller?.abort()
    const current = new AbortController()
    controller = current
    status.value = 'loading'
    items.value = []
    nextCursor.value = null
    loadingMore.value = false
    loadMoreFailed.value = false
    pending = []
    try {
      const page = await fetchTickets(filters.value, null, current.signal)
      if (current.signal.aborted) return
      items.value = inbox.withLocalReads(page.items)
      nextCursor.value = page.nextCursor
      inbox.setUnreadCount(page.meta.unreadCount, page.items)
      status.value = 'ready'
      const queued = pending
      pending = []
      for (const ticket of queued) applyTicket(ticket)
    } catch (err) {
      if (isAbortError(err) || current.signal.aborted) return
      status.value = 'error'
    }
  }

  async function loadMore() {
    const current = new AbortController()
    const cursor = nextCursor.value
    if (!current || !cursor || loadingMore.value || status.value !== 'ready') return
    loadingMore.value = true
    loadMoreFailed.value = false
    try {
      const page = await fetchTickets(filters.value, cursor, current.signal)
      if (current.signal.aborted) return
      const seen = new Set(items.value.map((t) => t.id))
      items.value = [...items.value, ...inbox.withLocalReads(page.items).filter((t) => !seen.has(t.id))]
      nextCursor.value = page.nextCursor
      inbox.setUnreadCount(page.meta.unreadCount, page.items)
    } catch (err) {
      if (isAbortError(err) || current.signal.aborted) return
      loadMoreFailed.value = true
    } finally {
      if (!current.signal.aborted) loadingMore.value = false
    }
  }

  /** Places a changed ticket according to the current filters and sort (FR-L-13). */
  function applyTicket(ticket: TicketSummary) {
    if (status.value === 'loading') {
      pending.push(ticket)
      return
    }
    if (status.value !== 'ready') return
    const known = items.value.find((t) => t.id === ticket.id)
    if (known && isNewer(known, ticket)) return
    const rest = items.value.filter((t) => t.id !== ticket.id)
    const existed = rest.length !== items.value.length
    if (!matchesFilters(ticket, filters.value, directory.me?.id ?? null)) {
      if (existed) items.value = rest
      return
    }
    const position = rest.findIndex((t) => compareTickets(ticket, t, filters.value.sort) < 0)
    if (position === -1) {
      // Belongs after the loaded rows: a later page will bring it.
      items.value = nextCursor.value === null ? [...rest, ticket] : rest
      return
    }
    items.value = [...rest.slice(0, position), ticket, ...rest.slice(position)]
  }

  function markRead(ticketId: string) {
    const index = items.value.findIndex((t) => t.id === ticketId)
    if (index === -1 || !items.value[index].unread) return
    const next = items.value.slice()
    next[index] = { ...next[index], unread: false }
    items.value = next
  }

  realtime.onEvent((event) => {
    if (event.type === 'ticket.created' || event.type === 'ticket.updated') applyTicket(event.data)
  })
  realtime.onResync(() => void reload())
  onScopeDispose(
    inbox.subscribe((change) => {
      if (change.type === 'ticket') applyTicket(change.ticket)
      else markRead(change.ticketId)
    }),
  )
  onScopeDispose(() => controller?.abort())

  watch(() => filtersKey(filters.value), () => void reload(), { immediate: true })

  return { items, nextCursor, status, loadingMore, loadMoreFailed, reload, loadMore }
}
