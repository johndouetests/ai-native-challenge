<script setup lang="ts">
import { Check } from 'lucide-vue-next'
import { SelectItem, SelectItemIndicator, SelectItemText, type SelectItemProps } from 'reka-ui'
import type { HTMLAttributes } from 'vue'
import { cn } from '@/lib/utils'

const props = defineProps<SelectItemProps & { class?: HTMLAttributes['class'] }>()
</script>

<template>
  <SelectItem
    :value="props.value"
    :disabled="props.disabled"
    :text-value="props.textValue"
    :class="
      cn(
        'relative flex min-h-10 cursor-default select-none items-center gap-2 rounded-md py-1.5 pl-8 pr-3 text-sm outline-none data-[disabled]:pointer-events-none data-[highlighted]:bg-muted data-[disabled]:opacity-50 md:min-h-8',
        props.class,
      )
    "
  >
    <span class="absolute left-2 flex size-4 items-center justify-center">
      <SelectItemIndicator>
        <Check class="size-4" aria-hidden="true" />
      </SelectItemIndicator>
    </span>
    <SelectItemText>
      <slot />
    </SelectItemText>
  </SelectItem>
</template>
