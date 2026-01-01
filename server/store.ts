import { createRng, pick, type Rng } from './rng'
import {
  AGENTS,
  ME_ID,
  agentName,
  generateSeed,
  randomCustomerLine,
  randomSubject,
  requesterFor,
} from './seed'
import {
  ApiError,
  PRIORITIES,
  PRIORITY_RANK,
  STATUSES,
  type MessageDto,
  type MessageRecord,
  type TicketDto,
  type TicketPriority,
  type TicketRecord,
  type TicketStatus,
  type TicketSummaryDto,
} from './types'

export type SortKey = 'updated' | 'created' | 'priority'
const SORTS: readonly SortKey[] = ['updated', 'created', 'priority']
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export interface ListQuery {
  status?: string
  priority?: string
  assigneeId?: string
  q?: string
  sort?: string
  cursor?: string
  limit?: string
}

export interface StoreEvents {
  ticketCreated(ticket: TicketSummaryDto): void
  ticketUpdated(ticket: TicketSummaryDto): void
  messageCreated(message: MessageDto): void
}

export function toSummary(t: TicketRecord): TicketSummaryDto {
  return {
    id: t.id,
    key: t.key,
    subject: t.subject,
    status: t.status,
    priority: t.priority,
    requester: { name: t.requester.name },
    assigneeId: t.assigneeId,
    unread: t.unread,
    createdAt: new Date(t.createdAt).toISOString(),
    updatedAt: new Date(t.updatedAt).toISOString(),
    version: t.version,
  }
}

export function toTicket(t: TicketRecord): TicketDto {
  return { ...toSummary(t), requester: { ...t.requester } }
}

export function toMessage(m: MessageRecord): MessageDto {
  return {
    id: m.id,
    ticketId: m.ticketId,
    type: m.type,
    authorName: m.authorName,
    authorId: m.authorId,
    body: m.body,
    createdAt: new Date(m.createdAt).toISOString(),
    clientMessageId: m.clientMessageId,
  }
}

function sortTuple(t: TicketRecord, sort: SortKey): number[] {
  const n = Number(t.id.slice(2))
  if (sort === 'created') return [-t.createdAt, n]
  if (sort === 'priority') return [-PRIORITY_RANK[t.priority], -t.updatedAt, n]
  return [-t.updatedAt, n]
}

function compareTuples(a: number[], b: number[]): number {
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return a[i] < b[i] ? -1 : 1
  }
  return 0
}

function encodeCursor(value: unknown): string {
  return Buffer.from(JSON.stringify(value)).toString('base64url')
}

function decodeCursor(raw: string): unknown {
  try {
    return JSON.parse(Buffer.from(raw, 'base64url').toString('utf8'))
  } catch {
    return undefined
  }
}

function parseList<T extends string>(raw: string | undefined, allowed: readonly T[], name: string): T[] {
  if (raw === undefined || raw === '') return []
  const parts = raw.split(',').map((s) => s.trim())
  for (const p of parts) {
    if (!allowed.includes(p as T)) throw new ApiError(400, 'invalid_parameter', `Unknown ${name}: ${p}`)
  }
  return parts as T[]
}

function parseLimit(raw: string | undefined, fallback: number): number {
  if (raw === undefined) return fallback
  if (!/^\d+$/.test(raw)) throw new ApiError(400, 'invalid_parameter', 'limit must be an integer')
  const n = Number(raw)
  if (n < 1 || n > 100) throw new ApiError(400, 'invalid_parameter', 'limit must be between 1 and 100')
  return n
}

export class Store {
  tickets = new Map<string, TicketRecord>()
  messages = new Map<string, MessageRecord[]>()
  private byClientId = new Map<string, MessageRecord>()
  private nextMessageNumber = 0
  private nextTicketNumber = 0
  private anchorMs = 0
  private anchorRealMs = 0
  rng: Rng = createRng(1)

