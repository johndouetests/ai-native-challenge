import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { backoffDelay, RealtimeClient } from '@/features/realtime/realtimeClient'

class FakeSocket {
  static all: FakeSocket[] = []
  onopen: (() => void) | null = null
  onmessage: ((e: { data: string }) => void) | null = null
  onclose: (() => void) | null = null
  sent: string[] = []
  constructor(public url: string) {
    FakeSocket.all.push(this)
  }
  send(data: string) {
    this.sent.push(data)
  }
  close() {
    this.onclose?.()
  }
  open() {
    this.onopen?.()
  }
  receive(frame: unknown) {
    this.onmessage?.({ data: JSON.stringify(frame) })
  }
}

function createClient() {
  return new RealtimeClient({
    url: () => 'ws://test/ws',
    createSocket: (url) => new FakeSocket(url) as unknown as WebSocket,
    random: () => 0.5,
    isOnline: () => true,
  })
}

const event = (eventId: number) => ({
  eventId,
  type: 'ticket.updated',
  ticketId: 't_1',
  data: { id: 't_1' },
})

beforeEach(() => {
  FakeSocket.all = []
  vi.useFakeTimers()
})
afterEach(() => vi.useRealTimers())

describe('RealtimeClient', () => {
  it('drops replayed events and resumes from lastEventId', () => {
    const client = createClient()
    const seen: number[] = []
    client.subscribe((e) => seen.push(e.eventId as number))
    client.start()
    const first = FakeSocket.all[0]
    first.open()
    first.receive(event(1))
    first.receive(event(2))
    first.close()
    expect(client.state).toBe('reconnecting')
    vi.advanceTimersByTime(1000)
    const second = FakeSocket.all[1]
    expect(second.url).toBe('ws://test/ws?lastEventId=2')
    second.open()
    second.receive(event(2))
    second.receive(event(3))
    expect(seen).toEqual([1, 2, 3])
    client.stop()
  })

  it('goes offline after three failed attempts', () => {
    const client = createClient()
    client.start()
    for (let i = 0; i < 3; i++) {
      FakeSocket.all[i].close()
      vi.advanceTimersByTime(20_000)
    }
    expect(client.state).toBe('offline')
    FakeSocket.all[3].open()
    expect(client.state).toBe('live')
    client.stop()
  })

  it('reconnects when no frame arrives for 35 seconds', () => {
    const client = createClient()
    client.start()
    FakeSocket.all[0].open()
    vi.advanceTimersByTime(30_000)
    FakeSocket.all[0].receive({ type: 'ping', ts: '' })
    expect(FakeSocket.all[0].sent).toEqual(['{"type":"pong"}'])
    vi.advanceTimersByTime(34_000)
    expect(FakeSocket.all).toHaveLength(1)
    vi.advanceTimersByTime(2_000)
    expect(client.state).toBe('reconnecting')
    vi.advanceTimersByTime(1_000)
    expect(FakeSocket.all).toHaveLength(2)
    client.stop()
  })
})

describe('backoffDelay', () => {
  it('doubles from 1 s up to 15 s with ±20% jitter', () => {
    expect([0, 1, 2, 3, 4, 8].map((n) => backoffDelay(n, () => 0.5))).toEqual([1000, 2000, 4000, 8000, 15000, 15000])
    expect(backoffDelay(0, () => 0)).toBe(800)
    expect(backoffDelay(0, () => 1)).toBe(1200)
  })
})
