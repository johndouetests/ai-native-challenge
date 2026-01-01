import { SendHorizontal } from 'lucide-react'
import { useLayoutEffect, useRef, type FormEvent, type KeyboardEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { useStateRef } from '@/lib/useStateRef'
import { cn } from '@/lib/utils'
import { clearDraft, getDraft, useDraft } from './drafts'

export interface ComposerProps {
  ticketId: string
  closed: boolean
  disabled?: boolean
  send: (body: string) => Promise<boolean>
  onReopen: () => void
}

export const MAX_LENGTH = 4000
const COUNTER_FROM = 3800
const MAX_ROWS = 6
const LINE_HEIGHT_PX = 20
const VERTICAL_PADDING_PX = 16

/** Grows with the content up to six lines, then scrolls. */
function resize(el: HTMLTextAreaElement) {
  const border = el.offsetHeight - el.clientHeight
  el.style.height = 'auto'
  const content = el.scrollHeight
  const max = MAX_ROWS * LINE_HEIGHT_PX + VERTICAL_PADDING_PX
  el.style.height = `${Math.min(content, max) + border}px`
  el.style.overflowY = content > max ? 'auto' : 'hidden'
}

export function Composer({ ticketId, closed, disabled = false, send, onReopen }: ComposerProps) {
  const [text, setText] = useDraft(ticketId)
  // Tickets with a reply in flight: Send stays disabled until the server responds.
  const [inFlight, setInFlight, inFlightRef] = useStateRef<ReadonlySet<string>>(new Set())
  const textarea = useRef<HTMLTextAreaElement>(null)
  const length = text.length
  const canSend = !closed && !disabled && !inFlight.has(ticketId) && text.trim().length > 0 && length <= MAX_LENGTH

  useLayoutEffect(() => {
    if (textarea.current) resize(textarea.current)
  }, [ticketId, text])

  async function submit() {
    if (!canSend || inFlightRef.current.has(ticketId)) return
    const id = ticketId
    const body = text
    setInFlight((prev) => new Set(prev).add(id))
    try {
      const ok = await send(body)
      if (ok && getDraft(id) === body) clearDraft(id)
    } finally {
      setInFlight((prev) => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
    }
  }

  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key !== 'Enter' || event.shiftKey) return
    event.preventDefault()
    void submit()
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault()
    void submit()
  }

  return (
    <div data-testid="composer" className="shrink-0 border-t border-border bg-card px-4 py-3">
      {closed && (
        <div
          data-testid="ticket-closed-notice"
          className="mb-3 flex items-center justify-between gap-3 rounded-lg bg-muted px-3 py-2 text-sm text-foreground"
        >
          <span>This ticket is closed</span>
          <Button id="reopen-button" size="sm" variant="outline" data-testid="reopen-button" onClick={onReopen}>
            Reopen
          </Button>
        </div>
      )}
      <form className="flex items-end gap-2" onSubmit={onSubmit}>
        <label htmlFor="composer-input" className="sr-only">
          Reply
        </label>
        <Textarea
          id="composer-input"
          ref={textarea}
          value={text}
          data-testid="composer-input"
          rows={1}
          maxLength={MAX_LENGTH}
          disabled={closed || disabled}
          placeholder={closed ? 'Reopen the ticket to reply' : 'Write a reply…'}
          className="min-h-10 bg-white leading-5"
          onChange={(e) => setText(e.target.value)}
          onKeyDown={onKeyDown}
        />
        <Button type="submit" size="icon" data-testid="send-button" disabled={!canSend}>
          <SendHorizontal aria-hidden="true" />
        </Button>
      </form>
      {length >= COUNTER_FROM && (
        <p
          data-testid="char-counter"
          data-at-limit={length >= MAX_LENGTH ? 'true' : 'false'}
          className={cn(
            'mt-1 text-right text-xs',
            length >= MAX_LENGTH ? 'font-medium text-destructive' : 'text-muted-foreground',
          )}
        >
          {length} / {MAX_LENGTH}
        </p>
      )}
    </div>
  )
}