  constructor(
    private events: StoreEvents,
    now?: number,
  ) {
    this.reset(now)
  }

  /** Simulator clock: the anchor plus the real time elapsed since the last reset. */
  now(): number {
    return this.anchorMs + (Date.now() - this.anchorRealMs)
  }

  reset(now?: number): void {
    const anchor = now ?? Math.floor(Date.now() / 60_000) * 60_000
    this.anchorMs = anchor
    this.anchorRealMs = Date.now()
    const seed = generateSeed(anchor)
    this.tickets = new Map(seed.tickets.map((t) => [t.id, t]))
    this.messages = seed.messages
    this.byClientId = new Map()
    for (const list of this.messages.values()) {
      for (const m of list) if (m.clientMessageId) this.byClientId.set(m.clientMessageId, m)
    }
    this.nextMessageNumber = seed.nextMessageNumber
    this.nextTicketNumber = seed.nextTicketNumber
    this.rng = createRng(4242)
  }

  getTicketRecord(id: string): TicketRecord {
    const t = this.tickets.get(id)
    if (!t) throw new ApiError(404, 'ticket_not_found', `Ticket ${id} not found`)
    return t
  }

  unreadCount(): number {
    let n = 0
    for (const t of this.tickets.values()) if (t.unread) n++
    return n
  }

  listTickets(query: ListQuery) {
    const statuses = parseList(query.status, STATUSES, 'status')
    const priorities = parseList(query.priority, PRIORITIES, 'priority')
    const sort = (query.sort ?? 'updated') as SortKey
    if (!SORTS.includes(sort)) throw new ApiError(400, 'invalid_parameter', `Unknown sort: ${query.sort}`)
    const limit = parseLimit(query.limit, 25)
    const assignee = query.assigneeId === 'me' ? ME_ID : query.assigneeId
    if (assignee && assignee !== 'unassigned' && !AGENTS.some((a) => a.id === assignee)) {
      throw new ApiError(400, 'invalid_parameter', `Unknown assignee: ${assignee}`)
    }
    const q = (query.q ?? '').trim().toLowerCase()

    const matching = [...this.tickets.values()].filter((t) => {
      if (statuses.length && !statuses.includes(t.status)) return false
      if (priorities.length && !priorities.includes(t.priority)) return false
      if (assignee === 'unassigned' && t.assigneeId !== null) return false
      if (assignee && assignee !== 'unassigned' && t.assigneeId !== assignee) return false
      if (q) {
        const hay = `${t.key} ${t.subject} ${t.requester.name}`.toLowerCase()
        if (!hay.includes(q)) return false
      }
      return true
    })
    const keyed = matching
      .map((t) => ({ t, k: sortTuple(t, sort) }))
      .sort((a, b) => compareTuples(a.k, b.k))

    let start = 0
    if (query.cursor) {
      const c = decodeCursor(query.cursor) as { s?: string; k?: number[] } | undefined
      if (!c || c.s !== sort || !Array.isArray(c.k)) {
        throw new ApiError(400, 'invalid_parameter', 'Invalid cursor')
      }
      const after = c.k
      start = keyed.findIndex((e) => compareTuples(e.k, after) > 0)
      if (start === -1) start = keyed.length
    }
    const page = keyed.slice(start, start + limit)
    const hasMore = start + limit < keyed.length
    const last = page[page.length - 1]
    return {
      items: page.map((e) => toSummary(e.t)),
      nextCursor: hasMore && last ? encodeCursor({ s: sort, k: last.k }) : null,
      meta: { unreadCount: this.unreadCount(), totalMatching: matching.length },
    }
  }

  getTicket(id: string): TicketDto {
    return toTicket(this.getTicketRecord(id))
  }

