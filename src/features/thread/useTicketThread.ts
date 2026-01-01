import { onScopeDispose, ref, shallowRef, watch, type Ref } from 'vue'
import { toast } from 'vue-sonner'
import { ApiError, isAbortError, request } from '@/lib/api'
import type { Message, MessagePage, RealtimeEvent, Ticket, ThreadMessage, TicketSummary } from '@/lib/types'
import { createId } from '@/lib/utils'
import { realtime as socket } from '@/features/realtime/realtimeClient'
import { useRealtime } from '@/features/realtime/useRealtime'
import { useDirectory } from '@/features/tickets/directory'
import { inbox } from '@/features/tickets/inbox'
import { mergeMessages, updateDelivery } from './messages'

export type ThreadStatus = 'loading' | 'ready' | 'not-found' | 'error'
export type TicketChange = Partial<Pick<Ticket, 'status' | 'priority' | 'assigneeId'>>

export const MESSAGE_PAGE_SIZE = 30
export const TYPING_TIMEOUT_MS = 4_000

export function toSummary(ticket: Ticket): TicketSummary {
  return { ...ticket, requester: { name: ticket.requester.name } }
}

export function useTicketThread(ticketId: Ref<string>) {
  const ticket = ref<Ticket | null>(null)
  const status = ref<ThreadStatus>('loading')
  const messages = shallowRef<ThreadMessage[]>([])
  const prevCursor = ref<string | null>(null)
  const loadingOlder = ref(false)
  const updating = ref(false)
  const typingAuthor = ref<string | null>(null)
  const directory = useDirectory()
  const realtime = useRealtime()

  let controller: AbortController | null = null
  let typingTimer: ReturnType<typeof setTimeout> | undefined
  let readMarkedFor: string | null = null
  let queuedEvents: RealtimeEvent[] = []
  let deferredTicket: TicketSummary | null = null

  function clearTyping() {
    clearTimeout(typingTimer)
    typingAuthor.value = null
  }

  async function load() {
    controller?.abort()
    const current = new AbortController()
    controller = current
    const id = ticketId.value
    const pending = messages.value.filter((m) => m.ticketId === id && (m.delivery === 'sending' || m.delivery === 'failed'))
    status.value = 'loading'
    ticket.value = null
    messages.value = []
    prevCursor.value = null
    loadingOlder.value = false
    queuedEvents = []
    clearTyping()
    try {
      const [loaded, page] = await Promise.all([
        request<Ticket>(`/tickets/${encodeURIComponent(id)}`, { signal: current.signal }),
        request<MessagePage>(`/tickets/${encodeURIComponent(id)}/messages`, {
          query: { limit: MESSAGE_PAGE_SIZE },
          signal: current.signal,
        }),
      ])
      if (current.signal.aborted) return
      ticket.value = loaded
      messages.value = mergeMessages(pending, page.items)
      prevCursor.value = page.prevCursor
      status.value = 'ready'
      markRead(loaded)
      const queued = queuedEvents
      queuedEvents = []
      for (const event of queued) handleEvent(event)
    } catch (err) {
      if (isAbortError(err) || current.signal.aborted) return
      status.value = err instanceof ApiError && err.status === 404 ? 'not-found' : 'error'
    }
  }

  /** POST /read once per opening of a ticket. */
  function markRead(loaded: Ticket) {
    if (readMarkedFor === loaded.id) return
    readMarkedFor = loaded.id
    request(`/tickets/${encodeURIComponent(loaded.id)}/read`, { method: 'POST' }).catch(() => undefined)
    if (loaded.unread) {
      ticket.value = { ...loaded, unread: false }
      inbox.markOpened(loaded.id)
    }
  }

  async function loadOlder(): Promise<boolean> {
    const current = controller
    const cursor = prevCursor.value
    if (!current || !cursor || loadingOlder.value || status.value !== 'ready') return false
    loadingOlder.value = true
    try {
      const page = await request<MessagePage>(`/tickets/${encodeURIComponent(ticketId.value)}/messages`, {
        query: { before: cursor, limit: MESSAGE_PAGE_SIZE },
        signal: current.signal,
      })
      if (current.signal.aborted) return false
      messages.value = mergeMessages(messages.value, page.items)
      prevCursor.value = page.prevCursor
      return true
    } catch {
      return false
    } finally {
      if (!current.signal.aborted) loadingOlder.value = false
    }
  }

  async function reloadTicket() {
    const id = ticketId.value
    try {
      const fresh = await request<Ticket>(`/tickets/${encodeURIComponent(id)}`)
      if (ticketId.value === id) ticket.value = fresh
      inbox.publishTicket(toSummary(fresh))
    } catch {
      // keep what we have; the next event or reload will correct it
    }
  }

  async function update(change: TicketChange, successMessage = 'Ticket updated'): Promise<boolean> {
    const previous = ticket.value
    if (!previous || updating.value) return false
    ticket.value = { ...previous, ...change }
    updating.value = true
    toast.success(successMessage)
    try {
      const saved = await request<Ticket>(`/tickets/${encodeURIComponent(previous.id)}`, {
        method: 'PATCH',
        body: { version: previous.version, ...change },
      })
      if (ticket.value?.id === saved.id) ticket.value = saved
      inbox.publishTicket(toSummary(saved))
      return true
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        toast.error('Ticket was updated by someone else')
        await reloadTicket()
      } else {
        toast.error('Couldn’t update ticket')
      }
      return false
    } finally {
      updating.value = false
      const deferred = deferredTicket
      deferredTicket = null
      if (deferred) applyTicketEvent(deferred)
    }
  }

  async function deliver(message: ThreadMessage): Promise<boolean> {
    const clientMessageId = message.clientMessageId as string
    try {
      const saved = await request<Message>(`/tickets/${encodeURIComponent(message.ticketId)}/messages`, {
        method: 'POST',
        body: { clientMessageId, body: message.body },
      })
      if (ticketId.value === message.ticketId) messages.value = [...messages.value.filter((m) => m.id !== saved.id), saved]
      return true
    } catch (err) {
      if (ticketId.value === message.ticketId) {
        messages.value = updateDelivery(messages.value, clientMessageId, 'failed')
      }
      if (err instanceof ApiError && err.code === 'ticket_closed') {
        toast.error('This ticket is closed')
        void reloadTicket()
      }
      return false
    }
  }

  /** Sends a reply with an optimistic bubble. Resolves true once the server accepted it. */
  function send(body: string): Promise<boolean> {
    const current = ticket.value
    if (!current || current.status === 'closed') return Promise.resolve(false)
    const me = directory.me
    const clientMessageId = createId()
    const local: ThreadMessage = {
      id: `local-${clientMessageId}`,
      ticketId: current.id,
      type: 'agent',
      authorName: me?.name ?? 'You',
      authorId: me?.id ?? null,
      body,
      createdAt: new Date().toISOString(),
      clientMessageId,
      delivery: 'sending',
    }
    messages.value = [...messages.value, local]
    return deliver(local)
  }

  function retry(clientMessageId: string): Promise<boolean> {
    const message = messages.value.find((m) => m.clientMessageId === clientMessageId && m.delivery === 'failed')
    if (!message) return Promise.resolve(false)
    messages.value = updateDelivery(messages.value, clientMessageId, 'sending')
    return deliver(message)
  }

  function applyTicketEvent(summary: TicketSummary) {
    const current = ticket.value
    if (!current || current.id !== summary.id || summary.version < current.version) return
    if (updating.value) {
      deferredTicket = summary
      return
    }
    ticket.value = { ...current, ...summary, requester: { ...current.requester, name: summary.requester.name } }
  }

  function handleEvent(event: RealtimeEvent) {
    if (status.value === 'loading') {
      queuedEvents.push(event)
      return
    }
    if (status.value !== 'ready') return
    if (event.type === 'message.created') {
      messages.value = mergeMessages(messages.value, [event.data])
      if (typingAuthor.value !== null && event.data.authorName === typingAuthor.value) clearTyping()
    } else if (event.type === 'ticket.updated') {
      applyTicketEvent(event.data)
    } else if (event.type === 'typing') {
      typingAuthor.value = event.data.authorName
      clearTimeout(typingTimer)
      typingTimer = setTimeout(clearTyping, TYPING_TIMEOUT_MS)
    }
  }

  realtime.onResync(() => void load())

  watch(
    ticketId,
    (id) => {
      readMarkedFor = null
      socket.subscribe((event) => {
        if (event.ticketId === id) handleEvent(event)
      })
      void load()
    },
    { immediate: true },
  )

  onScopeDispose(() => {
    controller?.abort()
    clearTimeout(typingTimer)
  })

  return {
    ticket,
    status,
    messages,
    prevCursor,
    loadingOlder,
    updating,
    typingAuthor,
    reload: load,
    loadOlder,
    update,
    send,
    retry,
  }
}
