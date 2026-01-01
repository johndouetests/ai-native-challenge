import { fireEvent, render, screen } from '@testing-library/vue'
import { TooltipProvider } from 'reka-ui'
import { describe, expect, it, vi } from 'vitest'
import { defineComponent, h } from 'vue'
import { createMemoryHistory, createRouter } from 'vue-router'
import EmptyState from '@/features/tickets/EmptyState.vue'
import TicketRow from '@/features/tickets/TicketRow.vue'
import Composer from '@/features/thread/Composer.vue'
import { getDraft, setDraft } from '@/features/thread/drafts'
import { ticket } from './factories'

function renderRow(props: Record<string, unknown>) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/tickets', name: 'tickets', component: { render: () => null } },
      { path: '/tickets/:id', name: 'ticket', component: { render: () => null } },
    ],
  })
  const Wrapper = defineComponent(() => () => h(TooltipProvider, null, () => h(TicketRow, props as never)))
  return render(Wrapper, { global: { plugins: [router] } })
}

describe('TicketRow', () => {
  it('shows key, subject, status and priority as text', () => {
    renderRow({ ticket: ticket({ unread: true }), selected: false, query: {} })
    expect(screen.getByTestId('ticket-key').textContent).toBe('DSK-1042')
    expect(screen.getByTestId('ticket-subject').textContent?.trim()).toBe('Invoice shows the wrong billing address')
    expect(screen.getByTestId('status-badge').textContent?.trim()).toBe('Open')
    expect(screen.getByTestId('priority-indicator').textContent).toContain('High')
    expect(screen.getByTestId('unread-dot')).toBeTruthy()
  })

  it('renders a dashed avatar for unassigned tickets and marks the selected row', () => {
    renderRow({ ticket: ticket({ assigneeId: null }), selected: true, query: {} })
    expect(screen.getByRole('img', { name: 'Unassigned' })).toBeTruthy()
    expect(screen.getByTestId('ticket-row').getAttribute('aria-current')).toBe('page')
    expect(screen.queryByTestId('unread-dot')).toBeNull()
  })
})

describe('EmptyState', () => {
  it('offers Clear filters only when filters are active', async () => {
    const { emitted, rerender } = render(EmptyState, { props: { filtered: true } })
    expect(screen.getByText('No tickets match your filters')).toBeTruthy()
    await fireEvent.click(screen.getByTestId('clear-filters'))
    expect(emitted().clear).toHaveLength(1)
    await rerender({ filtered: false })
    expect(screen.getByText('Inbox is empty')).toBeTruthy()
    expect(screen.queryByTestId('clear-filters')).toBeNull()
  })
})

describe('Composer', () => {
  function renderComposer(send = vi.fn().mockResolvedValue(true), props: Record<string, unknown> = {}) {
    render(Composer, { props: { ticketId: 't_1', closed: false, send, ...props } })
    return { send, input: screen.getByTestId('composer-input') as HTMLTextAreaElement }
  }

  it('sends on Enter but not on Shift+Enter', async () => {
    const { send, input } = renderComposer()
    await fireEvent.update(input, 'Hello')
    await fireEvent.keyDown(input, { key: 'Enter', shiftKey: true })
    expect(send).not.toHaveBeenCalled()
    await fireEvent.keyDown(input, { key: 'Enter' })
    expect(send).toHaveBeenCalledWith('Hello')
  })

  it('disables Send for whitespace-only text', async () => {
    const { input } = renderComposer()
    await fireEvent.update(input, '   ')
    expect((screen.getByTestId('send-button') as HTMLButtonElement).disabled).toBe(true)
  })

  it('shows the closed notice instead of accepting replies', () => {
    renderComposer(undefined, { closed: true })
    expect(screen.getByTestId('ticket-closed-notice').textContent).toContain('This ticket is closed')
    expect((screen.getByTestId('composer-input') as HTMLTextAreaElement).disabled).toBe(true)
  })

  it('shows the character counter from 3800 characters', async () => {
    const { input } = renderComposer()
    await fireEvent.update(input, 'a'.repeat(3799))
    expect(screen.queryByTestId('char-counter')).toBeNull()
    await fireEvent.update(input, 'a'.repeat(3800))
    expect(screen.getByTestId('char-counter').textContent?.trim()).toBe('3800 / 4000')
  })

  it('keeps drafts per ticket', () => {
    setDraft('t_1', 'first')
    setDraft('t_2', 'second')
    expect(getDraft('t_1')).toBe('first')
    expect(getDraft('t_2')).toBe('second')
    setDraft('t_1', '')
    expect(getDraft('t_1')).toBe('')
  })
})
