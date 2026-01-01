<script setup lang="ts">
import { SelectContent, SelectPortal, SelectViewport, type SelectContentProps } from 'reka-ui'
import type { HTMLAttributes } from 'vue'
import { cn } from '@/lib/utils'

const props = withDefaults(defineProps<SelectContentProps & { class?: HTMLAttributes['class'] }>(), {
  position: 'popper',
  sideOffset: 4,
})

defineOptions({ inheritAttrs: false })
</script>

<template>
  <SelectPortal>
    <SelectContent
      v-bind="$attrs"
      :position="props.position"
      :side-offset="props.sideOffset"
      :align="props.align"
      :class="
        cn(
          'relative z-[var(--z-dropdown)] max-h-[min(320px,var(--reka-select-content-available-height))] min-w-[var(--reka-select-trigger-width)] overflow-hidden rounded-lg border border-border bg-card text-foreground shadow-lg',
          props.class,
        )
      "
    >
      <SelectViewport class="p-1">
        <slot />
      </SelectViewport>
    </SelectContent>
  </SelectPortal>
</template>
