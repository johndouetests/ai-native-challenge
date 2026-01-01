export type TicketStatus = 'open' | 'pending' | 'resolved' | 'closed'
export type TicketPriority = 'low' | 'normal' | 'high' | 'urgent'
export type MessageType = 'customer' | 'agent' | 'system'
export type AgentColor = 'blue' | 'violet' | 'teal' | 'amber' | 'rose' | 'emerald' | 'indigo' | 'orange'
export type SortKey = 'updated' | 'created' | 'priority'

export const STATUSES: readonly TicketStatus[] = ['open', 'pending', 'resolved', 'closed']
export const PRIORITIES: readonly TicketPriority[] = ['low', 'normal', 'high', 'urgent']
export const SORTS: readonly SortKey[] = ['updated', 'created', 'priority']

export const STATUS_LABEL: Record<TicketStatus, string> = {
  open: 'Open',
  pending: 'Pending',
  resolved: 'Resolved',
  closed: 'Closed',
}
export const PRIORITY_LABEL: Record<TicketPriority, string> = {
  low: 'Low',
  normal: 'Normal',
  high: 'High',
  urgent: 'Urgent',
}
export const PRIORITY_RANK: Record<TicketPriority, number> = { low: 0, normal: 1, high: 2, urgent: 3 }
export const SORT_LABEL: Record<SortKey, string> = { updated: 'Updated', created: 'Created', priority: 'Priority' }

export interface Agent {
  id: string
  name: string
  initials: string
  color: AgentColor
}

export interface TicketSummary {
  id: string
  key: string
  subject: string
  status: TicketStatus
  priority: TicketPriority
  requester: { name: string }
  assigneeId: string | null
  unread: boolean
  createdAt: string
  updatedAt: string
  version: number
}

export interface Ticket extends Omit<TicketSummary, 'requester'> {
  requester: { name: string; email: string }
}

export interface TicketPage {
  items: TicketSummary[]
  nextCursor: string | null
  meta: { unreadCount: number; totalMatching: number }
}

export interface Message {
  id: string
  ticketId: string
  type: MessageType
  authorName: string
  authorId: string | null
  body: string
  createdAt: string
  clientMessageId: string | null
}

export interface MessagePage {
  items: Message[]
  prevCursor: string | null
}

export type DeliveryStatus = 'sending' | 'sent' | 'failed'

/** A message as shown in the thread: server messages plus local optimistic ones. */
export interface ThreadMessage extends Message {
  delivery?: DeliveryStatus
}

export type RealtimeEvent =
  | { eventId: number; type: 'message.created'; ticketId: string; data: Message }
  | { eventId: number; type: 'ticket.created' | 'ticket.updated'; ticketId: string; data: TicketSummary }
  | { eventId: null; type: 'typing'; ticketId: string; data: { authorName: string } }