  patchTicket(id: string, body: unknown): TicketDto {
    const t = this.getTicketRecord(id)
    if (typeof body !== 'object' || body === null) throw new ApiError(422, 'invalid_body', 'Body must be an object')
    const b = body as Record<string, unknown>
    if (typeof b.version !== 'number' || !Number.isInteger(b.version)) {
      throw new ApiError(422, 'invalid_body', 'version is required')
    }
    for (const k of Object.keys(b)) {
      if (!['version', 'status', 'priority', 'assigneeId'].includes(k)) {
        throw new ApiError(422, 'invalid_body', `Unknown field: ${k}`)
      }
    }
    if (b.status !== undefined && !STATUSES.includes(b.status as TicketStatus)) {
      throw new ApiError(422, 'invalid_body', 'Unknown status')
    }
    if (b.priority !== undefined && !PRIORITIES.includes(b.priority as TicketPriority)) {
      throw new ApiError(422, 'invalid_body', 'Unknown priority')
    }
    if (
      b.assigneeId !== undefined &&
      b.assigneeId !== null &&
      !AGENTS.some((a) => a.id === b.assigneeId)
    ) {
      throw new ApiError(422, 'invalid_body', 'Unknown assignee')
    }
    if (b.version !== t.version) {
      throw new ApiError(409, 'version_conflict', 'Ticket was changed by someone else', toTicket(t))
    }
    if (b.status !== undefined) t.status = b.status as TicketStatus
    if (b.priority !== undefined) t.priority = b.priority as TicketPriority
    if (b.assigneeId !== undefined) t.assigneeId = b.assigneeId as string | null
    t.version++
    t.updatedAt = this.now()
    this.events.ticketUpdated(toSummary(t))
    return toTicket(t)
  }

  markRead(id: string): void {
    const t = this.getTicketRecord(id)
    t.unread = false
  }

  listMessages(id: string, query: { before?: string; limit?: string }) {
    this.getTicketRecord(id)
    const limit = parseLimit(query.limit, 30)
    const list = this.messages.get(id) ?? []
    let end = list.length
    if (query.before) {
      const c = decodeCursor(query.before) as { t?: number; s?: number } | undefined
      if (!c || typeof c.t !== 'number' || typeof c.s !== 'number') {
        throw new ApiError(400, 'invalid_parameter', 'Invalid cursor')
      }
      const { t, s } = c as { t: number; s: number }
      end = list.findIndex((m) => m.createdAt > t || (m.createdAt === t && m.seq >= s))
      if (end === -1) end = list.length
    }
    const start = Math.max(0, end - limit)
    const page = list.slice(start, end)
    const first = page[0]
    return {
      items: page.map(toMessage),
      prevCursor: start > 0 && first ? encodeCursor({ t: first.createdAt, s: first.seq }) : null,
    }
  }

  private insertMessage(m: MessageRecord): void {
    const list = this.messages.get(m.ticketId) ?? []
    let i = list.length
    while (i > 0 && (list[i - 1].createdAt > m.createdAt || (list[i - 1].createdAt === m.createdAt && list[i - 1].seq > m.seq))) i--
    list.splice(i, 0, m)
    this.messages.set(m.ticketId, list)
  }

  private newMessage(fields: Omit<MessageRecord, 'id' | 'seq' | 'createdAt'>): MessageRecord {
    const seq = this.nextMessageNumber++
    return { ...fields, id: `m_${seq}`, seq, createdAt: this.now() }
  }

