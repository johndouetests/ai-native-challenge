<script setup lang="ts">
import { DropdownMenuContent, DropdownMenuPortal, type DropdownMenuContentProps } from 'reka-ui'
import type { HTMLAttributes } from 'vue'
import { cn } from '@/lib/utils'

const props = withDefaults(defineProps<DropdownMenuContentProps & { class?: HTMLAttributes['class'] }>(), {
  sideOffset: 4,
})

defineOptions({ inheritAttrs: false })
</script>

<template>
  <DropdownMenuPortal>
    <DropdownMenuContent
      v-bind="$attrs"
      :side-offset="props.sideOffset"
      :align="props.align"
      :class="
        cn(
          'z-[var(--z-dropdown)] min-w-44 overflow-hidden rounded-lg border border-border bg-card p-1 text-foreground shadow-lg',
          props.class,
        )
      "
    >
      <slot />
    </DropdownMenuContent>
  </DropdownMenuPortal>
</template>
