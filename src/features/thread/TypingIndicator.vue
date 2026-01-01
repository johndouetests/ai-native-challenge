<script setup lang="ts">
defineProps<{ author: string | null }>()
</script>

<template>
  <div class="h-6 shrink-0 px-4" aria-live="polite">
    <p v-if="author" data-testid="typing-indicator" class="flex items-center gap-1 text-xs text-muted-foreground">
      <span class="truncate">{{ author }} is typing</span>
      <span class="motion-reduce:hidden" aria-hidden="true">
        <span class="inline-block animate-[typing-dot_1.2s_infinite]">.</span>
        <span class="inline-block animate-[typing-dot_1.2s_0.2s_infinite]">.</span>
        <span class="inline-block animate-[typing-dot_1.2s_0.4s_infinite]">.</span>
      </span>
      <span class="hidden motion-reduce:inline">…</span>
    </p>
  </div>
</template>
