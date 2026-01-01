import type { AddressInfo } from 'node:net'
import WebSocket from 'ws'
import { createSimulator, type Simulator } from '../../server/app'

export const NOW = Date.parse('2026-03-09T10:00:00Z')

export async function startSim(listen = false): Promise<Simulator & { port: number }> {
  const sim = await createSimulator({ validate: true, scenario: false, now: NOW })
  let port = 0
  if (listen) {
    await sim.app.listen({ port: 0, host: '127.0.0.1' })
    port = (sim.app.server.address() as AddressInfo).port
  }
  return Object.assign(sim, { port })
}

export interface Client {
  ws: WebSocket
  frames: Record<string, unknown>[]
  waitFor(predicate: (frames: Record<string, unknown>[]) => boolean, timeoutMs?: number): Promise<void>
}

export async function connect(port: number, lastEventId?: number): Promise<Client> {
  const query = lastEventId === undefined ? '' : `?lastEventId=${lastEventId}`
  const ws = new WebSocket(`ws://127.0.0.1:${port}/ws${query}`)
  const frames: Record<string, unknown>[] = []
  ws.on('message', (data) => frames.push(JSON.parse(String(data))))
  await new Promise<void>((resolve, reject) => {
    ws.once('open', () => resolve())
    ws.once('error', reject)
  })
  return {
    ws,
    frames,
    async waitFor(predicate, timeoutMs = 2000) {
      const start = Date.now()
      while (!predicate(frames)) {
        if (Date.now() - start > timeoutMs) throw new Error(`timeout, frames: ${JSON.stringify(frames)}`)
        await new Promise((r) => setTimeout(r, 10))
      }
    },
  }
}

export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))
