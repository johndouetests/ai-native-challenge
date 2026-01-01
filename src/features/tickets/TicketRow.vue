<script setup lang="ts">
import { ref } from 'vue'
import type { LocationQuery } from 'vue-router'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import type { TicketSummary } from '@/lib/types'
import { cn } from '@/lib/utils'
import AssigneeAvatar from './AssigneeAvatar.vue'
import PriorityIndicator from './PriorityIndicator.vue'
import RelativeTime from './RelativeTime.vue'
import StatusBadge from './StatusBadge.vue'

defineProps<{
  ticket: TicketSummary
  selected: boolean
  query: LocationQuery
}>()

const hovered = ref(false)
const focused = ref(false)
</script>

<template>
  <RouterLink
    :to="{ name: 'ticket', params: { id: ticket.id }, query }"
    data-testid="ticket-row"
    :data-ticket-id="ticket.id"
    :data-selected="selected ? 'true' : 'false'"
    :aria-current="selected ? 'page' : undefined"
    :class="
      cn(
        'flex items-center gap-2 border-b border-l-2 border-b-border px-4 py-2 text-foreground hover:bg-muted focus-visible:[outline-offset:-2px]',
        selected ? 'border-l-primary bg-accent hover:bg-accent' : 'border-l-transparent',
      )
    "
    @focus="focused = true"
    @blur="focused = false"
  >
    <span class="flex w-2 shrink-0 justify-center self-start pt-1.5">
      <span v-if="ticket.unread" data-testid="unread-dot" class="size-2 rounded-full bg-primary">
        <span class="sr-only">Unread</span>
      </span>
    </span>
    <span class="flex flex-1 flex-col gap-1">
      <span class="flex min-w-0 items-center gap-2">
        <span data-testid="ticket-key" class="shrink-0 font-mono text-xs text-muted-foreground">{{ ticket.key }}</span>
        <Tooltip :open="hovered || focused" @update:open="(v: boolean) => (hovered = v)">
          <TooltipTrigger as-child>
            <span data-testid="ticket-subject" class="flex-1 whitespace-nowrap text-sm font-semibold">
              {{ ticket.subject }}
            </span>
          </TooltipTrigger>
          <TooltipContent data-testid="subject-tooltip" side="bottom" align="start">
            {{ ticket.subject }}
          </TooltipContent>
        </Tooltip>
        <RelativeTime data-testid="ticket-time" :iso="ticket.updatedAt" class="shrink-0 text-xs text-muted-foreground" />
      </span>
      <span class="flex min-w-0 items-center gap-2">
        <span data-testid="ticket-requester" class="min-w-0 flex-1 truncate text-xs text-muted-foreground">
          {{ ticket.requester.name }}
        </span>
        <StatusBadge :status="ticket.status" />
        <PriorityIndicator :priority="ticket.priority" />
      </span>
    </span>
    <AssigneeAvatar :assignee-id="ticket.assigneeId" />
  </RouterLink>
</template>
