<script setup lang="ts">
import { LoaderCircle } from 'lucide-vue-next'
import { computed } from 'vue'
import { useRealtime } from '@/features/realtime/useRealtime'

const { state } = useRealtime()

const LABELS = { live: 'Live', reconnecting: 'Reconnecting', offline: 'Offline' } as const
const label = computed(() => LABELS[state.value])
</script>

<template>
  <div
    data-testid="connection-indicator"
    :data-state="state"
    role="status"
    :aria-label="`Connection: ${label}`"
    class="flex h-8 items-center gap-1.5 rounded-full border border-border px-2.5 text-xs font-medium text-foreground"
  >
    <span
      aria-hidden="true"
      :class="[
        'size-2 shrink-0 rounded-full',
        state === 'live' && 'bg-connection-live',
        state === 'reconnecting' && 'bg-connection-reconnecting',
        state === 'offline' && 'bg-connection-offline',
      ]"
    />
    <LoaderCircle
      v-if="state === 'reconnecting'"
      class="size-3.5 shrink-0 animate-spin text-muted-foreground"
      aria-hidden="true"
    />
    <span>{{ label }}</span>
  </div>
</template>
