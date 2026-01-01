import { reactive } from 'vue'
import type { TicketSummary } from '@/lib/types'

export type InboxChange = { type: 'ticket'; ticket: TicketSummary } | { type: 'read'; ticketId: string }

const state = reactive({ unreadCount: null as number | null })
const listeners = new Set<(change: InboxChange) => void>()
// Tickets opened (and marked read) in this session. A list page the server built before that read
// arrived still reports them as unread; the count and the rows are corrected on the client.
const readHere = new Set<string>()
const readLocally = (t: TicketSummary) => t.unread && readHere.has(t.id)

function emit(change: InboxChange) {
  for (const listener of [...listeners]) listener(change)
}

/** Shared inbox state between the ticket list and the open ticket. */
export const inbox = {
  state,
  setUnreadCount(count: number, items: readonly TicketSummary[] = []) {
    state.unreadCount = Math.max(0, count - items.filter(readLocally).length)
  },
  /** List rows with the read state known locally applied. */
  withLocalReads(items: TicketSummary[]): TicketSummary[] {
    return items.some(readLocally) ? items.map((t) => (readLocally(t) ? { ...t, unread: false } : t)) : items
  },
  /** Called once per opened ticket that was unread. */
  markOpened(ticketId: string) {
    readHere.add(ticketId)
    if (state.unreadCount !== null) state.unreadCount = Math.max(0, state.unreadCount - 1)
    emit({ type: 'read', ticketId })
  },
  /** A ticket changed locally (e.g. after a successful PATCH). */
  publishTicket(ticket: TicketSummary) {
    emit({ type: 'ticket', ticket })
  },
  subscribe(listener: (change: InboxChange) => void): () => void {
    listeners.add(listener)
    return () => listeners.delete(listener)
  },
}
