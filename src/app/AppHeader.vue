<script setup lang="ts">
import { Inbox } from 'lucide-vue-next'
import AgentMenu from './AgentMenu.vue'
import ConnectionIndicator from './ConnectionIndicator.vue'
import ThemeToggle from './ThemeToggle.vue'
</script>

<template>
  <header
    data-testid="app-header"
    class="sticky top-0 z-[var(--z-header)] flex h-14 shrink-0 items-center gap-2 border-b border-border bg-card px-3 sm:px-4"
  >
    <RouterLink
      to="/tickets"
      data-testid="logo"
      class="flex h-10 min-w-0 items-center gap-2 rounded-lg font-semibold text-foreground focus-ring"
      aria-label="Deskline inbox"
    >
      <span class="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
        <Inbox class="size-4" aria-hidden="true" />
      </span>
      <span class="truncate text-base max-[379px]:sr-only">Deskline</span>
    </RouterLink>
    <div class="ml-auto flex shrink-0 items-center gap-1 sm:gap-2">
      <ConnectionIndicator />
      <ThemeToggle />
      <AgentMenu />
    </div>
  </header>
</template>
