<script setup lang="ts">
import { Inbox, SearchX } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'

defineProps<{ filtered: boolean }>()
defineEmits<{ clear: [] }>()
</script>

<template>
  <div
    data-testid="empty-state"
    :data-variant="filtered ? 'filtered' : 'inbox'"
    class="flex flex-col items-center gap-3 px-6 py-16 text-center"
  >
    <span class="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
      <SearchX v-if="filtered" class="size-6" aria-hidden="true" />
      <Inbox v-else class="size-6" aria-hidden="true" />
    </span>
    <template v-if="filtered">
      <p class="text-sm font-medium text-foreground">No tickets match your filters</p>
      <Button variant="outline" data-testid="clear-filters" @click="$emit('clear')">Clear filters</Button>
    </template>
    <p v-else class="text-sm font-medium text-foreground">Inbox is empty</p>
  </div>
</template>
