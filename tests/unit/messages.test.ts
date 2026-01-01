import { describe, expect, it } from 'vitest'
import { mergeMessages } from '@/features/thread/messages'
import type { ThreadMessage } from '@/lib/types'
import { message } from './factories'

describe('mergeMessages', () => {
  it('replaces the optimistic bubble by clientMessageId', () => {
    const local: ThreadMessage = message({
      id: 'local-1',
      type: 'agent',
      clientMessageId: 'c-1',
      createdAt: '2026-03-09T10:00:00Z',
    })
    const merged = mergeMessages([message(), { ...local, delivery: 'sending' }], [
      message({ id: 'm_9002', type: 'agent', clientMessageId: 'c-1', createdAt: '2026-03-09T10:00:01Z' }),
    ])
    expect(merged.map((m) => m.id)).toEqual(['m_9001', 'm_9002'])
    expect(merged[1].delivery).toBeUndefined()
  })

  it('ignores messages that are already shown', () => {
    const current = [message(), message({ id: 'm_9002', createdAt: '2026-03-09T09:01:00Z' })]
    expect(mergeMessages(current, [message({ id: 'm_9002', createdAt: '2026-03-09T09:01:00Z' })])).toHaveLength(2)
  })

  it('orders by createdAt, then by id', () => {
    const at = '2026-03-09T09:00:00Z'
    const merged = mergeMessages([], [
      message({ id: 'm_10000', createdAt: at }),
      message({ id: 'm_9999', createdAt: at }),
      message({ id: 'm_9000', createdAt: '2026-03-09T08:00:00Z' }),
    ])
    expect(merged.map((m) => m.id)).toEqual(['m_9000', 'm_9999', 'm_10000'])
  })
})
