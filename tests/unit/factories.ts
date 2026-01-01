import type { Message, TicketSummary } from '@/lib/types'

export function ticket(overrides: Partial<TicketSummary> = {}): TicketSummary {
  return {
    id: 't_1042',
    key: 'DSK-1042',
    subject: 'Invoice shows the wrong billing address',
    status: 'open',
    priority: 'high',
    requester: { name: 'Alex Carter' },
    assigneeId: 'a_1',
    unread: false,
    createdAt: '2026-03-08T09:00:00.000Z',
    updatedAt: '2026-03-09T09:55:00.000Z',
    version: 1,
    ...overrides,
  }
}

export function message(overrides: Partial<Message> = {}): Message {
  return {
    id: 'm_9001',
    ticketId: 't_1042',
    type: 'customer',
    authorName: 'Alex Carter',
    authorId: null,
    body: 'Hello',
    createdAt: '2026-03-09T09:00:00.000Z',
    clientMessageId: null,
    ...overrides,
  }
}
