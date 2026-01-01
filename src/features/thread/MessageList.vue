<script setup lang="ts">
import { ArrowDown, LoaderCircle } from 'lucide-vue-next'
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useNow } from '@/lib/now'
import { dayKey, formatDayLabel } from '@/lib/time'
import type { ThreadMessage } from '@/lib/types'
import { prefersReducedMotion } from '@/lib/utils'
import MessageBubble from './MessageBubble.vue'

export interface MessageListProps {
  ticketId: string
  messages: ThreadMessage[]
  loading: boolean
  prevCursor: string | null
  loadingOlder: boolean
  loadOlder: () => Promise<boolean>
}

const props = defineProps<MessageListProps>()
const emit = defineEmits<{ retry: [clientMessageId: string] }>()

const LOAD_OLDER_THRESHOLD_PX = 80
const STICK_TO_BOTTOM_PX = 120

const scroller = ref<HTMLElement | null>(null)
const content = ref<HTMLElement | null>(null)
const newCount = ref(0)
const now = useNow()

type Row = { kind: 'day'; key: string; label: string } | { kind: 'message'; key: string; message: ThreadMessage }

const rows = computed<Row[]>(() => {
  const result: Row[] = []
  let lastDay = ''
  for (const message of props.messages) {
    const day = dayKey(message.createdAt)
    if (day !== lastDay) {
      lastDay = day
      result.push({ kind: 'day', key: `day-${day}`, label: formatDayLabel(message.createdAt, now.value) })
    }
    result.push({ kind: 'message', key: message.clientMessageId ?? message.id, message })
  }
  return result
})

function distanceFromBottom(el: HTMLElement): number {
  return el.scrollHeight - el.scrollTop - el.clientHeight
}

function scrollToBottom(smooth: boolean) {
  const el = scroller.value
  if (!el) return
  el.scrollTo({ top: el.scrollHeight, behavior: smooth && !prefersReducedMotion() ? 'smooth' : 'auto' })
}

function showNewMessages() {
  newCount.value = 0
  scrollToBottom(true)
}

async function maybeLoadOlder() {
  const el = scroller.value
  if (!el || props.loading || !props.prevCursor || props.loadingOlder) return
  if (el.scrollTop > LOAD_OLDER_THRESHOLD_PX) return
  // Keep the message at the top edge in place: compensate for the height added above it.
  const previousTop = el.scrollTop
  const loaded = await props.loadOlder()
  if (!loaded) return
  await nextTick()
  const previousHeight = el.scrollHeight
  el.scrollTop = el.scrollHeight - previousHeight + previousTop
  void maybeLoadOlder()
}

// After the first page the thread stays pinned to the bottom while late layout changes (web font
// subsets, wrapping) settle, until the reader scrolls away or the next message arrives.
let pinned = false
let pinnedTop = 0

function pinToBottom() {
  scrollToBottom(false)
  pinned = true
  pinnedTop = scroller.value?.scrollTop ?? 0
}

const resizeObserver = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(() => pinned && pinToBottom())
watch(content, (el, old) => {
  if (old) resizeObserver?.unobserve(old)
  if (el) resizeObserver?.observe(el)
})
onBeforeUnmount(() => resizeObserver?.disconnect())

function onScroll() {
  const el = scroller.value
  if (!el) return
  if (el.scrollTop < pinnedTop - 1) pinned = false
  if (newCount.value > 0 && distanceFromBottom(el) <= STICK_TO_BOTTOM_PX) newCount.value = 0
  void maybeLoadOlder()
}

// First page: jump to the bottom after the DOM update, before paint.
watch(
  () => [props.ticketId, props.loading] as const,
  async ([, loading]) => {
    newCount.value = 0
    pinned = false
    if (loading) return
    await nextTick()
    pinToBottom()
    void maybeLoadOlder()
  },
  { flush: 'post', immediate: true },
)

// Appended messages: follow them when the reader is near the bottom, otherwise count them.
watch(
  () => props.messages[props.messages.length - 1],
  (last, previous) => {
    const el = scroller.value
    if (!el || props.loading || !last || !previous || last === previous) return
    pinned = false
    const lastKey = last.clientMessageId ?? last.id
    const previousKey = previous.clientMessageId ?? previous.id
    if (lastKey === previousKey) return
    const previousIndex = props.messages.findIndex((m) => (m.clientMessageId ?? m.id) === previousKey)
    if (previousIndex === -1) return
    const added = props.messages.length - 1 - previousIndex
    const ownSend = last.delivery === 'sending'
    if (ownSend || distanceFromBottom(el) <= STICK_TO_BOTTOM_PX) {
      void nextTick(() => scrollToBottom(!ownSend))
    } else {
      newCount.value += added
    }
  },
)
</script>

<template>
  <div class="relative flex min-h-0 flex-1 flex-col">
    <div
      ref="scroller"
      data-testid="message-list"
      role="log"
      aria-label="Messages"
      tabindex="0"
      class="min-h-0 flex-1 overflow-y-auto px-4 py-2 [overflow-anchor:none] focus-visible:[outline-offset:-2px]"
      @scroll.passive="onScroll"
    >
      <div v-if="loading" class="flex flex-col gap-4 py-4" aria-busy="true" aria-label="Loading messages" role="status">
        <div
          v-for="n in 5"
          :key="n"
          data-testid="message-skeleton"
          :class="['flex items-end gap-2', n % 2 === 0 ? 'flex-row-reverse' : '']"
        >
          <Skeleton class="size-7 shrink-0 rounded-full" />
          <Skeleton :class="['h-14 rounded-xl', n % 2 === 0 ? 'w-1/2' : 'w-2/3']" />
        </div>
      </div>
      <template v-else>
        <div class="flex h-8 items-center justify-center text-xs text-muted-foreground">
          <p v-if="!prevCursor" data-testid="conversation-start">Beginning of conversation</p>
          <p v-else-if="loadingOlder" data-testid="loading-older" class="flex items-center gap-2">
            <LoaderCircle class="size-3.5 animate-spin" aria-hidden="true" />
            Loading earlier messages
          </p>
        </div>
        <div ref="content" class="flex flex-col gap-3 pb-2">
          <template v-for="row in rows" :key="row.key">
            <div
              v-if="row.kind === 'day'"
              data-testid="day-separator"
              class="flex items-center gap-3 py-1 text-xs font-medium text-muted-foreground"
            >
              <span class="h-px flex-1 bg-border" aria-hidden="true" />
              <span>{{ row.label }}</span>
              <span class="h-px flex-1 bg-border" aria-hidden="true" />
            </div>
            <MessageBubble v-else :message="row.message" @retry="(id: string) => emit('retry', id)" />
          </template>
        </div>
      </template>
    </div>
    <Button
      v-if="newCount > 0"
      data-testid="new-messages-button"
      size="sm"
      class="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full shadow-lg"
      @click="showNewMessages"
    >
      <ArrowDown aria-hidden="true" />
      {{ newCount }} new {{ newCount === 1 ? 'message' : 'messages' }}
    </Button>
  </div>
</template>
