import { useRef, useState } from 'react'
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { formatFull } from '@/lib/time'
import {
  PRIORITIES,
  PRIORITY_LABEL,
  STATUSES,
  STATUS_LABEL,
  type Ticket,
  type TicketPriority,
  type TicketStatus,
} from '@/lib/types'
import { useDirectory } from '@/features/tickets/directory'
import type { TicketChange } from './useTicketThread'

export interface TicketHeaderProps {
  ticket: Ticket
  updating: boolean
  update: (change: TicketChange, successMessage?: string) => Promise<boolean>
}

const createdFormat = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
})

export function TicketHeader({ ticket, updating, update }: TicketHeaderProps) {
  const { agents } = useDirectory()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [closing, setClosing] = useState(false)
  const closeButton = useRef<HTMLButtonElement>(null)

  function setStatus(value: string) {
    if (value !== ticket.status) void update({ status: value as TicketStatus })
  }
  function setPriority(value: string) {
    if (value !== ticket.priority) void update({ priority: value as TicketPriority })
  }
  function setAssignee(value: string) {
    const assigneeId = value === 'unassigned' ? null : value
    if (assigneeId !== ticket.assigneeId) void update({ assigneeId })
  }

  // The dialog stays open while the close request runs (FR-D-03).
  function onOpenChange(open: boolean) {
    if (!open && closing) return
    setDialogOpen(open)
  }

  async function confirmClose() {
    setClosing(true)
    const ok = await update({ status: 'closed' }, 'Ticket closed')
    setClosing(false)
    if (ok) setDialogOpen(false)
  }

  // Focus goes back to "Close ticket", or to "Reopen" once the ticket is closed.
  function onCloseAutoFocus(event: Event) {
    event.preventDefault()
    const target = closeButton.current ?? document.getElementById('reopen-button')
    target?.focus()
  }

  return (
    <header data-testid="ticket-header" className="shrink-0 space-y-3 border-b border-border bg-card px-4 py-3">
      <div className="flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
        <span data-testid="detail-key" className="font-mono">
          {ticket.key}
        </span>
        <span aria-hidden="true">·</span>
        <span>
          Created{' '}
          <time data-testid="detail-created" dateTime={ticket.createdAt} title={formatFull(ticket.createdAt)}>
            {createdFormat.format(new Date(ticket.createdAt))}
          </time>
        </span>
      </div>
      <h2 data-testid="detail-subject" className="line-clamp-2 break-words text-lg font-semibold text-foreground">
        {ticket.subject}
      </h2>
      <p className="flex min-w-0 gap-1 text-xs text-muted-foreground">
        <span data-testid="detail-requester" className="truncate font-medium text-foreground">
          {ticket.requester.name}
        </span>
        <span aria-hidden="true">·</span>
        <span data-testid="detail-email" className="truncate">
          {ticket.requester.email}
        </span>
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <Select value={ticket.status} disabled={updating} onValueChange={setStatus}>
          <SelectTrigger data-testid="select-status" aria-label="Status" className="w-[8.5rem]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUSES.map((status) => (
              <SelectItem key={status} value={status} data-testid={`select-status-option-${status}`}>
                {STATUS_LABEL[status]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={ticket.priority} disabled={updating} onValueChange={setPriority}>
          <SelectTrigger data-testid="select-priority" aria-label="Priority" className="w-[8.5rem]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PRIORITIES.map((priority) => (
              <SelectItem key={priority} value={priority} data-testid={`select-priority-option-${priority}`}>
                {PRIORITY_LABEL[priority]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={ticket.assigneeId ?? 'unassigned'} disabled={updating} onValueChange={setAssignee}>
          <SelectTrigger data-testid="select-assignee" aria-label="Assignee" className="w-[11rem] max-w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="unassigned" data-testid="select-assignee-option-unassigned">
              Unassigned
            </SelectItem>
            {agents.map((agent) => (
              <SelectItem key={agent.id} value={agent.id} data-testid={`select-assignee-option-${agent.id}`}>
                {agent.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {ticket.status !== 'closed' && (
          <Button
            ref={closeButton}
            variant="outline"
            data-testid="close-ticket-button"
            className="sm:ml-auto"
            disabled={updating && !dialogOpen}
            onClick={() => setDialogOpen(true)}
          >
            Close ticket
          </Button>
        )}
      </div>
      <AlertDialog open={dialogOpen} onOpenChange={onOpenChange}>
        <AlertDialogContent
          data-testid="close-dialog"
          onEscapeKeyDown={(e) => closing && e.preventDefault()}
          onOverlayClick={() => onOpenChange(false)}
          onCloseAutoFocus={onCloseAutoFocus}
        >
          <div className="space-y-2">
            <AlertDialogTitle className="text-lg font-semibold">Close this ticket?</AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-muted-foreground">
              The conversation becomes read-only until the ticket is reopened.
            </AlertDialogDescription>
          </div>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <AlertDialogCancel asChild>
              <Button variant="outline" data-testid="close-dialog-cancel" disabled={closing}>
                Cancel
              </Button>
            </AlertDialogCancel>
            <Button variant="destructive" data-testid="close-dialog-confirm" disabled={closing} onClick={confirmClose}>
              Close ticket
            </Button>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </header>
  )
}
