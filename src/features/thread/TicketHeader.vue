<script setup lang="ts">
import { computed, nextTick, ref } from 'vue'
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { formatFull } from '@/lib/time'
import {
  PRIORITIES,
  PRIORITY_LABEL,
  STATUSES,
  STATUS_LABEL,
  type Ticket,
  type TicketPriority,
  type TicketStatus,
} from '@/lib/types'
import { useDirectory } from '@/features/tickets/directory'
import type { TicketChange } from './useTicketThread'

const props = defineProps<{
  ticket: Ticket
  updating: boolean
  update: (change: TicketChange, successMessage?: string) => Promise<boolean>
}>()

const directory = useDirectory()
const dialogOpen = ref(false)
const closing = ref(false)
const closeButton = ref<InstanceType<typeof Button> | null>(null)

const created = computed(() =>
  new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(
    new Date(props.ticket.createdAt),
  ),
)

function setStatus(value: unknown) {
  if (value !== props.ticket.status) void props.update({ status: value as TicketStatus })
}
function setPriority(value: unknown) {
  if (value !== props.ticket.priority) void props.update({ priority: value as TicketPriority })
}
function setAssignee(value: unknown) {
  const assigneeId = value === 'unassigned' ? null : String(value)
  if (assigneeId !== props.ticket.assigneeId) void props.update({ assigneeId })
}

function onOpenChange(open: boolean) {
  if (!open && closing.value) return
  dialogOpen.value = open
}

async function confirmClose() {
  closing.value = true
  const ok = await props.update({ status: 'closed' }, 'Ticket closed')
  closing.value = false
  if (ok) dialogOpen.value = false
}

function onCloseAutoFocus(event: Event) {
  event.preventDefault()
  void nextTick(() => {
    const target =
      (closeButton.value?.$el as HTMLElement | undefined) ?? document.getElementById('reopen-button') ?? undefined
    target?.focus()
  })
}
</script>

<template>
  <header data-testid="ticket-header" class="shrink-0 space-y-3 border-b border-border bg-card px-4 py-3">
    <div class="flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
      <span data-testid="detail-key" class="font-mono">{{ ticket.key }}</span>
      <span aria-hidden="true">·</span>
      <span>
        Created
        <time data-testid="detail-created" :datetime="ticket.createdAt" :title="formatFull(ticket.createdAt)">
          {{ created }}
        </time>
      </span>
    </div>
    <h2 data-testid="detail-subject" class="line-clamp-2 break-words text-lg font-semibold text-foreground">
      {{ ticket.subject }}
    </h2>
    <p class="flex min-w-0 gap-1 text-xs text-muted-foreground">
      <span data-testid="detail-requester" class="truncate font-medium text-foreground">{{ ticket.requester.name }}</span>
      <span aria-hidden="true">·</span>
      <span data-testid="detail-email" class="truncate">{{ ticket.requester.email }}</span>
    </p>
    <div class="flex flex-wrap items-center gap-2">
      <Select :model-value="ticket.status" :disabled="updating" @update:model-value="setStatus">
        <SelectTrigger data-testid="select-status" aria-label="Status" class="w-[8.5rem]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem
            v-for="status in STATUSES"
            :key="status"
            :value="status"
            :data-testid="`select-status-option-${status}`"
          >
            {{ STATUS_LABEL[status] }}
          </SelectItem>
        </SelectContent>
      </Select>
      <Select :model-value="ticket.priority" :disabled="updating" @update:model-value="setPriority">
        <SelectTrigger data-testid="select-priority" aria-label="Priority" class="w-[8.5rem]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem
            v-for="priority in PRIORITIES"
            :key="priority"
            :value="priority"
            :data-testid="`select-priority-option-${priority}`"
          >
            {{ PRIORITY_LABEL[priority] }}
          </SelectItem>
        </SelectContent>
      </Select>
      <Select :model-value="ticket.assigneeId ?? 'unassigned'" :disabled="updating" @update:model-value="setAssignee">
        <SelectTrigger data-testid="select-assignee" aria-label="Assignee" class="w-[11rem] max-w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="unassigned" data-testid="select-assignee-option-unassigned">Unassigned</SelectItem>
          <SelectItem
            v-for="agent in directory.agents"
            :key="agent.id"
            :value="agent.id"
            :data-testid="`select-assignee-option-${agent.id}`"
          >
            {{ agent.name }}
          </SelectItem>
        </SelectContent>
      </Select>
      <Button
        v-if="ticket.status !== 'closed'"
        ref="closeButton"
        variant="outline"
        data-testid="close-ticket-button"
        class="sm:ml-auto"
        :disabled="updating && !dialogOpen"
        @click="dialogOpen = true"
      >
        Close ticket
      </Button>
    </div>
    <AlertDialog :open="dialogOpen" @update:open="onOpenChange">
      <AlertDialogContent
        data-testid="close-dialog"
        @escape-key-down="(e: KeyboardEvent) => closing && e.preventDefault()"
        @overlay-click="onOpenChange(false)"
        @close-auto-focus="onCloseAutoFocus"
      >
        <div class="space-y-2">
          <AlertDialogTitle class="text-lg font-semibold">Close this ticket?</AlertDialogTitle>
          <AlertDialogDescription class="text-sm text-muted-foreground">
            The conversation becomes read-only until the ticket is reopened.
          </AlertDialogDescription>
        </div>
        <div class="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <AlertDialogCancel as-child>
            <Button variant="outline" data-testid="close-dialog-cancel" :disabled="closing">Cancel</Button>
          </AlertDialogCancel>
          <Button variant="destructive" data-testid="close-dialog-confirm" :disabled="closing" @click="confirmClose">
            Close ticket
          </Button>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  </header>
</template>
