import { useState } from 'react'
import { Link } from 'react-router'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import type { TicketSummary } from '@/lib/types'
import { cn } from '@/lib/utils'
import { AssigneeAvatar } from './AssigneeAvatar'
import { PriorityIndicator } from './PriorityIndicator'
import { RelativeTime } from './RelativeTime'
import { StatusBadge } from './StatusBadge'

export interface TicketRowProps {
  ticket: TicketSummary
  selected: boolean
  /** Current list query (`?status=…`), kept when opening the ticket. */
  search: string
}

export function TicketRow({ ticket, selected, search }: TicketRowProps) {
  const [hovered, setHovered] = useState(false)
  const [focused, setFocused] = useState(false)
  return (
    <Link
      to={{ pathname: `/tickets/${ticket.id}`, search }}
      data-testid="ticket-row"
      data-ticket-id={ticket.id}
      data-selected={selected ? 'true' : 'false'}
      aria-current={selected ? 'page' : undefined}
      className={cn(
        'flex items-center gap-2 border-b border-l-2 border-b-border px-4 py-2 text-foreground hover:bg-muted focus-visible:[outline-offset:-2px]',
        selected ? 'border-l-primary bg-accent hover:bg-accent' : 'border-l-transparent',
      )}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
    >
      <span className="flex w-2 shrink-0 justify-center self-start pt-1.5">
        {ticket.unread && (
          <span data-testid="unread-dot" className="size-2 rounded-full bg-primary">
            <span className="sr-only">Unread</span>
          </span>
        )}
      </span>
      <span className="flex flex-1 flex-col gap-1">
        <span className="flex min-w-0 items-center gap-2">
          <span data-testid="ticket-key" className="shrink-0 font-mono text-xs text-muted-foreground">
            {ticket.key}
          </span>
          <Tooltip open={hovered || focused} onOpenChange={setHovered}>
            <TooltipTrigger asChild>
              <span data-testid="ticket-subject" className="flex-1 whitespace-nowrap text-sm font-semibold">
                {ticket.subject}
              </span>
            </TooltipTrigger>
            <TooltipContent data-testid="subject-tooltip" side="bottom" align="start">
              {ticket.subject}
            </TooltipContent>
          </Tooltip>
          <RelativeTime data-testid="ticket-time" iso={ticket.updatedAt} className="shrink-0 text-xs text-muted-foreground" />
        </span>
        <span className="flex min-w-0 items-center gap-2">
          <span data-testid="ticket-requester" className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
            {ticket.requester.name}
          </span>
          <StatusBadge status={ticket.status} />
          <PriorityIndicator priority={ticket.priority} />
        </span>
      </span>
      <AssigneeAvatar assigneeId={ticket.assigneeId} />
    </Link>
  )
}
