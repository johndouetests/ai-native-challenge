import { Inbox } from 'lucide-react'
import { Link } from 'react-router'
import { AgentMenu } from './AgentMenu'
import { ConnectionIndicator } from './ConnectionIndicator'
import { ThemeToggle } from './ThemeToggle'

export function AppHeader() {
  return (
    <header
      data-testid="app-header"
      className="sticky top-0 z-[var(--z-header)] flex h-14 shrink-0 items-center gap-2 border-b border-border bg-card px-3 sm:px-4"
    >
      <Link
        to="/tickets"
        data-testid="logo"
        className="flex h-10 min-w-0 items-center gap-2 rounded-lg font-semibold text-foreground focus-ring"
        aria-label="Deskline inbox"
      >
        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Inbox className="size-4" aria-hidden="true" />
        </span>
        <span className="truncate text-base max-[379px]:sr-only">Deskline</span>
      </Link>
      <div className="ml-auto flex shrink-0 items-center gap-1 sm:gap-2">
        <ConnectionIndicator />
        <ThemeToggle />
        <AgentMenu />
      </div>
    </header>
  )
}
