import { useCallback, useRef, useState, type RefObject } from 'react'

export type SetStateRef<T> = (next: T | ((prev: T) => T)) => void

/**
 * State that async code can also read synchronously: the ref always holds the latest value,
 * including updates made earlier in the same tick that React has not rendered yet.
 */
export function useStateRef<T>(initial: T): [T, SetStateRef<T>, RefObject<T>] {
  const [value, setValue] = useState(initial)
  const ref = useRef(initial)
  const set = useCallback<SetStateRef<T>>((next) => {
    const resolved = typeof next === 'function' ? (next as (prev: T) => T)(ref.current) : next
    ref.current = resolved
    setValue(resolved)
  }, [])
  return [value, set, ref]
}
