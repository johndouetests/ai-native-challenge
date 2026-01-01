<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { cn } from '@/lib/utils'

const props = defineProps<{ class?: HTMLAttributes['class'] }>()
</script>

<template>
  <span
    :class="
      cn(
        'inline-flex h-5 shrink-0 items-center whitespace-nowrap rounded-full px-2 text-xs font-medium',
        props.class,
      )
    "
  >
    <slot />
  </span>
</template>
