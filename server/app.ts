import Fastify, { type FastifyInstance, type FastifyReply, type FastifyRequest } from 'fastify'
import { WebSocketServer } from 'ws'
import { Hub } from './hub'
import { panelHtml } from './panel'
import { Scenario } from './scenario'
import { AGENTS, ME_ID } from './seed'
import { Store } from './store'
import { ApiError, PRIORITIES, STATUSES, type Frame, type TicketPriority, type TicketStatus } from './types'
import { createValidator, type OpenApiValidator } from './validate'

export interface SimOptions {
  /** Validate every /api response against openapi.yaml and respond with 500 on mismatch. */
  validate?: boolean
  /** Start the scenario engine timers. */
  scenario?: boolean
  /** Anchor for the simulator clock (epoch ms). Defaults to the current minute. */
  now?: number
  logger?: boolean
}

interface FailRule {
  method: string
  pathPrefix: string
  status: number
  times: number
}

export interface Simulator {
  app: FastifyInstance
  store: Store
  hub: Hub
  scenario: Scenario
  validator?: OpenApiValidator
  close(): Promise<void>
}

function sendError(reply: FastifyReply, err: ApiError) {
  const error: Record<string, unknown> = { code: err.code, message: err.message }
  if (err.current) error.current = err.current
  return reply.code(err.status).send({ error })
}

