import { useSyncExternalStore } from 'react'

export const NOW_TICK_MS = 30_000

let now = Date.now()
let timer: ReturnType<typeof setInterval> | undefined
const listeners = new Set<() => void>()

function notify() {
  for (const listener of [...listeners]) listener()
}

/**
 * One shared clock for relative timestamps. The first subscriber starts a single 30 s interval,
 * the last one to unsubscribe stops it.
 */
function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  if (listeners.size === 1) {
    now = Date.now()
    timer = setInterval(() => {
      now = Date.now()
      notify()
    }, NOW_TICK_MS)
  }
  return () => {
    listeners.delete(listener)
    if (listeners.size === 0 && timer) {
      clearInterval(timer)
      timer = undefined
    }
  }
}

function getSnapshot(): number {
  return now
}

export function useNow(): number {
  return useSyncExternalStore(subscribe, getSnapshot)
}
