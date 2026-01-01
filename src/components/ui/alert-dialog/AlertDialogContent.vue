<script setup lang="ts">
import { AlertDialogContent, AlertDialogOverlay, AlertDialogPortal } from 'reka-ui'
import type { HTMLAttributes } from 'vue'
import { cn } from '@/lib/utils'

const props = defineProps<{ class?: HTMLAttributes['class'] }>()
const emit = defineEmits<{
  closeAutoFocus: [event: Event]
  escapeKeyDown: [event: KeyboardEvent]
  overlayClick: []
}>()

defineOptions({ inheritAttrs: false })
</script>

<template>
  <AlertDialogPortal>
    <AlertDialogOverlay class="absolute inset-0 z-[var(--z-dialog)] bg-overlay" @click="emit('overlayClick')" />
    <AlertDialogContent
      v-bind="$attrs"
      :class="
        cn(
          'absolute left-1/2 top-1/2 z-[var(--z-dialog)] grid w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 gap-4 rounded-lg border border-border bg-card p-6 text-foreground shadow-xl',
          props.class,
        )
      "
      @close-auto-focus="(e: Event) => emit('closeAutoFocus', e)"
      @escape-key-down="(e: KeyboardEvent) => emit('escapeKeyDown', e)"
    >
      <slot />
    </AlertDialogContent>
  </AlertDialogPortal>
</template>
