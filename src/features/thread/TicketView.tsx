import { ArrowLeft, CircleAlert, SearchX } from 'lucide-react'
import { useCallback, useEffect } from 'react'
import { Link, useLocation, useParams } from 'react-router'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useWideLayout } from '@/app/layout'
import { filtersToSearch, parseFilters } from '@/features/tickets/filters'
import { Composer } from './Composer'
import { MessageList } from './MessageList'
import { TicketHeader } from './TicketHeader'
import { TypingIndicator } from './TypingIndicator'
import { useTicketThread } from './useTicketThread'

function HeaderSkeleton() {
  return (
    <div data-testid="ticket-header-skeleton" className="shrink-0 space-y-3 border-b border-border bg-card px-4 py-3">
      <Skeleton className="h-4 w-40" />
      <Skeleton className="h-6 w-3/4" />
      <Skeleton className="h-4 w-56" />
      <div className="flex gap-2">
        <Skeleton className="h-9 w-[8.5rem]" />
        <Skeleton className="h-9 w-[8.5rem]" />
        <Skeleton className="h-9 w-[11rem]" />
      </div>
    </div>
  )
}

export function TicketView() {
  const ticketId = useParams().id ?? ''
  const isWide = useWideLayout()
  const location = useLocation()
  const listLink = { pathname: '/tickets', search: filtersToSearch(parseFilters(new URLSearchParams(location.search))) }
  const thread = useTicketThread(ticketId)
  const { ticket, status, messages, prevCursor, loadingOlder, updating, typingAuthor, update } = thread

  const title = ticket ? `${ticket.key} · ${ticket.subject} — Deskline` : 'Deskline'
  useEffect(() => {
    document.title = title
  }, [title])

  const reopen = useCallback(() => void update({ status: 'open' }, 'Ticket reopened'), [update])

  return (
    <section data-testid="ticket-view" className="flex h-full min-h-0 flex-col bg-background" aria-label="Ticket">
      {!isWide && (
        <div className="flex h-14 shrink-0 items-center border-b border-border bg-card px-2">
          <Button variant="ghost" asChild>
            <Link to={listLink} data-testid="back-button" aria-label="Back to tickets">
              <ArrowLeft aria-hidden="true" />
              Back
            </Link>
          </Button>
        </div>
      )}

      {status === 'not-found' ? (
        <div
          data-testid="ticket-not-found"
          className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center"
        >
          <SearchX className="size-8 text-muted-foreground" aria-hidden="true" />
          <h2 className="text-lg font-semibold text-foreground">Ticket not found</h2>
          <Link
            to={listLink}
            data-testid="not-found-back"
            className="rounded text-sm font-medium text-primary underline-offset-4 hover:underline focus-ring"
          >
            Back to inbox
          </Link>
        </div>
      ) : status === 'error' ? (
        <div
          data-testid="thread-error"
          role="alert"
          className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center"
        >
          <CircleAlert className="size-8 text-destructive" aria-hidden="true" />
          <p className="text-sm font-medium text-foreground">Couldn’t load this ticket</p>
          <Button variant="outline" data-testid="thread-retry" onClick={() => void thread.reload()}>
            Retry
          </Button>
        </div>
      ) : (
        <>
          {ticket ? <TicketHeader ticket={ticket} updating={updating} update={update} /> : <HeaderSkeleton />}
          <MessageList
            ticketId={ticketId}
            messages={messages}
            loading={status === 'loading'}
            prevCursor={prevCursor}
            loadingOlder={loadingOlder}
            loadOlder={thread.loadOlder}
            onRetry={thread.retry}
          />
          <TypingIndicator author={typingAuthor} />
          <Composer
            ticketId={ticketId}
            closed={ticket?.status === 'closed'}
            disabled={status !== 'ready'}
            send={thread.send}
            onReopen={reopen}
          />
        </>
      )}
    </section>
  )
}
