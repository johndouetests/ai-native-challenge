import { ArrowDown, LoaderCircle } from 'lucide-react'
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useNow } from '@/lib/now'
import { dayKey, formatDayLabel } from '@/lib/time'
import type { ThreadMessage } from '@/lib/types'
import { cn, prefersReducedMotion } from '@/lib/utils'
import { MessageBubble } from './MessageBubble'

export interface MessageListProps {
  ticketId: string
  messages: ThreadMessage[]
  loading: boolean
  prevCursor: string | null
  loadingOlder: boolean
  loadOlder: () => Promise<boolean>
  onRetry: (clientMessageId: string) => void
}

const LOAD_OLDER_THRESHOLD_PX = 80
const STICK_TO_BOTTOM_PX = 120
const SKELETONS = [1, 2, 3, 4, 5]

type Row = { kind: 'day'; key: string; label: string } | { kind: 'message'; key: string; message: ThreadMessage }

/** Optimistic bubbles keep their key when the server copy replaces them. */
function messageKey(message: ThreadMessage): string {
  return message.clientMessageId ?? message.id
}

function buildRows(messages: ThreadMessage[], now: number): Row[] {
  const rows: Row[] = []
  let lastDay = ''
  for (const message of messages) {
    const day = dayKey(message.createdAt)
    if (day !== lastDay) {
      lastDay = day
      rows.push({ kind: 'day', key: `day-${day}`, label: formatDayLabel(message.createdAt, now) })
    }
    rows.push({ kind: 'message', key: messageKey(message), message })
  }
  return rows
}

function distanceFromBottom(el: HTMLElement): number {
  return el.scrollHeight - el.scrollTop - el.clientHeight
}

