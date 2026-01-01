import { Outlet, useMatch } from 'react-router'
import { useMediaQuery } from '@/lib/media'
import { TicketListPane } from '@/features/tickets/TicketListPane'
import { WideLayoutContext } from './layout'

export function InboxLayout() {
  const isWide = useMediaQuery('(min-width: 1024px)')
  const ticketOpen = useMatch('/tickets/:id') !== null
  return (
    <WideLayoutContext value={isWide}>
      <div className="flex h-full min-h-0">
        {(isWide || !ticketOpen) && (
          <TicketListPane
            wide={isWide}
            className="w-full min-w-0 lg:w-[var(--list-width)] lg:shrink-0 lg:border-r lg:border-border"
          />
        )}
        {(isWide || ticketOpen) && (
          <div className="h-full min-w-0 flex-1">
            <Outlet />
          </div>
        )}
      </div>
    </WideLayoutContext>
  )
}
