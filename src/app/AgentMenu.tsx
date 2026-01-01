import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { AgentAvatar } from '@/features/tickets/AgentAvatar'
import { useDirectory } from '@/features/tickets/directory'

export function AgentMenu() {
  const { me } = useDirectory()
  const name = me?.name ?? 'Agent'
  // Includes the visible initials so the accessible name matches what is on screen.
  const label = me ? `${me.initials} ${name} account menu` : 'Account menu'
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" data-testid="agent-menu" aria-label={label}>
          <AgentAvatar agent={me} size="md" aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Signed in as</DropdownMenuLabel>
        <DropdownMenuItem disabled data-testid="agent-menu-name">
          {name}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
