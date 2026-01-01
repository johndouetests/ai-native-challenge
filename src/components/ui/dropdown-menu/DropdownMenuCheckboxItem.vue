<script setup lang="ts">
import { Check } from 'lucide-vue-next'
import { DropdownMenuCheckboxItem, DropdownMenuItemIndicator } from 'reka-ui'
import type { HTMLAttributes } from 'vue'
import { cn } from '@/lib/utils'

const props = defineProps<{ modelValue?: boolean; class?: HTMLAttributes['class'] }>()
const emit = defineEmits<{ 'update:modelValue': [value: boolean] }>()
</script>

<template>
  <DropdownMenuCheckboxItem
    :model-value="props.modelValue"
    :class="
      cn(
        'relative flex min-h-10 cursor-default select-none items-center gap-2 rounded-md py-1.5 pl-8 pr-2 text-sm outline-none data-[highlighted]:bg-muted md:min-h-8',
        props.class,
      )
    "
    @update:model-value="(v: boolean) => emit('update:modelValue', v)"
  >
    <span class="absolute left-2 flex size-4 items-center justify-center">
      <DropdownMenuItemIndicator>
        <Check class="size-4" aria-hidden="true" />
      </DropdownMenuItemIndicator>
    </span>
    <slot />
  </DropdownMenuCheckboxItem>
</template>
