<script setup lang="ts">
import { LoaderCircle } from 'lucide-vue-next'
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Button } from '@/components/ui/button'
import EmptyState from './EmptyState.vue'
import { compareTickets, filtersKey, filtersToQuery, hasActiveFilters, parseFilters, type TicketFilters as Filters } from './filters'
import { inbox } from './inbox'
import ListError from './ListError.vue'
import TicketFilters from './TicketFilters.vue'
import TicketRow from './TicketRow.vue'
import TicketRowSkeleton from './TicketRowSkeleton.vue'
import { useTicketList } from './useTicketList'

const props = defineProps<{ wide: boolean }>()

const route = useRoute()
const router = useRouter()
const filters = computed(() => parseFilters(route.query))
const listQuery = computed(() => filtersToQuery(filters.value) as typeof route.query)
const { items, nextCursor, status, loadingMore, loadMoreFailed, reload, loadMore } = useTicketList(filters)
const selectedId = computed(() => (props.wide && route.name === 'ticket' ? String(route.params.id) : null))
const scroller = ref<HTMLElement | null>(null)

watch(
  () => filtersKey(filters.value),
  () => {
    if (scroller.value) scroller.value.scrollTop = 0
  },
)

function changeFilters(next: Filters) {
  void router.push({ name: route.name ?? 'tickets', params: route.params, query: filtersToQuery(next) })
}

function clearFilters() {
  changeFilters({ status: [], priority: [], assignee: null, q: '', sort: filters.value.sort })
}

const search = ref(filters.value.q)
</script>

<template>
  <section aria-labelledby="inbox-title" data-testid="ticket-list-pane" class="flex h-full min-h-0 flex-col bg-card">
    <div class="shrink-0 space-y-3 border-b border-border px-4 pb-3 pt-4">
      <h1 id="inbox-title" data-testid="inbox-title" class="text-lg font-semibold text-foreground">
        Inbox<template v-if="inbox.state.unreadCount !== null">
          · <span data-testid="unread-count">{{ inbox.state.unreadCount }}</span> unread</template
        >
      </h1>
      <TicketFilters v-model:search="search" :filters="filters" @change="changeFilters" />
    </div>
    <div ref="scroller" data-testid="ticket-list" class="min-h-0 flex-1 overflow-y-auto">
      <div v-if="status === 'loading'" aria-busy="true" aria-label="Loading tickets" role="status">
        <TicketRowSkeleton v-for="n in 8" :key="n" />
      </div>
      <ListError v-else-if="status === 'error'" @retry="reload" />
      <EmptyState v-else-if="items.length === 0" :filtered="hasActiveFilters(filters)" @clear="clearFilters" />
      <template v-else>
        <ul aria-label="Tickets">
          <li
            v-for="ticket in [...items].sort((a, b) => compareTickets(a, b, filters.sort))"
            :key="ticket.id"
            class="[contain-intrinsic-size:auto_72px] [content-visibility:auto]"
          >
            <TicketRow :ticket="ticket" :selected="ticket.id === selectedId" :query="{ ...listQuery }" />
          </li>
        </ul>
        <div v-if="nextCursor || loadMoreFailed" class="flex flex-col items-center gap-2 px-4 py-4">
          <p v-if="loadMoreFailed" data-testid="load-more-error" role="alert" class="text-sm text-destructive">
            Couldn’t load more tickets
          </p>
          <Button
            v-if="nextCursor"
            variant="outline"
            data-testid="load-more"
            :disabled="loadingMore"
            :aria-busy="loadingMore"
            @click="loadMore"
          >
            <LoaderCircle v-if="loadingMore" data-testid="load-more-spinner" class="animate-spin" aria-hidden="true" />
            Load more
          </Button>
        </div>
      </template>
    </div>
  </section>
</template>
