import { Badge } from '@/components/ui/badge'
import { STATUS_LABEL, type TicketStatus } from '@/lib/types'

const CLASSES: Record<TicketStatus, string> = {
  open: 'bg-status-open-bg text-status-open-fg',
  pending: 'bg-status-pending-bg text-status-pending-fg',
  resolved: 'bg-status-resolved-bg text-status-resolved-fg',
  closed: 'bg-status-closed-bg text-status-closed-fg',
}

export function StatusBadge({ status }: { status: TicketStatus }) {
  return (
    <Badge data-testid="status-badge" data-status={status} className={CLASSES[status]}>
      {STATUS_LABEL[status]}
    </Badge>
  )
}
