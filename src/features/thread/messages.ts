import type { Message, ThreadMessage } from '@/lib/types'

function idNumber(id: string): number {
  return Number(id.replace(/\D/g, ''))
}

/** Server messages by createdAt, then id; local (not yet accepted) messages stay at the end. */
export function compareMessages(a: ThreadMessage, b: ThreadMessage): number {
  const aLocal = a.delivery === 'sending' || a.delivery === 'failed'
  const bLocal = b.delivery === 'sending' || b.delivery === 'failed'
  if (aLocal !== bLocal) return aLocal ? 1 : -1
  if (aLocal) return 0
  return Date.parse(a.createdAt) - Date.parse(b.createdAt) || idNumber(a.id) - idNumber(b.id)
}

/**
 * Merges incoming server messages into the thread. A message replaces an existing entry with the
 * same id or the same clientMessageId (the optimistic copy), so nothing is ever shown twice.
 */
export function mergeMessages(current: readonly ThreadMessage[], incoming: readonly Message[]): ThreadMessage[] {
  if (incoming.length === 0) return current as ThreadMessage[]
  const byId = new Set(incoming.map((m) => m.id))
  const byClientId = new Set(incoming.map((m) => m.clientMessageId).filter((v): v is string => v !== null))
  const kept = current.filter(
    (m) => !byId.has(m.id) && !(m.clientMessageId !== null && byClientId.has(m.clientMessageId)),
  )
  const unique = new Map<string, ThreadMessage>()
  for (const m of incoming) unique.set(m.id, { ...m })
  return [...kept, ...unique.values()].sort(compareMessages)
}

export function updateDelivery(
  current: readonly ThreadMessage[],
  clientMessageId: string,
  delivery: ThreadMessage['delivery'],
): ThreadMessage[] {
  return current.map((m) => (m.clientMessageId === clientMessageId && m.delivery ? { ...m, delivery } : m))
}
