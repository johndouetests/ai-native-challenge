import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { Simulator } from '../../server/app'
import { startSim } from './helpers'

let sim: Simulator

beforeEach(async () => {
  sim = await startSim()
})
afterEach(async () => {
  await sim.close()
})

async function api(method: 'GET' | 'POST' | 'PATCH', url: string, payload?: unknown) {
  const res = await sim.app.inject({ method, url, payload: payload as Record<string, unknown> })
  const body = res.body ? JSON.parse(res.body) : undefined
  if (body?.error?.code === 'contract_violation') throw new Error(body.error.message)
  return { status: res.statusCode, body }
}

describe('seed data', () => {
  it('is deterministic and contains the special tickets', async () => {
    const all = []
    let cursor: string | null = null
    do {
      const res = await api('GET', `/api/tickets?limit=100${cursor ? `&cursor=${cursor}` : ''}`)
      all.push(...res.body.items)
      cursor = res.body.nextCursor
    } while (cursor)
    expect(all).toHaveLength(120)
    expect(all.map((t) => t.key).sort()[0]).toBe('DSK-1001')
    expect(all.map((t) => t.key).sort()[119]).toBe('DSK-1120')
    expect(all.find((t) => t.key === 'DSK-1002').subject).toHaveLength(180)
    expect(all.find((t) => t.key === 'DSK-1006').status).toBe('closed')
    const urgent = all.find((t) => t.key === 'DSK-1007')
    expect([urgent.priority, urgent.assigneeId]).toEqual(['urgent', null])
    expect(sim.store.messages.get('t_1001')).toHaveLength(1200)
    const long = sim.store.messages.get('t_1003')!.at(-1)!.body.split('\n')[1]
    expect(long).toHaveLength(220)
    expect(long).not.toMatch(/\s/)
    const counts = [...sim.store.messages.values()].map((l) => l.length)
    expect(Math.min(...counts)).toBeGreaterThanOrEqual(5)

    const again = await startSim()
    expect([...again.store.tickets.values()]).toEqual([...sim.store.tickets.values()])
    await again.close()
  })

  it('serves the current agent and 8 agents', async () => {
    expect((await api('GET', '/api/me')).body).toMatchObject({ id: 'a_1', name: 'Maya Lopez' })
    expect((await api('GET', '/api/agents')).body.items).toHaveLength(8)
  })
})

describe('contract', () => {
  it('every documented response matches openapi.yaml', async () => {
    const calls: [Parameters<typeof api>[0], string, unknown, number][] = [
      ['GET', '/api/me', undefined, 200],
      ['GET', '/api/agents', undefined, 200],
      ['GET', '/api/tickets?status=open,pending&priority=high&sort=priority', undefined, 200],
      ['GET', '/api/tickets?assigneeId=unassigned&q=sign', undefined, 200],
      ['GET', '/api/tickets?limit=101', undefined, 400],
      ['GET', '/api/tickets?status=nope', undefined, 400],
      ['GET', '/api/tickets/t_1042', undefined, 200],
      ['GET', '/api/tickets/t_9999', undefined, 404],
      ['PATCH', '/api/tickets/t_1042', { version: 1, status: 'nope' }, 422],
      ['POST', '/api/tickets/t_1042/read', undefined, 204],
      ['GET', '/api/tickets/t_1042/messages?limit=5', undefined, 200],
      ['GET', '/api/tickets/t_1042/messages?before=garbage', undefined, 400],
      ['POST', '/api/tickets/t_1006/messages', { clientMessageId: crypto.randomUUID(), body: 'hi' }, 409],
      ['POST', '/api/tickets/t_1042/messages', { clientMessageId: 'x', body: 'hi' }, 422],
      ['POST', '/api/tickets/t_1042/messages', { clientMessageId: crypto.randomUUID(), body: '' }, 422],
    ]
    for (const [method, url, payload, status] of calls) {
      const res = await api(method, url, payload)
      expect(res.status, `${method} ${url}`).toBe(status)
    }
    const v = sim.validator!
    const page = (await api('GET', '/api/tickets')).body
    expect(v.validateResponse('GET', '/api/tickets', 200, page)).toEqual([])
    expect(v.validateResponse('GET', '/api/tickets', 200, { items: [{ id: 1 }] })).not.toEqual([])
  })
})

