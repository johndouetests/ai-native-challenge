import { MessagesSquare } from 'lucide-react'
import { useEffect } from 'react'

export function TicketPlaceholder() {
  useEffect(() => {
    document.title = 'Inbox — Deskline'
  }, [])
  return (
    <div data-testid="ticket-placeholder" className="flex h-full flex-col items-center justify-center gap-3 bg-background p-6">
      <MessagesSquare className="size-8 text-muted-foreground" aria-hidden="true" />
      <p className="text-sm text-muted-foreground">Select a ticket</p>
    </div>
  )
}
