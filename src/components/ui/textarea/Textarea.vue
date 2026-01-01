<script setup lang="ts">
import { ref, type HTMLAttributes } from 'vue'
import { cn } from '@/lib/utils'

const props = defineProps<{ class?: HTMLAttributes['class'] }>()
const model = defineModel<string>({ default: '' })
const el = ref<HTMLTextAreaElement | null>(null)
defineExpose({ el })
</script>

<template>
  <textarea
    ref="el"
    v-model="model"
    :class="
      cn(
        'w-full min-w-0 resize-none rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-ring disabled:cursor-not-allowed disabled:opacity-50',
        props.class,
      )
    "
  />
</template>
