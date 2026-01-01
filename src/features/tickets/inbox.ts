import { useSyncExternalStore } from 'react'
import type { TicketSummary } from '@/lib/types'

export type InboxChange = { type: 'ticket'; ticket: TicketSummary } | { type: 'read'; ticketId: string }

let unreadCount: number | null = null
const countListeners = new Set<() => void>()
const changeListeners = new Set<(change: InboxChange) => void>()
// Tickets opened (and marked read) in this session. A list page the server built before that read
// arrived still reports them as unread; the count and the rows are corrected on the client.
const readHere = new Set<string>()
const readLocally = (t: TicketSummary) => t.unread && readHere.has(t.id)

function setCount(next: number | null) {
  unreadCount = next
  for (const listener of [...countListeners]) listener()
}

function emit(change: InboxChange) {
  for (const listener of [...changeListeners]) listener(change)
}

function subscribeCount(listener: () => void): () => void {
  countListeners.add(listener)
  return () => {
    countListeners.delete(listener)
  }
}

/** Shared inbox state between the ticket list and the open ticket. */
export const inbox = {
  getUnreadCount: (): number | null => unreadCount,
  setUnreadCount(count: number, items: readonly TicketSummary[] = []) {
    setCount(Math.max(0, count - items.filter(readLocally).length))
  },
  /** List rows with the read state known locally applied. */
  withLocalReads(items: TicketSummary[]): TicketSummary[] {
    return items.some(readLocally) ? items.map((t) => (readLocally(t) ? { ...t, unread: false } : t)) : items
  },
  /** Called once per opened ticket that was unread. */
  markOpened(ticketId: string) {
    readHere.add(ticketId)
    if (unreadCount !== null) setCount(Math.max(0, unreadCount - 1))
    emit({ type: 'read', ticketId })
  },
  /** A ticket changed locally (e.g. after a successful PATCH). */
  publishTicket(ticket: TicketSummary) {
    emit({ type: 'ticket', ticket })
  },
  subscribe(listener: (change: InboxChange) => void): () => void {
    changeListeners.add(listener)
    return () => {
      changeListeners.delete(listener)
    }
  },
}

export function useUnreadCount(): number | null {
  return useSyncExternalStore(subscribeCount, inbox.getUnreadCount)
}
