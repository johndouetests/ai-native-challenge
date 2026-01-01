import { Check, CircleAlert, Clock3 } from 'lucide-react'
import { memo } from 'react'
import { formatClock, formatFull } from '@/lib/time'
import type { ThreadMessage } from '@/lib/types'
import { cn } from '@/lib/utils'
import { AgentAvatar } from '@/features/tickets/AgentAvatar'
import { findAgent, useDirectory } from '@/features/tickets/directory'

export interface MessageBubbleProps {
  message: ThreadMessage
  onRetry: (clientMessageId: string) => void
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .map((part) => part.charAt(0))
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

function MessageTime({ iso, className }: { iso: string; className?: string }) {
  return (
    <time data-testid="message-time" className={className} dateTime={iso} title={formatFull(iso)}>
      {formatClock(iso)}
    </time>
  )
}

function DeliveryStatus({ message, onRetry }: MessageBubbleProps) {
  const delivery = message.delivery ?? 'sent'
  if (delivery === 'sending') {
    return (
      <span data-testid="delivery-status" data-status="sending" role="img" aria-label="Sending" className="flex shrink-0">
        <Clock3 className="size-3.5" aria-hidden="true" />
      </span>
    )
  }
  if (delivery === 'sent') {
    return (
      <span data-testid="delivery-status" data-status="sent" role="img" aria-label="Sent" className="flex shrink-0">
        <Check className="size-3.5" aria-hidden="true" />
      </span>
    )
  }
  return (
    <>
      <span data-testid="delivery-status" data-status="failed" className="flex shrink-0 items-center gap-1 text-destructive">
        <CircleAlert className="size-3.5" aria-hidden="true" />
        Failed
      </span>
      <button
        type="button"
        data-testid="message-retry"
        className="shrink-0 rounded px-1 font-medium text-primary underline-offset-2 hover:underline focus-ring"
        onClick={() => onRetry(message.clientMessageId as string)}
      >
        Retry
      </button>
    </>
  )
}

function MessageBubbleView({ message, onRetry }: MessageBubbleProps) {
  const directory = useDirectory()
  if (message.type === 'system') {
    return (
      <div
        data-testid="message-bubble"
        data-type="system"
        data-message-id={message.id}
        className="flex justify-center px-2 py-1"
      >
        <p className="max-w-full break-words text-center text-xs text-muted-foreground">
          <span data-testid="message-body">{message.body}</span> · <MessageTime iso={message.createdAt} />
        </p>
      </div>
    )
  }
  const isAgent = message.type === 'agent'
  return (
    <div
      data-testid="message-bubble"
      data-type={message.type}
      data-message-id={message.id}
      data-client-message-id={message.clientMessageId ?? undefined}
      data-status={isAgent ? (message.delivery ?? 'sent') : undefined}
      className={cn('flex items-end gap-2', isAgent && 'flex-row-reverse')}
    >
      {isAgent ? (
        <AgentAvatar agent={findAgent(directory, message.authorId)} size="sm" aria-hidden="true" />
      ) : (
        <span
          aria-hidden="true"
          className="flex size-7 shrink-0 items-center justify-center rounded-full bg-muted text-[11px] font-semibold text-muted-foreground"
        >
          {initials(message.authorName)}
        </span>
      )}
      <div
        className={cn(
          'flex min-w-0 max-w-[75%] flex-col max-[479px]:max-w-[88%]',
          isAgent ? 'items-end' : 'items-start',
        )}
      >
        <div
          className={cn(
            'max-w-full rounded-xl px-3 py-2',
            isAgent
              ? 'bg-bubble-agent text-bubble-agent-foreground'
              : 'bg-bubble-customer text-bubble-customer-foreground',
          )}
        >
          <p data-testid="message-body" className="whitespace-pre-wrap break-words">
            {message.body}
          </p>
        </div>
        <div className="mt-1 flex max-w-full items-center gap-1.5 text-xs text-muted-foreground">
          <span className="truncate">{message.authorName}</span>
          <span aria-hidden="true">·</span>
          <MessageTime iso={message.createdAt} className="shrink-0" />
          {isAgent && <DeliveryStatus message={message} onRetry={onRetry} />}
        </div>
      </div>
    </div>
  )
}

/** A new message in a long thread renders only its own bubble (FR-X-08). */
export const MessageBubble = memo(MessageBubbleView)
