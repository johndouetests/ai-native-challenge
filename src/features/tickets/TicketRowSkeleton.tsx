import { Skeleton } from '@/components/ui/skeleton'

export function TicketRowSkeleton() {
  return (
    <div
      data-testid="list-skeleton-row"
      className="flex min-h-[var(--row-min-height)] items-center gap-2 border-b border-l-2 border-b-border border-l-transparent px-4 py-3"
    >
      <span className="w-2 shrink-0" />
      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="flex h-5 items-center gap-2">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-3.5 flex-1" />
          <Skeleton className="h-3 w-10" />
        </span>
        <span className="flex h-5 items-center gap-2">
          <Skeleton className="h-3 w-24" />
          <span className="flex-1" />
          <Skeleton className="h-5 w-14 rounded-full" />
          <Skeleton className="h-3 w-12" />
        </span>
      </span>
      <Skeleton className="size-8 shrink-0 rounded-full" />
    </div>
  )
}
