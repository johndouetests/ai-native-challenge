import { UserRound } from 'lucide-react'
import type { ComponentProps } from 'react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import type { Agent, AgentColor } from '@/lib/types'
import { cn } from '@/lib/utils'

const COLORS: Record<AgentColor, string> = {
  blue: 'bg-[var(--avatar-blue-bg)] text-[var(--avatar-blue-fg)]',
  violet: 'bg-[var(--avatar-violet-bg)] text-[var(--avatar-violet-fg)]',
  teal: 'bg-[var(--avatar-teal-bg)] text-[var(--avatar-teal-fg)]',
  amber: 'bg-[var(--avatar-amber-bg)] text-[var(--avatar-amber-fg)]',
  rose: 'bg-[var(--avatar-rose-bg)] text-[var(--avatar-rose-fg)]',
  emerald: 'bg-[var(--avatar-emerald-bg)] text-[var(--avatar-emerald-fg)]',
  indigo: 'bg-[var(--avatar-indigo-bg)] text-[var(--avatar-indigo-fg)]',
  orange: 'bg-[var(--avatar-orange-bg)] text-[var(--avatar-orange-fg)]',
}

interface AgentAvatarProps extends Omit<ComponentProps<'span'>, 'children'> {
  agent: Agent | null | undefined
  /** md = 32px (list, header), sm = 28px (messages) */
  size?: 'md' | 'sm'
  unassigned?: boolean
}

export function AgentAvatar({ agent, size = 'md', unassigned = false, className, ...props }: AgentAvatarProps) {
  const sizeClass = size === 'sm' ? 'size-7' : 'size-8'
  if (unassigned) {
    return (
      <span
        className={cn(
          'flex shrink-0 items-center justify-center rounded-full border border-dashed border-muted-foreground text-muted-foreground',
          sizeClass,
          className,
        )}
        {...props}
      >
        <UserRound className="size-4" aria-hidden="true" />
      </span>
    )
  }
  return (
    <Avatar className={cn(sizeClass, className)} {...props}>
      <AvatarFallback className={agent ? COLORS[agent.color] : 'bg-muted text-muted-foreground'}>
        {agent?.initials ?? ''}
      </AvatarFallback>
    </Avatar>
  )
}