  createAgentMessage(id: string, body: unknown): { message: MessageDto; created: boolean } {
    const t = this.getTicketRecord(id)
    if (typeof body !== 'object' || body === null) throw new ApiError(422, 'invalid_body', 'Body must be an object')
    const b = body as Record<string, unknown>
    if (typeof b.clientMessageId !== 'string' || !UUID_RE.test(b.clientMessageId)) {
      throw new ApiError(422, 'invalid_body', 'clientMessageId must be a UUID')
    }
    if (typeof b.body !== 'string' || b.body.length < 1 || b.body.length > 4000 || b.body.trim() === '') {
      throw new ApiError(422, 'invalid_body', 'body must be 1-4000 characters')
    }
    const existing = this.byClientId.get(b.clientMessageId)
    if (existing) {
      if (existing.ticketId !== id) throw new ApiError(422, 'invalid_body', 'clientMessageId already used')
      return { message: toMessage(existing), created: false }
    }
    if (t.status === 'closed') throw new ApiError(409, 'ticket_closed', 'Ticket is closed')
    const m = this.newMessage({
      ticketId: id,
      type: 'agent',
      authorName: agentName(ME_ID),
      authorId: ME_ID,
      body: b.body,
      clientMessageId: b.clientMessageId,
    })
    this.insertMessage(m)
    this.byClientId.set(b.clientMessageId, m)
    t.updatedAt = m.createdAt
    this.events.messageCreated(toMessage(m))
    this.events.ticketUpdated(toSummary(t))
    return { message: toMessage(m), created: true }
  }

  /** A customer writes into a ticket (scenario engine and /__sim/emit). */
  createCustomerMessage(id: string, body?: string): MessageDto {
    const t = this.getTicketRecord(id)
    const m = this.newMessage({
      ticketId: id,
      type: 'customer',
      authorName: t.requester.name,
      authorId: null,
      body: body ?? randomCustomerLine(this.rng),
      clientMessageId: null,
    })
    this.insertMessage(m)
    t.updatedAt = m.createdAt
    this.events.messageCreated(toMessage(m))
    this.events.ticketUpdated(toSummary(t))
    return toMessage(m)
  }

  /** Another agent changes a ticket (scenario engine and /__sim/emit). */
  externalUpdate(
    id: string,
    change: { status?: TicketStatus; priority?: TicketPriority; assigneeId?: string | null } = {},
  ): TicketSummaryDto {
    const t = this.getTicketRecord(id)
    if (change.status === undefined && change.priority === undefined && change.assigneeId === undefined) {
      const what = pick(this.rng, ['status', 'priority', 'assigneeId'] as const)
      if (what === 'status') change.status = pick(this.rng, STATUSES.filter((s) => s !== t.status && s !== 'closed'))
      if (what === 'priority') change.priority = pick(this.rng, PRIORITIES.filter((p) => p !== t.priority))
      if (what === 'assigneeId') change.assigneeId = pick(this.rng, AGENTS.filter((a) => a.id !== t.assigneeId)).id
    }
    if (change.status !== undefined) t.status = change.status
    if (change.priority !== undefined) t.priority = change.priority
    if (change.assigneeId !== undefined) t.assigneeId = change.assigneeId
    t.version++
    t.updatedAt = this.now()
    const summary = toSummary(t)
    this.events.ticketUpdated(summary)
    return summary
  }

  createTicket(
    fields: { subject?: string; status?: TicketStatus; priority?: TicketPriority; assigneeId?: string | null } = {},
  ): TicketSummaryDto {
    const number = this.nextTicketNumber++
    const now = this.now()
    const requester = requesterFor(this.rng)
    const t: TicketRecord = {
      id: `t_${number}`,
      key: `DSK-${number}`,
      subject: fields.subject ?? randomSubject(this.rng),
      status: fields.status ?? 'open',
      priority: fields.priority ?? pick(this.rng, PRIORITIES),
      requester,
      assigneeId: fields.assigneeId === undefined ? null : fields.assigneeId,
      unread: true,
      createdAt: now,
      updatedAt: now,
      version: 1,
    }
    this.tickets.set(t.id, t)
    const first = this.newMessage({
      ticketId: t.id,
      type: 'customer',
      authorName: requester.name,
      authorId: null,
      body: randomCustomerLine(this.rng),
      clientMessageId: null,
    })
    this.messages.set(t.id, [first])
    const summary = toSummary(t)
    this.events.ticketCreated(summary)
    return summary
  }

  openTicketIds(): string[] {
    return [...this.tickets.values()].filter((t) => t.status === 'open').map((t) => t.id)
  }
}
