<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { cn } from '@/lib/utils'

const props = defineProps<{ class?: HTMLAttributes['class'] }>()
const model = defineModel<string>({ default: '' })
</script>

<template>
  <input
    v-model="model"
    :class="
      cn(
        'h-10 w-full min-w-0 rounded-lg border border-border bg-card px-3 text-sm text-foreground placeholder:text-muted-foreground focus-ring disabled:cursor-not-allowed disabled:opacity-50 md:h-9',
        props.class,
      )
    "
  />
</template>
