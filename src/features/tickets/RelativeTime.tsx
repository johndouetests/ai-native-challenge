import type { ComponentProps } from 'react'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { useNow } from '@/lib/now'
import { formatFull, formatRelative } from '@/lib/time'
import { cn } from '@/lib/utils'

export function RelativeTime({ iso, className, ...props }: { iso: string } & Omit<ComponentProps<'time'>, 'children'>) {
  const now = useNow()
  const full = formatFull(iso)
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <time {...props} dateTime={iso} aria-label={full} className={cn('whitespace-nowrap', className)}>
          {formatRelative(iso, now)}
        </time>
      </TooltipTrigger>
      <TooltipContent data-testid="time-tooltip">{full}</TooltipContent>
    </Tooltip>
  )
}
