<script setup lang="ts">
import { computed, provide } from 'vue'
import { useRoute } from 'vue-router'
import { useMediaQuery } from '@/lib/media'
import TicketListPane from '@/features/tickets/TicketListPane.vue'
import { WIDE_LAYOUT_KEY } from './layout'

const route = useRoute()
const isWide = useMediaQuery('(min-width: 1024px)')
provide(WIDE_LAYOUT_KEY, isWide)
const ticketOpen = computed(() => route.name === 'ticket')
</script>

<template>
  <div class="flex h-full min-h-0">
    <TicketListPane
      v-if="isWide || !ticketOpen"
      :wide="isWide"
      class="w-full min-w-0 lg:w-[var(--list-width)] lg:shrink-0 lg:border-r lg:border-border"
    />
    <div v-if="isWide || ticketOpen" class="h-full min-w-0 flex-1">
      <RouterView />
    </div>
  </div>
</template>
