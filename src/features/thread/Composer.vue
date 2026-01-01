<script setup lang="ts">
import { SendHorizontal } from 'lucide-vue-next'
import { computed, nextTick, reactive, ref, watch } from 'vue'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { clearDraft, getDraft, setDraft } from './drafts'

const props = defineProps<{
  ticketId: string
  closed: boolean
  disabled?: boolean
  send: (body: string) => Promise<boolean>
}>()
const emit = defineEmits<{ reopen: [] }>()

const MAX_LENGTH = 4000
const COUNTER_FROM = 3800
const MAX_ROWS = 6
const LINE_HEIGHT_PX = 20
const VERTICAL_PADDING_PX = 16

const textarea = ref<InstanceType<typeof Textarea> | null>(null)
// Tickets with a reply in flight: Send stays disabled until the server responds.
const inFlight = reactive(new Set<string>())

const text = computed({
  get: () => getDraft(props.ticketId),
  set: (value: string) => setDraft(props.ticketId, value),
})
const length = computed(() => text.value.length)
const canSend = computed(
  () => !props.closed && !props.disabled && !inFlight.has(props.ticketId) && text.value.trim().length > 0 && length.value <= MAX_LENGTH,
)

function resize() {
  const el = textarea.value?.el
  if (!el) return
  const border = el.offsetHeight - el.clientHeight
  el.style.height = 'auto'
  const content = el.scrollHeight
  const max = MAX_ROWS * LINE_HEIGHT_PX + VERTICAL_PADDING_PX
  el.style.height = `${Math.min(content, max) + border}px`
  el.style.overflowY = content > max ? 'auto' : 'hidden'
}

watch(
  () => [props.ticketId, text.value],
  () => void nextTick(resize),
  { immediate: true },
)

async function submit() {
  if (!canSend.value) return
  const ticketId = props.ticketId
  const body = text.value
  inFlight.add(ticketId)
  try {
    const ok = await props.send(body)
    if (ok && getDraft(ticketId) === body) clearDraft(ticketId)
  } finally {
    inFlight.delete(ticketId)
  }
}

function onKeydown(event: KeyboardEvent) {
  if (event.key !== 'Enter' || event.shiftKey) return
  event.preventDefault()
  void submit()
}
</script>

<template>
  <div data-testid="composer" class="shrink-0 border-t border-border bg-card px-4 py-3">
    <div
      v-if="closed"
      data-testid="ticket-closed-notice"
      class="mb-3 flex items-center justify-between gap-3 rounded-lg bg-muted px-3 py-2 text-sm text-foreground"
    >
      <span>This ticket is closed</span>
      <Button id="reopen-button" size="sm" variant="outline" data-testid="reopen-button" @click="emit('reopen')">
        Reopen
      </Button>
    </div>
    <form class="flex items-end gap-2" @submit.prevent="submit">
      <label for="composer-input" class="sr-only">Reply</label>
      <Textarea
        id="composer-input"
        ref="textarea"
        v-model="text"
        data-testid="composer-input"
        rows="1"
        :maxlength="MAX_LENGTH"
        :disabled="closed || disabled"
        :placeholder="closed ? 'Reopen the ticket to reply' : 'Write a reply…'"
        class="min-h-10 bg-white leading-5"
        @keydown="onKeydown"
      />
      <Button type="submit" size="icon" data-testid="send-button" :disabled="!canSend">
        <SendHorizontal aria-hidden="true" />
      </Button>
    </form>
    <p
      v-if="length >= COUNTER_FROM"
      data-testid="char-counter"
      :data-at-limit="length >= MAX_LENGTH ? 'true' : 'false'"
      :class="['mt-1 text-right text-xs', length >= MAX_LENGTH ? 'font-medium text-destructive' : 'text-muted-foreground']"
    >
      {{ length }} / {{ MAX_LENGTH }}
    </p>
  </div>
</template>
