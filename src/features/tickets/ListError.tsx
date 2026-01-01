import { CircleAlert } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function ListError({ onRetry }: { onRetry: () => void }) {
  return (
    <div data-testid="list-error" role="alert" className="flex flex-col items-center gap-3 px-6 py-16 text-center">
      <CircleAlert className="size-6 text-destructive" aria-hidden="true" />
      <p className="text-sm font-medium text-foreground">Couldn’t load tickets</p>
      <Button variant="outline" data-testid="retry-button" onClick={onRetry}>
        Retry
      </Button>
    </div>
  )
}
