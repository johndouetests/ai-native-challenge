import { LoaderCircle } from 'lucide-react'
import { useRealtime } from '@/features/realtime/useRealtime'
import { cn } from '@/lib/utils'

const LABELS = { live: 'Live', reconnecting: 'Reconnecting', offline: 'Offline' } as const

export function ConnectionIndicator() {
  const { state } = useRealtime()
  const label = LABELS[state]
  return (
    <div
      data-testid="connection-indicator"
      data-state={state}
      role="status"
      aria-label={`Connection: ${label}`}
      className="flex h-8 items-center gap-1.5 rounded-full border border-border px-2.5 text-xs font-medium text-foreground"
    >
      <span
        aria-hidden="true"
        className={cn(
          'size-2 shrink-0 rounded-full',
          state === 'live' && 'bg-connection-live',
          state === 'reconnecting' && 'bg-connection-reconnecting',
          state === 'offline' && 'bg-connection-offline',
        )}
      />
      {state === 'reconnecting' && (
        <LoaderCircle className="size-3.5 shrink-0 animate-spin text-muted-foreground" aria-hidden="true" />
      )}
      <span>{label}</span>
    </div>
  )
}
