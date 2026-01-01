import { shallowRef, type ShallowRef } from 'vue'
import type { RealtimeEvent } from '@/lib/types'

export type ConnectionState = 'live' | 'reconnecting' | 'offline'

export const HEARTBEAT_TIMEOUT_MS = 35_000
export const MAX_FAILED_ATTEMPTS = 3
const BASE_DELAY_MS = 1_000
const MAX_DELAY_MS = 15_000

/** 1, 2, 4, 8 … seconds capped at 15 s, with ±20% jitter. */
export function backoffDelay(attempt: number, random: () => number = Math.random): number {
  const base = Math.min(BASE_DELAY_MS * 2 ** attempt, MAX_DELAY_MS)
  return Math.round(base * (0.8 + random() * 0.4))
}

type ServerFrame = RealtimeEvent | { type: 'ping'; ts: string } | { type: 'resync' }
type EventListener = (event: RealtimeEvent) => void
type ResyncListener = () => void

export interface RealtimeClientOptions {
  url: () => string
  createSocket?: (url: string) => WebSocket
  random?: () => number
  isOnline?: () => boolean
}

/**
 * The single WebSocket connection of the app. Tracks the last processed eventId, reconnects with
 * backoff, treats 35 s without frames as a dead connection and drops replayed events.
 */
export class RealtimeClient {
  readonly state: ShallowRef<ConnectionState> = shallowRef('reconnecting')
  lastEventId: number | null = null

  private socket: WebSocket | null = null
  private attempt = 0
  private failures = 0
  private running = false
  private reconnectTimer: ReturnType<typeof setTimeout> | undefined
  private heartbeatTimer: ReturnType<typeof setTimeout> | undefined
  private eventListeners = new Set<EventListener>()
  private resyncListeners = new Set<ResyncListener>()

  constructor(private options: RealtimeClientOptions) {}

  start(): void {
    if (this.running) return
    this.running = true
    if (typeof window !== 'undefined') {
      window.addEventListener('online', this.handleOnline)
      window.addEventListener('offline', this.handleOffline)
    }
    this.connect()
  }

  stop(): void {
    this.running = false
    if (typeof window !== 'undefined') {
      window.removeEventListener('online', this.handleOnline)
      window.removeEventListener('offline', this.handleOffline)
    }
    clearTimeout(this.reconnectTimer)
    this.dropSocket()
  }

  subscribe(listener: EventListener): () => void {
    this.eventListeners.add(listener)
    return () => this.eventListeners.delete(listener)
  }

  onResync(listener: ResyncListener): () => void {
    this.resyncListeners.add(listener)
    return () => this.resyncListeners.delete(listener)
  }

  get listenerCount(): number {
    return this.eventListeners.size
  }

  private isOnline(): boolean {
    if (this.options.isOnline) return this.options.isOnline()
    return typeof navigator === 'undefined' || navigator.onLine !== false
  }

  private connect(): void {
    clearTimeout(this.reconnectTimer)
    if (!this.running) return
    if (!this.isOnline()) {
      this.state.value = 'offline'
      return
    }
    const base = this.options.url()
    const url = this.lastEventId === null ? base : `${base}?lastEventId=${this.lastEventId}`
    const socket = this.options.createSocket ? this.options.createSocket(url) : new WebSocket(url)
    this.socket = socket
    let opened = false

    socket.onopen = () => {
      if (this.socket !== socket) return
      opened = true
      this.attempt = 0
      this.failures = 0
      this.state.value = 'live'
      this.armHeartbeat()
    }
    socket.onmessage = (message: MessageEvent) => {
      if (this.socket !== socket) return
      this.armHeartbeat()
      let frame: ServerFrame
      try {
        frame = JSON.parse(String(message.data)) as ServerFrame
      } catch {
        return
      }
      this.handleFrame(frame)
    }
    socket.onclose = () => {
      if (this.socket !== socket) return
      this.socket = null
      clearTimeout(this.heartbeatTimer)
      if (!opened) this.failures++
      this.scheduleReconnect()
    }
  }

  private handleFrame(frame: ServerFrame): void {
    if (frame.type === 'ping') {
      this.socket?.send(JSON.stringify({ type: 'pong' }))
      return
    }
    if (frame.type === 'resync') {
      this.lastEventId = null
      for (const listener of [...this.resyncListeners]) listener()
      return
    }
    if (frame.eventId !== null) {
      if (this.lastEventId !== null && frame.eventId <= this.lastEventId) return
      this.lastEventId = frame.eventId
    }
    for (const listener of [...this.eventListeners]) listener(frame)
  }

  private scheduleReconnect(): void {
    if (!this.running) return
    this.state.value = this.failures >= MAX_FAILED_ATTEMPTS || !this.isOnline() ? 'offline' : 'reconnecting'
    const delay = backoffDelay(this.attempt, this.options.random)
    this.attempt++
    clearTimeout(this.reconnectTimer)
    this.reconnectTimer = setTimeout(() => this.connect(), delay)
  }

  private armHeartbeat(): void {
    clearTimeout(this.heartbeatTimer)
    this.heartbeatTimer = setTimeout(() => {
      // No frames (not even ping) for 35 s: the connection is considered dead.
      this.dropSocket()
      this.scheduleReconnect()
    }, HEARTBEAT_TIMEOUT_MS)
  }

  private dropSocket(): void {
    clearTimeout(this.heartbeatTimer)
    const socket = this.socket
    this.socket = null
    if (socket) {
      socket.onopen = null
      socket.onmessage = null
      socket.onclose = null
      try {
        socket.close()
      } catch {
        // already closed
      }
    }
  }

  private handleOnline = () => {
    this.attempt = 0
    this.failures = 0
    if (!this.socket) this.connect()
  }

  private handleOffline = () => {
    this.state.value = 'offline'
    this.dropSocket()
    clearTimeout(this.reconnectTimer)
  }
}

function defaultUrl(): string {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  return `${protocol}//${window.location.host}/ws`
}

export const realtime = new RealtimeClient({ url: defaultUrl })
