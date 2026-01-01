<script setup lang="ts">
import { MessagesSquare } from 'lucide-vue-next'
import { onMounted } from 'vue'

onMounted(() => {
  document.title = 'Inbox — Deskline'
})
</script>

<template>
  <div data-testid="ticket-placeholder" class="flex h-full flex-col items-center justify-center gap-3 bg-background p-6">
    <MessagesSquare class="size-8 text-muted-foreground" aria-hidden="true" />
    <p class="text-sm text-muted-foreground">Select a ticket</p>
  </div>
</template>
