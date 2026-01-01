<script setup lang="ts">
import { Toaster } from 'vue-sonner'
import 'vue-sonner/style.css'
</script>

<template>
  <Toaster
    position="bottom-right"
    :duration="4000"
    :toast-options="{
      class: 'deskline-toast',
    }"
    :style="{
      '--normal-bg': 'var(--card)',
      '--normal-text': 'var(--foreground)',
      '--normal-border': 'var(--border)',
      '--success-bg': 'var(--card)',
      '--success-text': 'var(--foreground)',
      '--success-border': 'var(--border)',
      '--error-bg': 'var(--card)',
      '--error-text': 'var(--foreground)',
      '--error-border': 'var(--destructive)',
      zIndex: 'var(--z-toast)',
      pointerEvents: 'auto',
    }"
  />
</template>
