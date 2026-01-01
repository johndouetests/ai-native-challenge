import { PRIORITY_LABEL, type TicketPriority } from '@/lib/types'
import { cn } from '@/lib/utils'

const DOTS: Record<TicketPriority, string> = {
  low: 'bg-priority-low',
  normal: 'bg-priority-normal',
  high: 'bg-priority-high',
  urgent: 'bg-priority-urgent',
}

export function PriorityIndicator({ priority }: { priority: TicketPriority }) {
  return (
    <span
      data-testid="priority-indicator"
      data-priority={priority}
      className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap text-xs text-foreground"
    >
      <span aria-hidden="true" className={cn('size-2 shrink-0 rounded-full', DOTS[priority])} />
      <span>
        <span className="sr-only">Priority: </span>
        {PRIORITY_LABEL[priority]}
      </span>
    </span>
  )
}