export async function createSimulator(options: SimOptions = {}): Promise<Simulator> {
  const validator = options.validate ? createValidator() : undefined
  let latencyMs = 0
  let failRules: FailRule[] = []
  const frameProblems: string[] = []

  // The store emits domain events; the hub turns them into numbered frames.
  // eslint-disable-next-line prefer-const
  let hub: Hub
  const store = new Store(
    {
      ticketCreated: (data) => hub.publish({ type: 'ticket.created', ticketId: data.id, data }),
      ticketUpdated: (data) => hub.publish({ type: 'ticket.updated', ticketId: data.id, data }),
      messageCreated: (data) => hub.publish({ type: 'message.created', ticketId: data.ticketId, data }),
    },
    options.now,
  )
  hub = new Hub(
    () => store.now(),
    validator
      ? (frame: Frame) => {
          const problems = validator.validateFrame(frame)
          if (problems.length) frameProblems.push(`${JSON.stringify(frame)}: ${problems.join('; ')}`)
        }
      : undefined,
  )
  hub.startPing()
  const scenario = new Scenario(store, hub)
  if (options.scenario) scenario.start()

  const app = Fastify({ logger: options.logger ?? false })

  app.setErrorHandler((err: Error & { statusCode?: number }, _req, reply) => {
    if (err instanceof ApiError) return sendError(reply, err)
    const status = err.statusCode ?? 500
    if (status === 400 || status === 415) {
      return sendError(reply, new ApiError(422, 'invalid_body', err.message))
    }
    return sendError(reply, new ApiError(status, 'internal_error', err.message))
  })

  app.setNotFoundHandler((req, reply) =>
    sendError(reply, new ApiError(404, 'not_found', `No route for ${req.method} ${req.url}`)),
  )

  app.addHook('onRequest', async (req: FastifyRequest, reply: FastifyReply) => {
    if (!req.url.startsWith('/api/')) return
    const path = req.url.split('?')[0]
    const ruleIndex = failRules.findIndex(
      (r) => (r.method === '*' || r.method.toUpperCase() === req.method) && path.startsWith(r.pathPrefix),
    )
    if (latencyMs > 0) await new Promise((r) => setTimeout(r, latencyMs))
    if (ruleIndex === -1) return
    const rule = failRules[ruleIndex]
    rule.times--
    if (rule.times <= 0) failRules = failRules.filter((r) => r !== rule)
    if (rule.status === 0) {
      reply.hijack()
      req.raw.socket.destroy()
      return
    }
    return sendError(reply, new ApiError(rule.status, 'simulated_failure', `Simulated ${rule.status} response`))
  })

  if (validator) {
    app.addHook('onSend', async (req, reply, payload) => {
      if (!req.url.startsWith('/api/')) return payload
      const route = req.routeOptions.url
      if (!route) return payload
      const status = reply.statusCode
      let body: unknown = undefined
      if (typeof payload === 'string' && payload.length) body = JSON.parse(payload)
      const code = (body as { error?: { code?: string } } | undefined)?.error?.code
      if (code === 'simulated_failure') return payload
      const problems = validator.validateResponse(req.method, route, status, body)
      if (problems.length === 0) return payload
      reply.code(500).header('content-type', 'application/json')
      return JSON.stringify({
        error: { code: 'contract_violation', message: `${req.method} ${route} ${status}: ${problems.join('; ')}` },
      })
    })
  }

  // ---------- API ----------
  app.get('/api/me', async () => AGENTS.find((a) => a.id === ME_ID))
  app.get('/api/agents', async () => ({ items: AGENTS }))
  app.get('/api/tickets', async (req) => store.listTickets(req.query as Record<string, string>))
  app.get('/api/tickets/:id', async (req) => store.getTicket((req.params as { id: string }).id))
  app.patch('/api/tickets/:id', async (req) => store.patchTicket((req.params as { id: string }).id, req.body))
  app.post('/api/tickets/:id/read', async (req, reply) => {
    store.markRead((req.params as { id: string }).id)
    return reply.code(204).send()
  })
  app.get('/api/tickets/:id/messages', async (req) =>
    store.listMessages((req.params as { id: string }).id, req.query as Record<string, string>),
  )
  app.post('/api/tickets/:id/messages', async (req, reply) => {
    const { message, created } = store.createAgentMessage((req.params as { id: string }).id, req.body)
    return reply.code(created ? 201 : 200).send(message)
  })

  // ---------- Simulator controls ----------
  const ok = { ok: true }
  const simState = () => ({
    paused: scenario.paused,
    stalled: hub.stalled,
    latencyMs,
    failRules,
    connections: hub.connectionCount,
    lastEventId: hub.latestEventId,
    now: new Date(store.now()).toISOString(),
  })
  app.get('/__sim', async (_req, reply) => reply.type('text/html; charset=utf-8').send(panelHtml))
  app.get('/__sim/state', async () => simState())
  app.get('/__sim/frame-problems', async () => ({ items: frameProblems }))
  app.post('/__sim/disconnect', async () => {
    hub.disconnectAll()
    return ok
  })
  app.post('/__sim/latency', async (req) => {
    const ms = (req.body as { ms?: unknown } | undefined)?.ms
    if (typeof ms !== 'number' || ms < 0 || ms > 60_000) {
      throw new ApiError(422, 'invalid_body', 'ms must be a number between 0 and 60000')
    }
    latencyMs = Math.round(ms)
    return ok
  })
  app.post('/__sim/fail', async (req) => {
    const b = (req.body ?? {}) as Partial<FailRule>
    if (
      typeof b.method !== 'string' ||
      typeof b.pathPrefix !== 'string' ||
      typeof b.status !== 'number' ||
      !(b.status === 0 || (b.status >= 400 && b.status <= 599))
    ) {
      throw new ApiError(422, 'invalid_body', 'Expected { method, pathPrefix, status (0 or 400-599), times }')
    }
    const times = typeof b.times === 'number' && b.times >= 1 ? Math.floor(b.times) : 1
    failRules.push({ method: b.method, pathPrefix: b.pathPrefix, status: b.status, times })
    return ok
  })
  app.post('/__sim/emit', async (req) => {
    const b = (req.body ?? {}) as Record<string, unknown>
    const ticketId = typeof b.ticketId === 'string' ? b.ticketId : undefined
    const needTicket = () => {
      if (!ticketId) throw new ApiError(422, 'invalid_body', 'ticketId is required')
      return store.getTicketRecord(ticketId)
    }
    switch (b.type) {
      case 'message.created': {
        const t = needTicket()
        store.createCustomerMessage(t.id, typeof b.body === 'string' && b.body ? b.body : undefined)
        return { ok: true, eventId: hub.latestEventId - 1, ticketId: t.id }
      }
      case 'typing': {
        const t = needTicket()
        hub.typing(t.id, typeof b.authorName === 'string' ? b.authorName : t.requester.name)
        return { ok: true, eventId: null, ticketId: t.id }
      }
      case 'ticket.updated': {
        const t = needTicket()
        const change: { status?: TicketStatus; priority?: TicketPriority; assigneeId?: string | null } = {}
        if (b.status !== undefined) {
          if (!STATUSES.includes(b.status as TicketStatus)) throw new ApiError(422, 'invalid_body', 'Unknown status')
          change.status = b.status as TicketStatus
        }
        if (b.priority !== undefined) {
          if (!PRIORITIES.includes(b.priority as TicketPriority)) {
            throw new ApiError(422, 'invalid_body', 'Unknown priority')
          }
          change.priority = b.priority as TicketPriority
        }
        if (b.assigneeId !== undefined) {
          if (b.assigneeId !== null && !AGENTS.some((a) => a.id === b.assigneeId)) {
            throw new ApiError(422, 'invalid_body', 'Unknown assignee')
          }
          change.assigneeId = b.assigneeId as string | null
        }
        store.externalUpdate(t.id, change)
        return { ok: true, eventId: hub.latestEventId, ticketId: t.id }
      }
      case 'ticket.created': {
        const summary = store.createTicket({
          subject: typeof b.subject === 'string' && b.subject ? b.subject : undefined,
          status: STATUSES.includes(b.status as TicketStatus) ? (b.status as TicketStatus) : undefined,
          priority: PRIORITIES.includes(b.priority as TicketPriority) ? (b.priority as TicketPriority) : undefined,
          assigneeId:
            b.assigneeId === null || AGENTS.some((a) => a.id === b.assigneeId)
              ? (b.assigneeId as string | null)
              : undefined,
        })
        return { ok: true, eventId: hub.latestEventId, ticketId: summary.id }
      }
      default:
        throw new ApiError(422, 'invalid_body', 'type must be message.created, typing, ticket.updated or ticket.created')
    }
  })
  app.post('/__sim/pause', async () => {
    scenario.paused = true
    return ok
  })
  app.post('/__sim/resume', async () => {
    scenario.paused = false
    return ok
  })
  app.post('/__sim/stall', async () => {
    hub.stalled = true
    return ok
  })
  app.post('/__sim/unstall', async () => {
    hub.stalled = false
    return ok
  })
  app.post('/__sim/reset', async (req) => {
    const now = (req.body as { now?: unknown } | undefined)?.now
    let anchor: number | undefined
    if (now !== undefined) {
      anchor = typeof now === 'string' ? Date.parse(now) : NaN
      if (Number.isNaN(anchor)) throw new ApiError(422, 'invalid_body', 'now must be an ISO-8601 date-time')
    }
    store.reset(anchor)
    scenario.reset()
    latencyMs = 0
    failRules = []
    hub.stalled = false
    hub.resync()
    return ok
  })

  // ---------- WebSocket ----------
  const wss = new WebSocketServer({ noServer: true })
  app.server.on('upgrade', (req, socket, head) => {
    const url = new URL(req.url ?? '/', 'http://localhost')
    if (url.pathname !== '/ws') {
      socket.destroy()
      return
    }
    const raw = url.searchParams.get('lastEventId')
    const lastEventId = raw === null || raw === '' ? undefined : Number(raw)
    wss.handleUpgrade(req, socket, head, (ws) => hub.attach(ws, lastEventId))
  })

  return {
    app,
    store,
    hub,
    scenario,
    validator,
    async close() {
      scenario.stop()
      hub.stopPing()
      hub.disconnectAll()
      wss.close()
      await app.close()
    },
  }
}
