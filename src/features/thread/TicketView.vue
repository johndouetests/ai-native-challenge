<script setup lang="ts">
import { ArrowLeft, CircleAlert, SearchX } from 'lucide-vue-next'
import { computed, inject, ref, watchEffect } from 'vue'
import { useRoute } from 'vue-router'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { WIDE_LAYOUT_KEY } from '@/app/layout'
import { filtersToQuery, parseFilters } from '@/features/tickets/filters'
import Composer from './Composer.vue'
import MessageList from './MessageList.vue'
import TicketHeader from './TicketHeader.vue'
import TypingIndicator from './TypingIndicator.vue'
import { useTicketThread } from './useTicketThread'

const route = useRoute()
const isWide = inject(WIDE_LAYOUT_KEY, ref(true))
const ticketId = computed(() => String(route.params.id))
const listLink = computed(() => ({ name: 'tickets', query: filtersToQuery(parseFilters(route.query)) }))
const thread = useTicketThread(ticketId)
const { ticket, status, messages, prevCursor, loadingOlder, updating, typingAuthor } = thread

watchEffect(() => {
  document.title = ticket.value ? `${ticket.value.key} · ${ticket.value.subject} — Deskline` : 'Deskline'
})

function reopen() {
  void thread.update({ status: 'open' }, 'Ticket reopened')
}
</script>

<template>
  <section data-testid="ticket-view" class="flex h-full min-h-0 flex-col bg-background" aria-label="Ticket">
    <div v-if="!isWide" class="flex h-14 shrink-0 items-center border-b border-border bg-card px-2">
      <Button variant="ghost" as-child>
        <RouterLink :to="listLink" data-testid="back-button" aria-label="Back to tickets">
          <ArrowLeft aria-hidden="true" />
          Back
        </RouterLink>
      </Button>
    </div>

    <div
      v-if="status === 'not-found'"
      data-testid="ticket-not-found"
      class="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center"
    >
      <SearchX class="size-8 text-muted-foreground" aria-hidden="true" />
      <h2 class="text-lg font-semibold text-foreground">Ticket not found</h2>
      <RouterLink :to="listLink" data-testid="not-found-back" class="rounded text-sm font-medium text-primary underline-offset-4 hover:underline focus-ring">
        Back to inbox
      </RouterLink>
    </div>

    <div
      v-else-if="status === 'error'"
      data-testid="thread-error"
      role="alert"
      class="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center"
    >
      <CircleAlert class="size-8 text-destructive" aria-hidden="true" />
      <p class="text-sm font-medium text-foreground">Couldn’t load this ticket</p>
      <Button variant="outline" data-testid="thread-retry" @click="thread.reload">Retry</Button>
    </div>

    <template v-else>
      <TicketHeader v-if="ticket" :ticket="ticket" :updating="updating" :update="thread.update" />
      <div v-else data-testid="ticket-header-skeleton" class="shrink-0 space-y-3 border-b border-border bg-card px-4 py-3">
        <Skeleton class="h-4 w-40" />
        <Skeleton class="h-6 w-3/4" />
        <Skeleton class="h-4 w-56" />
        <div class="flex gap-2">
          <Skeleton class="h-9 w-[8.5rem]" />
          <Skeleton class="h-9 w-[8.5rem]" />
          <Skeleton class="h-9 w-[11rem]" />
        </div>
      </div>
      <MessageList
        :ticket-id="ticketId"
        :messages="messages"
        :loading="status === 'loading'"
        :prev-cursor="prevCursor"
        :loading-older="loadingOlder"
        :load-older="thread.loadOlder"
        @retry="thread.retry"
      />
      <TypingIndicator :author="typingAuthor" />
      <Composer
        :ticket-id="ticketId"
        :closed="ticket?.status === 'closed'"
        :disabled="status !== 'ready'"
        :send="thread.send"
        @reopen="reopen"
      />
    </template>
  </section>
</template>
