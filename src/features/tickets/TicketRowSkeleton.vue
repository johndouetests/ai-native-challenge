<script setup lang="ts">
import { Skeleton } from '@/components/ui/skeleton'
</script>

<template>
  <div
    data-testid="list-skeleton-row"
    class="flex min-h-[var(--row-min-height)] items-center gap-2 border-b border-l-2 border-b-border border-l-transparent px-4 py-3"
  >
    <span class="w-2 shrink-0" />
    <span class="flex min-w-0 flex-1 flex-col gap-1">
      <span class="flex h-5 items-center gap-2">
        <Skeleton class="h-3 w-16" />
        <Skeleton class="h-3.5 flex-1" />
        <Skeleton class="h-3 w-10" />
      </span>
      <span class="flex h-5 items-center gap-2">
        <Skeleton class="h-3 w-24" />
        <span class="flex-1" />
        <Skeleton class="h-5 w-14 rounded-full" />
        <Skeleton class="h-3 w-12" />
      </span>
    </span>
    <Skeleton class="size-8 shrink-0 rounded-full" />
  </div>
</template>
