<script setup lang="ts">
import { TooltipContent, TooltipPortal, type TooltipContentProps } from 'reka-ui'
import type { HTMLAttributes } from 'vue'
import { cn } from '@/lib/utils'

const props = withDefaults(defineProps<TooltipContentProps & { class?: HTMLAttributes['class'] }>(), {
  sideOffset: 6,
})

defineOptions({ inheritAttrs: false })
</script>

<template>
  <TooltipPortal>
    <TooltipContent
      v-bind="$attrs"
      :side="props.side"
      :side-offset="props.sideOffset"
      :align="props.align"
      :class="
        cn(
          'z-[var(--z-dropdown)] max-w-[min(90vw,420px)] break-words rounded-lg border border-border bg-card px-3 py-1.5 text-xs text-foreground shadow-md',
          props.class,
        )
      "
    >
      <slot />
    </TooltipContent>
  </TooltipPortal>
</template>
