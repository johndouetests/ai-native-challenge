<script setup lang="ts">
import { AvatarFallback } from 'reka-ui'
import type { HTMLAttributes } from 'vue'
import { cn } from '@/lib/utils'

const props = defineProps<{ class?: HTMLAttributes['class'] }>()
</script>

<template>
  <AvatarFallback
    :class="cn('flex size-full items-center justify-center rounded-full text-xs font-semibold', props.class)"
  >
    <slot />
  </AvatarFallback>
</template>
