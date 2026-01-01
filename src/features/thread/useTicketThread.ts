import { useCallback, useEffect, useLayoutEffect, useRef } from 'react'
import { toast } from 'sonner'
import { ApiError, isAbortError, request } from '@/lib/api'
import type { Message, MessagePage, RealtimeEvent, Ticket, ThreadMessage, TicketSummary } from '@/lib/types'
import { useStateRef } from '@/lib/useStateRef'
import { createId } from '@/lib/utils'
import { realtime } from '@/features/realtime/realtimeClient'
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

export interface ThreadState {
  ticket: Ticket | null
  status: ThreadStatus
  messages: ThreadMessage[]
  prevCursor: string | null
  loadingOlder: boolean
  updating: boolean
  typingAuthor: string | null
}

const INITIAL: ThreadState = {
  ticket: null,
  status: 'loading',
  messages: [],
  prevCursor: null,
  loadingOlder: false,
  updating: false,
  typingAuthor: null,
}

function ticketPath(id: string, suffix = ''): string {
  return `/tickets/${encodeURIComponent(id)}${suffix}`
}

export function useTicketThread(ticketId: string) {
  const [state, setState, stateRef] = useStateRef<ThreadState>(INITIAL)
  const { me } = useDirectory()
  const meRef = useRef(me)
  useEffect(() => {
    meRef.current = me
  }, [me])

  // The ticket currently shown; async work for another ticket must not touch the thread.
  const ticketIdRef = useRef(ticketId)
  const controllerRef = useRef<AbortController | null>(null)
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const readMarkedForRef = useRef<string | null>(null)
  const queuedEventsRef = useRef<RealtimeEvent[]>([])
  const deferredTicketRef = useRef<TicketSummary | null>(null)

  const clearTyping = useCallback(() => {
    clearTimeout(typingTimerRef.current)
    setState((prev) => (prev.typingAuthor === null ? prev : { ...prev, typingAuthor: null }))
  }, [setState])

  /** POST /read once per opening of a ticket. */
  const markRead = useCallback(
    (loaded: Ticket) => {
      if (readMarkedForRef.current === loaded.id) return
      readMarkedForRef.current = loaded.id
      request(ticketPath(loaded.id, '/read'), { method: 'POST' }).catch(() => undefined)
      if (loaded.unread) {
        setState((prev) => ({ ...prev, ticket: prev.ticket && { ...prev.ticket, unread: false } }))
        inbox.markOpened(loaded.id)
      }
    },
    [setState],
  )

  const applyTicketEvent = useCallback(
    (summary: TicketSummary) => {
      const current = stateRef.current.ticket
      if (!current || current.id !== summary.id || summary.version < current.version) return
      if (stateRef.current.updating) {
        deferredTicketRef.current = summary
        return
      }
      setState((prev) => ({
        ...prev,
        ticket: prev.ticket && {
          ...prev.ticket,
          ...summary,
          requester: { ...prev.ticket.requester, name: summary.requester.name },
        },
      }))
    },
    [setState, stateRef],
  )

  const handleEvent = useCallback(
    (event: RealtimeEvent) => {
      if (event.ticketId !== ticketId) return
      const { status, typingAuthor } = stateRef.current
      if (status === 'loading') {
        queuedEventsRef.current.push(event)
        return
      }
      if (status !== 'ready') return
      if (event.type === 'message.created') {
        setState((prev) => ({ ...prev, messages: mergeMessages(prev.messages, [event.data]) }))
        if (typingAuthor !== null && event.data.authorName === typingAuthor) clearTyping()
      } else if (event.type === 'ticket.updated') {
        applyTicketEvent(event.data)
      } else if (event.type === 'typing') {
        setState((prev) => ({ ...prev, typingAuthor: event.data.authorName }))
        clearTimeout(typingTimerRef.current)
        typingTimerRef.current = setTimeout(clearTyping, TYPING_TIMEOUT_MS)
      }
    },
    [ticketId, applyTicketEvent, clearTyping, setState, stateRef],
  )

  const load = useCallback(async () => {
    controllerRef.current?.abort()
    const current = new AbortController()
    controllerRef.current = current
    const id = ticketId
    // Unsent replies of this ticket survive a reload.
    const pending = stateRef.current.messages.filter(
      (m) => m.ticketId === id && (m.delivery === 'sending' || m.delivery === 'failed'),
    )
    queuedEventsRef.current = []
    clearTimeout(typingTimerRef.current)
    setState(INITIAL)
    try {
      const [loaded, page] = await Promise.all([
        request<Ticket>(ticketPath(id), { signal: current.signal }),
        request<MessagePage>(ticketPath(id, '/messages'), {
          query: { limit: MESSAGE_PAGE_SIZE },
          signal: current.signal,
        }),
      ])
      if (current.signal.aborted) return
      setState({
        ...INITIAL,
        ticket: loaded,
        status: 'ready',
        messages: mergeMessages(pending, page.items),
        prevCursor: page.prevCursor,
      })
      markRead(loaded)
      const queued = queuedEventsRef.current
      queuedEventsRef.current = []
      for (const event of queued) handleEvent(event)
    } catch (err) {
      if (isAbortError(err) || current.signal.aborted) return
      setState((prev) => ({
        ...prev,
        status: err instanceof ApiError && err.status === 404 ? 'not-found' : 'error',
      }))
    }
  }, [ticketId, handleEvent, markRead, setState, stateRef])

  const loadOlder = useCallback(async (): Promise<boolean> => {
    const current = controllerRef.current
    const { prevCursor: cursor, loadingOlder, status } = stateRef.current
    if (!current || !cursor || loadingOlder || status !== 'ready') return false
    setState((prev) => ({ ...prev, loadingOlder: true }))
    try {
      const page = await request<MessagePage>(ticketPath(ticketId, '/messages'), {
        query: { before: cursor, limit: MESSAGE_PAGE_SIZE },
        signal: current.signal,
      })
      if (current.signal.aborted) return false
      setState((prev) => ({
        ...prev,
        messages: mergeMessages(prev.messages, page.items),
        prevCursor: page.prevCursor,
        loadingOlder: false,
      }))
      return true
    } catch {
      if (!current.signal.aborted) setState((prev) => ({ ...prev, loadingOlder: false }))
      return false
    }
  }, [ticketId, setState, stateRef])

  const reloadTicket = useCallback(
    async (id: string) => {
      try {
        const fresh = await request<Ticket>(ticketPath(id))
        if (ticketIdRef.current === id) setState((prev) => ({ ...prev, ticket: fresh }))
        inbox.publishTicket(toSummary(fresh))
      } catch {
        // keep what we have; the next event or reload will correct it
      }
    },
    [setState],
  )

  const update = useCallback(
    async (change: TicketChange, successMessage = 'Ticket updated'): Promise<boolean> => {
      const previous = stateRef.current.ticket
      if (!previous || stateRef.current.updating) return false
      setState((prev) => ({ ...prev, ticket: { ...previous, ...change }, updating: true }))
      toast.success(successMessage)
      try {
        const saved = await request<Ticket>(ticketPath(previous.id), {
          method: 'PATCH',
          body: { version: previous.version, ...change },
        })
        setState((prev) => (prev.ticket?.id === saved.id ? { ...prev, ticket: saved } : prev))
        inbox.publishTicket(toSummary(saved))
        return true
      } catch (err) {
        if (err instanceof ApiError && err.status === 409) {
          toast.error('Ticket was updated by someone else')
          await reloadTicket(previous.id)
        } else {
          toast.error('Couldn’t update ticket')
        }
        return false
      } finally {
        setState((prev) => ({ ...prev, updating: false }))
        const deferred = deferredTicketRef.current
        deferredTicketRef.current = null
        if (deferred) applyTicketEvent(deferred)
      }
    },
    [applyTicketEvent, reloadTicket, setState, stateRef],
  )

  const deliver = useCallback(
    async (message: ThreadMessage): Promise<boolean> => {
      const clientMessageId = message.clientMessageId as string
      try {
        const saved = await request<Message>(ticketPath(message.ticketId, '/messages'), {
          method: 'POST',
          body: { clientMessageId, body: message.body },
        })
        if (ticketIdRef.current === message.ticketId) {
          setState((prev) =>
            prev.messages.some((m) => m.id === saved.id) ? prev : { ...prev, messages: [...prev.messages, saved] },
          )
        }
        return true
      } catch (err) {
        if (ticketIdRef.current === message.ticketId) {
          setState((prev) => ({ ...prev, messages: updateDelivery(prev.messages, clientMessageId, 'failed') }))
        }
        if (err instanceof ApiError && err.code === 'ticket_closed') {
          toast.error('This ticket is closed')
          void reloadTicket(message.ticketId)
        }
        return false
      }
    },
    [reloadTicket, setState],
  )

  /** Sends a reply with an optimistic bubble. Resolves true once the server accepted it. */
  const send = useCallback(
    (body: string): Promise<boolean> => {
      const current = stateRef.current.ticket
      if (!current || current.status === 'closed') return Promise.resolve(false)
      const author = meRef.current
      const clientMessageId = createId()
      const local: ThreadMessage = {
        id: `local-${clientMessageId}`,
        ticketId: current.id,
        type: 'agent',
        authorName: author?.name ?? 'You',
        authorId: author?.id ?? null,
        body,
        createdAt: new Date().toISOString(),
        clientMessageId,
        delivery: 'sending',
      }
      setState((prev) => ({ ...prev, messages: [...prev.messages, local] }))
      return deliver(local)
    },
    [deliver, setState, stateRef],
  )

  const retry = useCallback(
    (clientMessageId: string): Promise<boolean> => {
      const message = stateRef.current.messages.find(
        (m) => m.clientMessageId === clientMessageId && m.delivery === 'failed',
      )
      if (!message) return Promise.resolve(false)
      setState((prev) => ({ ...prev, messages: updateDelivery(prev.messages, clientMessageId, 'sending') }))
      return deliver(message)
    },
    [deliver, setState, stateRef],
  )

  const onResync = useCallback(() => void load(), [load])
  useRealtime({ onResync })

  // Opening another ticket: reset before paint, load it, and abort everything on the way out.
  useLayoutEffect(() => {
    ticketIdRef.current = ticketId
    readMarkedForRef.current = null
    realtime.subscribe(handleEvent)
    void load()
    return () => {
      controllerRef.current?.abort()
      clearTimeout(typingTimerRef.current)
    }
  }, [ticketId, load, handleEvent])

  return { ...state, reload: load, loadOlder, update, send, retry }
}
