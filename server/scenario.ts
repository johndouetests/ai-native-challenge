import { createRng, pick, type Rng } from './rng'
import type { Hub } from './hub'
import type { Store } from './store'

/**
 * Deterministic background activity, one tick per second:
 * - every 20 s a customer message lands in an open ticket (typing 2 s before),
 * - every 45 s another agent changes a ticket,
 * - every 90 s a new ticket arrives.
 */
export class Scenario {
  private timer: NodeJS.Timeout | undefined
  private tick = 0
  private rng: Rng = createRng(1337)
  private nextMessageTicket: string | undefined
  paused = false

  constructor(
    private store: Store,
    private hub: Hub,
  ) {}

  start(): void {
    this.stop()
    this.timer = setInterval(() => this.step(), 1000)
    this.timer.unref()
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer)
    this.timer = undefined
  }

  reset(): void {
    this.tick = 0
    this.rng = createRng(1337)
    this.nextMessageTicket = undefined
  }

  step(): void {
    if (this.paused) return
    this.tick++
    const t = this.tick
    if (t % 20 === 18) {
      const open = this.store.openTicketIds()
      if (open.length) {
        this.nextMessageTicket = pick(this.rng, open)
        const ticket = this.store.tickets.get(this.nextMessageTicket)
        if (ticket) this.hub.typing(ticket.id, ticket.requester.name)
      }
    }
    if (t % 20 === 0 && this.nextMessageTicket) {
      this.store.createCustomerMessage(this.nextMessageTicket)
      this.nextMessageTicket = undefined
    }
    if (t % 45 === 0) {
      const ids = [...this.store.tickets.keys()]
      this.store.externalUpdate(pick(this.rng, ids))
    }
    if (t % 90 === 0) this.store.createTicket()
  }
}
