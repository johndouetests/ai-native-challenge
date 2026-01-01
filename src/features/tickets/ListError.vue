<script setup lang="ts">
import { CircleAlert } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'

defineEmits<{ retry: [] }>()
</script>

<template>
  <div data-testid="list-error" role="alert" class="flex flex-col items-center gap-3 px-6 py-16 text-center">
    <CircleAlert class="size-6 text-destructive" aria-hidden="true" />
    <p class="text-sm font-medium text-foreground">Couldn’t load tickets</p>
    <Button variant="outline" data-testid="retry-button" @click="$emit('retry')">Retry</Button>
  </div>
</template>
