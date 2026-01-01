<script setup lang="ts">
import { computed } from 'vue'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import AgentAvatar from '@/features/tickets/AgentAvatar.vue'
import { useDirectory } from '@/features/tickets/directory'

const directory = useDirectory()
const name = computed(() => directory.me?.name ?? 'Agent')
// Includes the visible initials so the accessible name matches what is on screen.
const label = computed(() => (directory.me ? `${directory.me.initials} ${name.value} account menu` : 'Account menu'))
</script>

<template>
  <DropdownMenu>
    <DropdownMenuTrigger as-child>
      <Button variant="ghost" size="icon" data-testid="agent-menu" :aria-label="label">
        <AgentAvatar :agent="directory.me" size="md" aria-hidden="true" />
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end">
      <DropdownMenuLabel>Signed in as</DropdownMenuLabel>
      <DropdownMenuItem disabled data-testid="agent-menu-name">{{ name }}</DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
</template>
