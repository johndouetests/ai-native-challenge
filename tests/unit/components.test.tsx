import { fireEvent, render, screen } from '@testing-library/react'
import type { ComponentProps } from 'react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import { TooltipProvider } from '@/components/ui/tooltip'
import { EmptyState } from '@/features/tickets/EmptyState'
import { TicketRow, type TicketRowProps } from '@/features/tickets/TicketRow'
import { Composer } from '@/features/thread/Composer'
import { getDraft, setDraft } from '@/features/thread/drafts'
import { ticket } from './factories'

function renderRow(props: TicketRowProps) {
  return render(
    <MemoryRouter initialEntries={['/tickets']}>
      <TooltipProvider>
        <TicketRow {...props} />
      </TooltipProvider>
    </MemoryRouter>,
  )
}

describe('TicketRow', () => {
  it('shows key, subject, status and priority as text', () => {
    renderRow({ ticket: ticket({ unread: true }), selected: false, search: '' })
    expect(screen.getByTestId('ticket-key').textContent).toBe('DSK-1042')
    expect(screen.getByTestId('ticket-subject').textContent?.trim()).toBe('Invoice shows the wrong billing address')
    expect(screen.getByTestId('status-badge').textContent?.trim()).toBe('Open')
    expect(screen.getByTestId('priority-indicator').textContent).toContain('High')
    expect(screen.getByTestId('unread-dot')).toBeTruthy()
  })

  it('renders a dashed avatar for unassigned tickets and marks the selected row', () => {
    renderRow({ ticket: ticket({ assigneeId: null }), selected: true, search: '?status=open' })
    expect(screen.getByRole('img', { name: 'Unassigned' })).toBeTruthy()
    const row = screen.getByTestId('ticket-row')
    expect(row.getAttribute('aria-current')).toBe('page')
    expect(row.getAttribute('href')).toBe('/tickets/t_1042?status=open')
    expect(screen.queryByTestId('unread-dot')).toBeNull()
  })
})

describe('EmptyState', () => {
  it('offers Clear filters only when filters are active', () => {
    const onClear = vi.fn()
    const { rerender } = render(<EmptyState filtered onClear={onClear} />)
    expect(screen.getByText('No tickets match your filters')).toBeTruthy()
    fireEvent.click(screen.getByTestId('clear-filters'))
    expect(onClear).toHaveBeenCalledTimes(1)
    rerender(<EmptyState filtered={false} onClear={onClear} />)
    expect(screen.getByText('Inbox is empty')).toBeTruthy()
    expect(screen.queryByTestId('clear-filters')).toBeNull()
  })
})

describe('Composer', () => {
  let nextTicket = 0

  function renderComposer(props: Partial<ComponentProps<typeof Composer>> = {}) {
    // Drafts live in a module-level store: every test gets its own ticket id.
    const ticketId = `t_composer_${nextTicket++}`
    const send = vi.fn().mockResolvedValue(true)
    render(<Composer ticketId={ticketId} closed={false} send={send} onReopen={() => undefined} {...props} />)
    return { send, input: screen.getByTestId('composer-input') as HTMLTextAreaElement }
  }

  it('sends on Enter but not on Shift+Enter', () => {
    const { send, input } = renderComposer()
    fireEvent.change(input, { target: { value: 'Hello' } })
    fireEvent.keyDown(input, { key: 'Enter', shiftKey: true })
    expect(send).not.toHaveBeenCalled()
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(send).toHaveBeenCalledWith('Hello')
  })

  it('disables Send for whitespace-only text', () => {
    const { input } = renderComposer()
    fireEvent.change(input, { target: { value: '   ' } })
    expect((screen.getByTestId('send-button') as HTMLButtonElement).disabled).toBe(true)
  })

  it('shows the closed notice instead of accepting replies', () => {
    renderComposer({ closed: true })
    expect(screen.getByTestId('ticket-closed-notice').textContent).toContain('This ticket is closed')
    expect((screen.getByTestId('composer-input') as HTMLTextAreaElement).disabled).toBe(true)
  })

  it('shows the character counter from 3800 characters', () => {
    const { input } = renderComposer()
    fireEvent.change(input, { target: { value: 'a'.repeat(3799) } })
    expect(screen.queryByTestId('char-counter')).toBeNull()
    fireEvent.change(input, { target: { value: 'a'.repeat(3800) } })
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
