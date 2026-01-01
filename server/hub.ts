import type { WebSocket } from 'ws'
import type { EventFrame, Frame } from './types'

export const BUFFER_SIZE = 500
export const PING_INTERVAL_MS = 15_000

type EventInput = Omit<EventFrame, 'eventId'>

/**
 * Event hub: assigns global event ids, keeps a replay buffer of the last 500 events and fans
 * frames out to connected sockets. While stalled, sockets stay open but receive nothing.
 */
export class Hub {
  private lastEventId = 0
  private buffer: EventFrame[] = []
  private clients = new Set<WebSocket>()
  private pingTimer: NodeJS.Timeout | undefined
  stalled = false

  constructor(
    private clock: () => number,
    private onFrame?: (frame: Frame) => void,
  ) {}

  get latestEventId(): number {
    return this.lastEventId
  }

  get connectionCount(): number {
    return this.clients.size
  }

  startPing(intervalMs = PING_INTERVAL_MS): void {
    this.stopPing()
    this.pingTimer = setInterval(() => {
      this.broadcast({ type: 'ping', ts: new Date(this.clock()).toISOString() })
    }, intervalMs)
    this.pingTimer.unref()
  }

  stopPing(): void {
    if (this.pingTimer) clearInterval(this.pingTimer)
    this.pingTimer = undefined
  }

  publish(event: EventInput): EventFrame {
    const frame = { ...event, eventId: ++this.lastEventId } as EventFrame
    this.buffer.push(frame)
    if (this.buffer.length > BUFFER_SIZE) this.buffer.shift()
    this.broadcast(frame)
    return frame
  }

  typing(ticketId: string, authorName: string): void {
    this.broadcast({ eventId: null, type: 'typing', ticketId, data: { authorName } })
  }

  /** Drops the replay buffer and tells connected clients to reload (used by reset). */
  resync(): void {
    this.buffer = []
    this.broadcast({ type: 'resync' })
  }

  /**
   * Frames a new connection should receive first. Replays from `lastEventId` inclusive when the
   * buffer still covers everything after it, otherwise a single `resync`.
   */
  replayFrames(lastEventId: number | undefined): Frame[] {
    if (lastEventId === undefined) return []
    if (!Number.isInteger(lastEventId) || lastEventId < 0 || lastEventId > this.lastEventId) {
      return [{ type: 'resync' }]
    }
    if (lastEventId === this.lastEventId && this.buffer.length === 0) return []
    const first = this.buffer[0]?.eventId
    if (first === undefined || first > lastEventId + 1) return [{ type: 'resync' }]
    return this.buffer.filter((f) => f.eventId >= lastEventId)
  }

  attach(ws: WebSocket, lastEventId: number | undefined): void {
    this.clients.add(ws)
    ws.on('close', () => this.clients.delete(ws))
    ws.on('error', () => this.clients.delete(ws))
    ws.on('message', () => {
      // Clients may reply to pings with { type: "pong" }; nothing else is accepted.
    })
    for (const frame of this.replayFrames(lastEventId)) this.send(ws, frame)
  }

  disconnectAll(): void {
    for (const ws of this.clients) ws.terminate()
    this.clients.clear()
  }

  private send(ws: WebSocket, frame: Frame): void {
    if (this.stalled) return
    if (ws.readyState !== ws.OPEN) return
    ws.send(JSON.stringify(frame))
    this.onFrame?.(frame)
  }

  private broadcast(frame: Frame): void {
    for (const ws of this.clients) this.send(ws, frame)
  }
}
