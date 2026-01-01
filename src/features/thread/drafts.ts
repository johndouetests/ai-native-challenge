import { reactive } from 'vue'

/** Unsent reply text per ticket, kept in memory for the session. */
const drafts = reactive(new Map<string, string>())

export function getDraft(ticketId: string): string {
  return drafts.get(ticketId) ?? ''
}

export function setDraft(ticketId: string, text: string): void {
  if (text) drafts.set(ticketId, text)
  else drafts.delete(ticketId)
}

export function clearDraft(ticketId: string): void {
  drafts.delete(ticketId)
}
