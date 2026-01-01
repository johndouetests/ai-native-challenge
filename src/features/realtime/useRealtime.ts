import { useEffect, useSyncExternalStore } from 'react'
import type { RealtimeEvent } from '@/lib/types'
import { realtime, type ConnectionState } from './realtimeClient'

export interface RealtimeHandlers {
  onEvent?: (event: RealtimeEvent) => void
  onResync?: () => void
}

/**
 * Access to the app-wide socket. Handlers are subscribed in effects and removed in their cleanup,
 * so navigation never stacks subscriptions. Pass stable (memoised) handlers.
 */
export function useRealtime({ onEvent, onResync }: RealtimeHandlers = {}): { state: ConnectionState } {
  const state = useSyncExternalStore(realtime.subscribeState, realtime.getState)

  useEffect(() => {
    if (!onEvent) return
    return realtime.subscribe(onEvent)
  }, [onEvent])

  useEffect(() => {
    if (!onResync) return
    return realtime.onResync(onResync)
  }, [onResync])

  return { state }
}
