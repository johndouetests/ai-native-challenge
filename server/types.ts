export type TicketStatus = 'open' | 'pending' | 'resolved' | 'closed'
export type TicketPriority = 'low' | 'normal' | 'high' | 'urgent'
export type MessageType = 'customer' | 'agent' | 'system'
export type AgentColor = 'blue' | 'violet' | 'teal' | 'amber' | 'rose' | 'emerald' | 'indigo' | 'orange'

export const STATUSES: readonly TicketStatus[] = ['open', 'pending', 'resolved', 'closed']
export const PRIORITIES: readonly TicketPriority[] = ['low', 'normal', 'high', 'urgent']
export const PRIORITY_RANK: Record<TicketPriority, number> = { low: 0, normal: 1, high: 2, urgent: 3 }

export interface Agent {
  id: string
  name: string
  initials: string
  color: AgentColor
}

/** Internal ticket record. Timestamps are epoch milliseconds. */
export interface TicketRecord {
  id: string
  key: string
  subject: string
  status: TicketStatus
  priority: TicketPriority
  requester: { name: string; email: string }
  assigneeId: string | null
  unread: boolean
  createdAt: number
  updatedAt: number
  version: number
}

export interface MessageRecord {
  id: string
  seq: number
  ticketId: string
  type: MessageType
  authorName: string
  authorId: string | null
  body: string
  createdAt: number
  clientMessageId: string | null
}

export interface TicketSummaryDto {
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

export interface TicketDto extends Omit<TicketSummaryDto, 'requester'> {
  requester: { name: string; email: string }
}

export interface MessageDto {
  id: string
  ticketId: string
  type: MessageType
  authorName: string
  authorId: string | null
  body: string
  createdAt: string
  clientMessageId: string | null
}

export type EventFrame =
  | { eventId: number; type: 'message.created'; ticketId: string; data: MessageDto }
  | { eventId: number; type: 'ticket.created' | 'ticket.updated'; ticketId: string; data: TicketSummaryDto }

export type Frame =
  | EventFrame
  | { eventId: null; type: 'typing'; ticketId: string; data: { authorName: string } }
  | { type: 'ping'; ts: string }
  | { type: 'resync' }

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public current?: TicketDto,
  ) {
    super(message)
  }
}
