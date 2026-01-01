<script setup lang="ts">
import { computed } from 'vue'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { useNow } from '@/lib/now'
import { formatFull, formatRelative } from '@/lib/time'

defineOptions({ inheritAttrs: false })

const props = defineProps<{ iso: string }>()
const now = useNow()
const text = computed(() => formatRelative(props.iso, now.value))
const full = computed(() => formatFull(props.iso))
</script>

<template>
  <Tooltip>
    <TooltipTrigger as-child>
      <time v-bind="$attrs" :datetime="iso" :aria-label="full" class="whitespace-nowrap">{{ text }}</time>
    </TooltipTrigger>
    <TooltipContent data-testid="time-tooltip">{{ full }}</TooltipContent>
  </Tooltip>
</template>
