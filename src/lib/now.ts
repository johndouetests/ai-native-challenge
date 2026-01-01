import { onScopeDispose, readonly, ref, type Ref } from 'vue'

export const NOW_TICK_MS = 30_000

const now = ref(Date.now())
let subscribers = 0
let timer: ReturnType<typeof setInterval> | undefined

/**
 * One shared clock for relative timestamps. The first subscriber starts a single 30 s interval,
 * the last one to unmount stops it.
 */
export function useNow(): Readonly<Ref<number>> {
  subscribers++
  if (subscribers === 1) {
    now.value = Date.now()
    timer = setInterval(() => {
      now.value = Date.now()
    }, NOW_TICK_MS)
  }
  onScopeDispose(() => {
    subscribers--
    if (subscribers === 0 && timer) {
      clearInterval(timer)
      timer = undefined
    }
  })
  return readonly(now)
}
