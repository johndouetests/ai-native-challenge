import { AgentAvatar } from './AgentAvatar'
import { findAgent, useDirectory } from './directory'

export function AssigneeAvatar({ assigneeId }: { assigneeId: string | null }) {
  const agent = findAgent(useDirectory(), assigneeId)
  const label = assigneeId === null ? 'Unassigned' : `Assigned to ${agent?.name ?? assigneeId}`
  return (
    <span
      data-testid="assignee-avatar"
      data-assignee={assigneeId ?? 'unassigned'}
      role="img"
      aria-label={label}
      title={label}
      className="flex shrink-0"
    >
      <AgentAvatar agent={agent} unassigned={assigneeId === null} aria-hidden="true" />
    </span>
  )
}
