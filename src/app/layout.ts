import { createContext, useContext } from 'react'

/** True in the two-column layout (1024px and wider). */
export const WideLayoutContext = createContext(true)

export function useWideLayout(): boolean {
  return useContext(WideLayoutContext)
}
