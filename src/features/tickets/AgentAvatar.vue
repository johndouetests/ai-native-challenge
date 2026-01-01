<script setup lang="ts">
import { UserRound } from 'lucide-vue-next'
import { computed } from 'vue'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import type { Agent, AgentColor } from '@/lib/types'
import { cn } from '@/lib/utils'

const props = withDefaults(
  defineProps<{
    agent: Agent | null | undefined
    /** md = 32px (list, header), sm = 28px (messages) */
    size?: 'md' | 'sm'
    unassigned?: boolean
  }>(),
  { size: 'md', unassigned: false },
)

const COLORS: Record<AgentColor, string> = {
  blue: 'bg-[var(--avatar-blue-bg)] text-[var(--avatar-blue-fg)]',
  violet: 'bg-[var(--avatar-violet-bg)] text-[var(--avatar-violet-fg)]',
  teal: 'bg-[var(--avatar-teal-bg)] text-[var(--avatar-teal-fg)]',
  amber: 'bg-[var(--avatar-amber-bg)] text-[var(--avatar-amber-fg)]',
  rose: 'bg-[var(--avatar-rose-bg)] text-[var(--avatar-rose-fg)]',
  emerald: 'bg-[var(--avatar-emerald-bg)] text-[var(--avatar-emerald-fg)]',
  indigo: 'bg-[var(--avatar-indigo-bg)] text-[var(--avatar-indigo-fg)]',
  orange: 'bg-[var(--avatar-orange-bg)] text-[var(--avatar-orange-fg)]',
}

const sizeClass = computed(() => (props.size === 'sm' ? 'size-7' : 'size-8'))
</script>

<template>
  <span
    v-if="unassigned"
    :class="
      cn(
        'flex shrink-0 items-center justify-center rounded-full border border-dashed border-muted-foreground text-muted-foreground',
        sizeClass,
      )
    "
  >
    <UserRound class="size-4" aria-hidden="true" />
  </span>
  <Avatar v-else :class="sizeClass">
    <AvatarFallback :class="agent ? COLORS[agent.color] : 'bg-muted text-muted-foreground'">
      {{ agent?.initials ?? '' }}
    </AvatarFallback>
  </Avatar>
</template>
