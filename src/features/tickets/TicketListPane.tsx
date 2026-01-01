import { LoaderCircle } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useMatch } from 'react-router'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { EmptyState } from './EmptyState'
import { compareTickets, filtersToSearch, hasActiveFilters } from './filters'
import { useUnreadCount } from './inbox'
import { ListError } from './ListError'
import { TicketFilters } from './TicketFilters'
import { TicketRow } from './TicketRow'
import { TicketRowSkeleton } from './TicketRowSkeleton'
import { useFilters } from './useFilters'
import { useTicketList } from './useTicketList'

const SKELETON_ROWS = 8

export function TicketListPane({ wide, className }: { wide: boolean; className?: string }) {
  const [filters, setFilters] = useFilters()
  const { items, nextCursor, status, loadingMore, loadMoreFailed, reload, loadMore } = useTicketList(filters)
  const unreadCount = useUnreadCount()
  const ticketMatch = useMatch('/tickets/:id')
  const selectedId = wide ? (ticketMatch?.params.id ?? null) : null
  const search = filtersToSearch(filters)
  const scroller = useRef<HTMLDivElement>(null)
  const [query, setQuery] = useState(filters.q)
  const [syncedQ, setSyncedQ] = useState(filters.q)

  // Back/forward navigation changes the URL: reflect it in the search input.
  if (filters.q !== syncedQ) {
    setSyncedQ(filters.q)
    if (filters.q !== query) setQuery(filters.q)
  }

  // FR-L-05: a new query starts at the top of the list.
  useEffect(() => {
    if (scroller.current) scroller.current.scrollTop = 0
  }, [filters])

  const clearFilters = useCallback(
    () => setFilters({ status: [], priority: [], assignee: null, q: '', sort: filters.sort }),
    [filters.sort, setFilters],
  )

  return (
    <section
      aria-labelledby="inbox-title"
      data-testid="ticket-list-pane"
      className={cn('flex h-full min-h-0 flex-col bg-card', className)}
    >
      <div className="shrink-0 space-y-3 border-b border-border px-4 pb-3 pt-4">
        <h1 id="inbox-title" data-testid="inbox-title" className="text-lg font-semibold text-foreground">
          Inbox
          {unreadCount !== null && (
            <>
              {' · '}
              <span data-testid="unread-count">{unreadCount}</span> unread
            </>
          )}
        </h1>
        <TicketFilters filters={filters} search={query} onSearchChange={setQuery} onChange={setFilters} />
      </div>
      <div ref={scroller} data-testid="ticket-list" className="min-h-0 flex-1 overflow-y-auto">
        {status === 'loading' ? (
          <div aria-busy="true" aria-label="Loading tickets" role="status">
            {Array.from({ length: SKELETON_ROWS }, (_, n) => (
              <TicketRowSkeleton key={n} />
            ))}
          </div>
        ) : status === 'error' ? (
          <ListError onRetry={() => void reload()} />
        ) : items.length === 0 ? (
          <EmptyState filtered={hasActiveFilters(filters)} onClear={clearFilters} />
        ) : (
          <>
            <ul aria-label="Tickets">
              {[...items].sort((a, b) => compareTickets(a, b, filters.sort)).map((ticket) => (
                <li key={ticket.id} className="[contain-intrinsic-size:auto_72px] [content-visibility:auto]">
                  <TicketRow ticket={ticket} selected={ticket.id === selectedId} search={search} />
                </li>
              ))}
            </ul>
            {(nextCursor || loadMoreFailed) && (
              <div className="flex flex-col items-center gap-2 px-4 py-4">
                {loadMoreFailed && (
                  <p data-testid="load-more-error" role="alert" className="text-sm text-destructive">
                    Couldn’t load more tickets
                  </p>
                )}
                {nextCursor && (
                  <Button
                    variant="outline"
                    data-testid="load-more"
                    disabled={loadingMore}
                    aria-busy={loadingMore}
                    onClick={() => void loadMore()}
                  >
                    {loadingMore && (
                      <LoaderCircle data-testid="load-more-spinner" className="animate-spin" aria-hidden="true" />
                    )}
                    Load more
                  </Button>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </section>
  )
}
