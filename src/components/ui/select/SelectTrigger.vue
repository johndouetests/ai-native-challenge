<script setup lang="ts">
import { ChevronDown } from 'lucide-vue-next'
import { SelectIcon, SelectTrigger, type SelectTriggerProps } from 'reka-ui'
import type { HTMLAttributes } from 'vue'
import { cn } from '@/lib/utils'

const props = defineProps<SelectTriggerProps & { class?: HTMLAttributes['class'] }>()
</script>

<template>
  <SelectTrigger
    :disabled="props.disabled"
    :class="
      cn(
        'inline-flex h-10 min-w-0 items-center justify-between gap-2 rounded-lg border border-border bg-card px-3 text-sm text-foreground focus-ring disabled:cursor-not-allowed disabled:opacity-50 data-[placeholder]:text-muted-foreground md:h-9 [&>span]:truncate',
        props.class,
      )
    "
  >
    <slot />
    <SelectIcon as-child>
      <ChevronDown class="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
    </SelectIcon>
  </SelectTrigger>
</template>
