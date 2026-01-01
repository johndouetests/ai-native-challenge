import { useCallback, useSyncExternalStore } from 'react'

/** Unsent reply text per ticket, kept in memory for the session. */
const drafts = new Map<string, string>()
const listeners = new Set<() => void>()

function notify() {
  for (const listener of [...listeners]) listener()
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function getDraft(ticketId: string): string {
  return drafts.get(ticketId) ?? ''
}

export function setDraft(ticketId: string, text: string): void {
  if (text) drafts.set(ticketId, text)
  else drafts.delete(ticketId)
  notify()
}

export function clearDraft(ticketId: string): void {
  drafts.delete(ticketId)
  notify()
}

/** The draft of one ticket and a setter bound to that ticket. */
export function useDraft(ticketId: string): [string, (text: string) => void] {
  const text = useSyncExternalStore(subscribe, () => getDraft(ticketId))
  const update = useCallback((next: string) => setDraft(ticketId, next), [ticketId])
  return [text, update]
}
