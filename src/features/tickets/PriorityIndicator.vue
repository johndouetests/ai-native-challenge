<script setup lang="ts">
import { PRIORITY_LABEL, type TicketPriority } from '@/lib/types'

defineProps<{ priority: TicketPriority }>()

const DOTS: Record<TicketPriority, string> = {
  low: 'bg-priority-low',
  normal: 'bg-priority-normal',
  high: 'bg-priority-high',
  urgent: 'bg-priority-urgent',
}
</script>

<template>
  <span
    data-testid="priority-indicator"
    :data-priority="priority"
    class="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap text-xs text-foreground"
  >
    <span aria-hidden="true" :class="['size-2 shrink-0 rounded-full', DOTS[priority]]" />
    <span><span class="sr-only">Priority: </span>{{ PRIORITY_LABEL[priority] }}</span>
  </span>
</template>
