<script setup lang="ts">
import { Circle } from 'lucide-vue-next'
import { DropdownMenuItemIndicator, DropdownMenuRadioItem, type DropdownMenuRadioItemProps } from 'reka-ui'
import type { HTMLAttributes } from 'vue'
import { cn } from '@/lib/utils'

const props = defineProps<DropdownMenuRadioItemProps & { class?: HTMLAttributes['class'] }>()
</script>

<template>
  <DropdownMenuRadioItem
    :value="props.value"
    :class="
      cn(
        'relative flex min-h-10 cursor-default select-none items-center gap-2 rounded-md py-1.5 pl-8 pr-2 text-sm outline-none data-[highlighted]:bg-muted md:min-h-8',
        props.class,
      )
    "
  >
    <span class="absolute left-2 flex size-4 items-center justify-center">
      <DropdownMenuItemIndicator>
        <Circle class="size-2 fill-current" aria-hidden="true" />
      </DropdownMenuItemIndicator>
    </span>
    <slot />
  </DropdownMenuRadioItem>
</template>
