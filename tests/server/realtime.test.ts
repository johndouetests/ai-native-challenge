import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { Simulator } from '../../server/app'
import { BUFFER_SIZE } from '../../server/hub'
import { connect, sleep, startSim } from './helpers'

let sim: Simulator & { port: number }

beforeEach(async () => {
  sim = await startSim(true)
})
afterEach(async () => {
  await sim.close()
})

const emit = (body: Record<string, unknown>) =>
  sim.app.inject({ method: 'POST', url: '/__sim/emit', payload: body }).then((r) => JSON.parse(r.body))

describe('websocket', () => {
  it('broadcasts events with increasing eventIds that match the schema', async () => {
    const client = await connect(sim.port)
    await emit({ type: 'message.created', ticketId: 't_1042', body: 'Ping from customer' })
    await emit({ type: 'typing', ticketId: 't_1042' })
    await emit({ type: 'ticket.created' })
    await client.waitFor((f) => f.length >= 4)
    expect(client.frames.map((f) => f.type)).toEqual(['message.created', 'ticket.updated', 'typing', 'ticket.created'])
    expect(client.frames.map((f) => f.eventId)).toEqual([1, 2, null, 3])
    for (const f of client.frames) expect(sim.validator!.validateFrame(f)).toEqual([])
    client.ws.close()
  })

  it('replays from lastEventId inclusive after a reconnect', async () => {
    const client = await connect(sim.port)
    await emit({ type: 'ticket.updated', ticketId: 't_1001', priority: 'low' })
    await client.waitFor((f) => f.length === 1)
    await sim.app.inject({ method: 'POST', url: '/__sim/disconnect' })
    await emit({ type: 'message.created', ticketId: 't_1001' })
    await emit({ type: 'typing', ticketId: 't_1001' })
    const again = await connect(sim.port, 1)
    await again.waitFor((f) => f.length === 3)
    expect(again.frames.map((f) => f.eventId)).toEqual([1, 2, 3])
    expect(again.frames.map((f) => f.type)).toEqual(['ticket.updated', 'message.created', 'ticket.updated'])
    again.ws.close()
  })

  it('sends resync when lastEventId is older than the buffer or unknown', async () => {
    for (let i = 0; i < BUFFER_SIZE + 10; i++) sim.store.externalUpdate('t_1001', { priority: i % 2 ? 'low' : 'high' })
    const old = await connect(sim.port, 3)
    await old.waitFor((f) => f.length === 1)
    expect(old.frames).toEqual([{ type: 'resync' }])
    const future = await connect(sim.port, 99_999)
    await future.waitFor((f) => f.length === 1)
    expect(future.frames).toEqual([{ type: 'resync' }])
    const recent = await connect(sim.port, BUFFER_SIZE + 5)
    await recent.waitFor((f) => f.length === 6)
    expect(recent.frames[0]).toMatchObject({ eventId: BUFFER_SIZE + 5 })
    for (const c of [old, future, recent]) c.ws.close()
  })

  it('pings regularly and goes silent while stalled', async () => {
    sim.hub.startPing(40)
    const client = await connect(sim.port)
    await client.waitFor((f) => f.some((x) => x.type === 'ping'))
    await sim.app.inject({ method: 'POST', url: '/__sim/stall' })
    await sleep(20)
    const count = client.frames.length
    await emit({ type: 'message.created', ticketId: 't_1001' })
    await sleep(150)
    expect(client.frames.length).toBe(count)
    expect(client.ws.readyState).toBe(client.ws.OPEN)
    await sim.app.inject({ method: 'POST', url: '/__sim/unstall' })
    await client.waitFor((f) => f.length > count)
    client.ws.close()
  })

  it('reset tells connected clients to resync', async () => {
    const client = await connect(sim.port)
    await sim.app.inject({ method: 'POST', url: '/__sim/reset', payload: {} })
    await client.waitFor((f) => f.some((x) => x.type === 'resync'))
    client.ws.close()
  })
})
