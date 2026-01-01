<script setup lang="ts">
import { CircleAlert, Clock3, Check } from 'lucide-vue-next'
import { computed } from 'vue'
import type { ThreadMessage } from '@/lib/types'
import { formatClock, formatFull } from '@/lib/time'
import AgentAvatar from '@/features/tickets/AgentAvatar.vue'
import { agentById } from '@/features/tickets/directory'

const props = defineProps<{ message: ThreadMessage }>()
defineEmits<{ retry: [clientMessageId: string] }>()

const delivery = computed(() => (props.message.type === 'agent' ? (props.message.delivery ?? 'sent') : undefined))
const author = computed(() => agentById(props.message.authorId))
const requesterInitials = computed(() =>
  props.message.authorName
    .split(/\s+/)
    .map((part) => part.charAt(0))
    .slice(0, 2)
    .join('')
    .toUpperCase(),
)
</script>

<template>
  <div
    v-if="message.type === 'system'"
    data-testid="message-bubble"
    data-type="system"
    :data-message-id="message.id"
    class="flex justify-center px-2 py-1"
  >
    <p class="max-w-full text-center text-xs text-muted-foreground break-words">
      <span data-testid="message-body">{{ message.body }}</span>
      ·
      <time data-testid="message-time" :datetime="message.createdAt" :title="formatFull(message.createdAt)">
        {{ formatClock(message.createdAt) }}
      </time>
    </p>
  </div>
  <div
    v-else
    data-testid="message-bubble"
    :data-type="message.type"
    :data-message-id="message.id"
    :data-client-message-id="message.clientMessageId ?? undefined"
    :data-status="delivery"
    :class="['flex items-end gap-2', message.type === 'agent' ? 'flex-row-reverse' : '']"
  >
    <AgentAvatar v-if="message.type === 'agent'" :agent="author" size="sm" aria-hidden="true" />
    <span
      v-else
      aria-hidden="true"
      class="flex size-7 shrink-0 items-center justify-center rounded-full bg-muted text-[11px] font-semibold text-muted-foreground"
    >
      {{ requesterInitials }}
    </span>
    <div
      :class="[
        'flex min-w-0 max-w-[75%] flex-col max-[479px]:max-w-[88%]',
        message.type === 'agent' ? 'items-end' : 'items-start',
      ]"
    >
      <div
        :class="[
          'max-w-full rounded-xl px-3 py-2',
          message.type === 'agent'
            ? 'bg-bubble-agent text-bubble-agent-foreground'
            : 'bg-bubble-customer text-bubble-customer-foreground',
        ]"
      >
        <p data-testid="message-body" class="whitespace-pre-wrap break-words">{{ message.body }}</p>
      </div>
      <div class="mt-1 flex max-w-full items-center gap-1.5 text-xs text-muted-foreground">
        <span class="truncate">{{ message.authorName }}</span>
        <span aria-hidden="true">·</span>
        <time
          data-testid="message-time"
          class="shrink-0"
          :datetime="message.createdAt"
          :title="formatFull(message.createdAt)"
        >
          {{ formatClock(message.createdAt) }}
        </time>
        <template v-if="delivery">
          <span
            v-if="delivery === 'sending'"
            data-testid="delivery-status"
            data-status="sending"
            role="img"
            aria-label="Sending"
            class="flex shrink-0"
          >
            <Clock3 class="size-3.5" aria-hidden="true" />
          </span>
          <span
            v-else-if="delivery === 'sent'"
            data-testid="delivery-status"
            data-status="sent"
            role="img"
            aria-label="Sent"
            class="flex shrink-0"
          >
            <Check class="size-3.5" aria-hidden="true" />
          </span>
          <template v-else>
            <span data-testid="delivery-status" data-status="failed" class="flex shrink-0 items-center gap-1 text-destructive">
              <CircleAlert class="size-3.5" aria-hidden="true" />
              Failed
            </span>
            <button
              type="button"
              data-testid="message-retry"
              class="shrink-0 rounded px-1 font-medium text-primary underline-offset-2 hover:underline focus-ring"
              @click="$emit('retry', message.clientMessageId as string)"
            >
              Retry
            </button>
          </template>
        </template>
      </div>
    </div>
  </div>
</template>
