import { onScopeDispose, readonly } from 'vue'
import type { RealtimeEvent } from '@/lib/types'
import { realtime } from './realtimeClient'

/**
 * Access to the app-wide socket. Handlers registered here are removed automatically when the
 * calling component (or effect scope) is disposed, so navigation never stacks subscriptions.
 */
export function useRealtime() {
  return {
    state: readonly(realtime.state),
    onEvent(handler: (event: RealtimeEvent) => void) {
      const off = realtime.subscribe(handler)
      onScopeDispose(off)
      return off
    },
    onResync(handler: () => void) {
      const off = realtime.onResync(handler)
      onScopeDispose(off)
      return off
    },
  }
}
