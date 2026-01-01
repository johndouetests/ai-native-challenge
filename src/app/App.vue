<script setup lang="ts">
import { onBeforeUnmount, onMounted } from 'vue'
import { Toaster } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { realtime } from '@/features/realtime/realtimeClient'
import AppHeader from './AppHeader.vue'

onMounted(() => realtime.start())
onBeforeUnmount(() => realtime.stop())
</script>

<template>
  <TooltipProvider :delay-duration="300">
    <div class="flex h-dvh flex-col overflow-hidden">
      <AppHeader />
      <main class="min-h-0 flex-1">
        <RouterView />
      </main>
    </div>
    <Toaster />
  </TooltipProvider>
</template>
