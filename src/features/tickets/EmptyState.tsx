import { Inbox, SearchX } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function EmptyState({ filtered, onClear }: { filtered: boolean; onClear: () => void }) {
  return (
    <div
      data-testid="empty-state"
      data-variant={filtered ? 'filtered' : 'inbox'}
      className="flex flex-col items-center gap-3 px-6 py-16 text-center"
    >
      <span className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
        {filtered ? <SearchX className="size-6" aria-hidden="true" /> : <Inbox className="size-6" aria-hidden="true" />}
      </span>
      {filtered ? (
        <>
          <p className="text-sm font-medium text-foreground">No tickets match your filters</p>
          <Button variant="outline" data-testid="clear-filters" onClick={onClear}>
            Clear filters
          </Button>
        </>
      ) : (
        <p className="text-sm font-medium text-foreground">Inbox is empty</p>
      )}
    </div>
  )
}