export function MessageList({
  ticketId,
  messages,
  loading,
  prevCursor,
  loadingOlder,
  loadOlder,
  onRetry,
}: MessageListProps) {
  const scroller = useRef<HTMLDivElement>(null)
  const content = useRef<HTMLDivElement>(null)
  const now = useNow()
  const rows = useMemo(() => buildRows(messages, now), [messages, now])
  const [newCount, setNewCount] = useState(0)

  // A new ticket or a fresh load starts without the "new messages" counter.
  const view = `${ticketId}:${loading}`
  const [countedView, setCountedView] = useState(view)
  if (countedView !== view) {
    setCountedView(view)
    setNewCount(0)
  }

  // Distance from the bottom as last seen by the reader, i.e. before the newest DOM update.
  const distanceRef = useRef(0)
  // Scroll geometry captured before older messages are requested (FR-D-08).
  const anchorRef = useRef<{ top: number } | null>(null)
  const firstKeyRef = useRef<string | null>(null)
  const lastKeyRef = useRef<string | null>(null)
  // After the first page the thread stays pinned to the bottom while late layout changes (web font
  // subsets, wrapping) settle, until the reader scrolls away or the next message arrives.
  const pinnedRef = useRef<{ top: number } | null>(null)
  const latest = useRef({ loading, prevCursor, loadingOlder, loadOlder })
  useLayoutEffect(() => {
    latest.current = { loading, prevCursor, loadingOlder, loadOlder }
  })

  const scrollToBottom = useCallback((smooth: boolean) => {
    const el = scroller.current
    if (!el) return
    el.scrollTo({ top: el.scrollHeight, behavior: smooth && !prefersReducedMotion() ? 'smooth' : 'auto' })
    if (!smooth) distanceRef.current = distanceFromBottom(el)
  }, [])

  const pinToBottom = useCallback(() => {
    scrollToBottom(false)
    pinnedRef.current = { top: scroller.current?.scrollTop ?? 0 }
  }, [scrollToBottom])

  const maybeLoadOlder = useCallback(async () => {
    const el = scroller.current
    const { loading, prevCursor, loadingOlder, loadOlder } = latest.current
    if (!el || loading || !prevCursor || loadingOlder || anchorRef.current) return
    if (el.scrollTop > LOAD_OLDER_THRESHOLD_PX) return
    // Keep the message at the top edge in place: remember the geometry before the insert.
    anchorRef.current = { top: el.scrollTop }
    const loaded = await loadOlder()
    if (!loaded) anchorRef.current = null
  }, [])

  // First page of a ticket: jump to the bottom before paint.
  useLayoutEffect(() => {
    anchorRef.current = null
    pinnedRef.current = null
    if (loading) return
    pinToBottom()
    void maybeLoadOlder()
  }, [ticketId, loading, pinToBottom, maybeLoadOlder])

  useEffect(() => {
    const el = content.current
    if (!el || typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(() => {
      if (pinnedRef.current) pinToBottom()
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [loading, pinToBottom])

  useLayoutEffect(() => {
    const first = messages[0]
    const last = messages[messages.length - 1]
    const firstKey = first ? messageKey(first) : null
    const lastKey = last ? messageKey(last) : null
    const previousFirst = firstKeyRef.current
    const previousLast = lastKeyRef.current
    firstKeyRef.current = firstKey
    lastKeyRef.current = lastKey
    const el = scroller.current
    if (!el || loading) return

    // Older messages were inserted above: restore the reader's position.
    const anchor = anchorRef.current
    if (anchor && firstKey !== previousFirst) {
      anchorRef.current = null
      el.scrollTop = anchor.top
      distanceRef.current = distanceFromBottom(el)
      void maybeLoadOlder()
    }

    // Appended messages: follow them when the reader was near the bottom, otherwise count them.
    if (!last || previousLast === null || lastKey === previousLast) return
    pinnedRef.current = null
    const previousIndex = messages.findIndex((m) => messageKey(m) === previousLast)
    if (previousIndex === -1) return
    const added = messages.length - 1 - previousIndex
    const ownSend = last.delivery === 'sending'
    if (ownSend || distanceRef.current <= STICK_TO_BOTTOM_PX) scrollToBottom(!ownSend)
    else setNewCount((count) => count + added)
  }, [messages, loading, scrollToBottom, maybeLoadOlder])

  function onScroll() {
    const el = scroller.current
    if (!el) return
    if (pinnedRef.current && el.scrollTop < pinnedRef.current.top - 1) pinnedRef.current = null
    distanceRef.current = distanceFromBottom(el)
    if (newCount > 0 && distanceRef.current <= STICK_TO_BOTTOM_PX) setNewCount(0)
    void maybeLoadOlder()
  }

  function showNewMessages() {
    setNewCount(0)
    scrollToBottom(true)
  }

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      <div
        ref={scroller}
        data-testid="message-list"
        role="log"
        aria-label="Messages"
        tabIndex={0}
        className="min-h-0 flex-1 overflow-y-auto px-4 py-2 [overflow-anchor:none] focus-visible:[outline-offset:-2px]"
        onScroll={onScroll}
      >
        {loading ? (
          <div className="flex flex-col gap-4 py-4" aria-busy="true" aria-label="Loading messages" role="status">
            {SKELETONS.map((n) => (
              <div
                key={n}
                data-testid="message-skeleton"
                className={cn('flex items-end gap-2', n % 2 === 0 && 'flex-row-reverse')}
              >
                <Skeleton className="size-7 shrink-0 rounded-full" />
                <Skeleton className={cn('h-14 rounded-xl', n % 2 === 0 ? 'w-1/2' : 'w-2/3')} />
              </div>
            ))}
          </div>
        ) : (
          <>
            <div className="flex h-8 items-center justify-center text-xs text-muted-foreground">
              {!prevCursor ? (
                <p data-testid="conversation-start">Beginning of conversation</p>
              ) : loadingOlder ? (
                <p data-testid="loading-older" className="flex items-center gap-2">
                  <LoaderCircle className="size-3.5 animate-spin" aria-hidden="true" />
                  Loading earlier messages
                </p>
              ) : null}
            </div>
            <div ref={content} className="flex flex-col gap-3 pb-2">
              {rows.map((row) =>
                row.kind === 'day' ? (
                  <div
                    key={row.key}
                    data-testid="day-separator"
                    className="flex items-center gap-3 py-1 text-xs font-medium text-muted-foreground"
                  >
                    <span className="h-px flex-1 bg-border" aria-hidden="true" />
                    <span>{row.label}</span>
                    <span className="h-px flex-1 bg-border" aria-hidden="true" />
                  </div>
                ) : (
                  <MessageBubble key={row.key} message={row.message} onRetry={onRetry} />
                ),
              )}
            </div>
          </>
        )}
      </div>
      {newCount > 0 && (
        <Button
          data-testid="new-messages-button"
          size="sm"
          className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full shadow-lg"
          onClick={showNewMessages}
        >
          <ArrowDown aria-hidden="true" />
          {newCount} new {newCount === 1 ? 'message' : 'messages'}
        </Button>
      )}
    </div>
  )
}
