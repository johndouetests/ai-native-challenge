<script setup lang="ts">
import { DropdownMenuItem, type DropdownMenuItemProps } from 'reka-ui'
import type { HTMLAttributes } from 'vue'
import { cn } from '@/lib/utils'

const props = defineProps<DropdownMenuItemProps & { class?: HTMLAttributes['class'] }>()
</script>

<template>
  <DropdownMenuItem
    :disabled="props.disabled"
    :class="
      cn(
        'relative flex min-h-10 cursor-default select-none items-center gap-2 rounded-md px-2 py-1.5 text-sm outline-none data-[disabled]:pointer-events-none data-[highlighted]:bg-muted data-[disabled]:opacity-50 md:min-h-8',
        props.class,
      )
    "
  >
    <slot />
  </DropdownMenuItem>
</template>