describe('tickets', () => {
  it('paginates every sort order without gaps or duplicates', async () => {
    for (const sort of ['updated', 'created', 'priority']) {
      for (const filter of ['', '&status=open,pending', '&assigneeId=me']) {
        const ids: string[] = []
        let cursor: string | null = null
        let total = 0
        do {
          const res = await api('GET', `/api/tickets?sort=${sort}&limit=7${filter}${cursor ? `&cursor=${cursor}` : ''}`)
          ids.push(...res.body.items.map((t: { id: string }) => t.id))
          total = res.body.meta.totalMatching
          cursor = res.body.nextCursor
        } while (cursor)
        expect(new Set(ids).size).toBe(ids.length)
        expect(ids.length).toBe(total)
      }
    }
  })

  it('sorts by priority with updatedAt as tie breaker', async () => {
    const { items } = (await api('GET', '/api/tickets?sort=priority&limit=100')).body
    const rank = { urgent: 3, high: 2, normal: 1, low: 0 } as Record<string, number>
    for (let i = 1; i < items.length; i++) {
      const a = items[i - 1]
      const b = items[i]
      expect(rank[a.priority] > rank[b.priority] || (a.priority === b.priority && a.updatedAt >= b.updatedAt)).toBe(true)
    }
  })

  it('rejects a stale version with 409 and the current ticket', async () => {
    const ticket = (await api('GET', '/api/tickets/t_1042')).body
    const ok = await api('PATCH', '/api/tickets/t_1042', { version: ticket.version, priority: 'urgent' })
    expect(ok.status).toBe(200)
    expect(ok.body.version).toBe(ticket.version + 1)
    const stale = await api('PATCH', '/api/tickets/t_1042', { version: ticket.version, priority: 'low' })
    expect(stale.status).toBe(409)
    expect(stale.body.error.code).toBe('version_conflict')
    expect(stale.body.error.current).toMatchObject({ id: 't_1042', priority: 'urgent', version: ticket.version + 1 })
  })

  it('read is idempotent and counts unread across the whole inbox', async () => {
    const before = (await api('GET', '/api/tickets?status=closed')).body.meta.unreadCount
    expect((await api('POST', '/api/tickets/t_1001/read')).status).toBe(204)
    expect((await api('POST', '/api/tickets/t_1001/read')).status).toBe(204)
    expect((await api('GET', '/api/tickets')).body.meta.unreadCount).toBe(before - 1)
  })
})

describe('messages', () => {
  it('pages backwards through 1200 messages in order', async () => {
    const all: { id: string; createdAt: string }[] = []
    let before: string | null = null
    let first = true
    while (first || before) {
      first = false
      const res = await api('GET', `/api/tickets/t_1001/messages?limit=100${before ? `&before=${before}` : ''}`)
      all.unshift(...res.body.items)
      before = res.body.prevCursor
    }
    expect(all).toHaveLength(1200)
    expect(new Set(all.map((m) => m.id)).size).toBe(1200)
    for (let i = 1; i < all.length; i++) expect(all[i - 1].createdAt <= all[i].createdAt).toBe(true)
  })

  it('creating with the same clientMessageId is idempotent', async () => {
    const clientMessageId = crypto.randomUUID()
    const first = await api('POST', '/api/tickets/t_1042/messages', { clientMessageId, body: 'Hello there' })
    expect(first.status).toBe(201)
    expect(first.body).toMatchObject({ type: 'agent', authorId: 'a_1', clientMessageId })
    const second = await api('POST', '/api/tickets/t_1042/messages', { clientMessageId, body: 'Hello there' })
    expect(second.status).toBe(200)
    expect(second.body.id).toBe(first.body.id)
    const { items } = (await api('GET', '/api/tickets/t_1042/messages')).body
    expect(items.filter((m: { clientMessageId: string }) => m.clientMessageId === clientMessageId)).toHaveLength(1)
  })
})

describe('controls', () => {
  it('fail rules return the given status the given number of times', async () => {
    await api('POST', '/__sim/fail', { method: 'GET', pathPrefix: '/api/tickets', status: 503, times: 2 })
    expect((await api('GET', '/api/tickets')).status).toBe(503)
    expect((await api('GET', '/api/tickets/t_1001')).status).toBe(503)
    expect((await api('GET', '/api/tickets')).status).toBe(200)
    expect((await api('GET', '/api/me')).status).toBe(200)
  })

  it('latency delays api responses', async () => {
    await api('POST', '/__sim/latency', { ms: 150 })
    const start = Date.now()
    await api('GET', '/api/me')
    expect(Date.now() - start).toBeGreaterThanOrEqual(140)
  })

  it('reset restores the seed', async () => {
    await api('PATCH', '/api/tickets/t_1042', { version: sim.store.tickets.get('t_1042')!.version, status: 'closed' })
    await api('POST', '/__sim/reset', { now: '2026-03-09T10:00:00Z' })
    expect(sim.store.tickets.get('t_1042')!.status).not.toBe('closed')
    expect((await api('GET', '/api/tickets/t_1007')).body.updatedAt).toBe('2026-03-09T09:48:00.000Z')
  })
})
