<script setup lang="ts">
import { computed } from 'vue'
import AgentAvatar from './AgentAvatar.vue'
import { agentById } from './directory'

const props = defineProps<{ assigneeId: string | null }>()
const agent = computed(() => agentById(props.assigneeId))
const label = computed(() =>
  props.assigneeId === null ? 'Unassigned' : `Assigned to ${agent.value?.name ?? props.assigneeId}`,
)
</script>

<template>
  <span
    data-testid="assignee-avatar"
    :data-assignee="assigneeId ?? 'unassigned'"
    role="img"
    :aria-label="label"
    :title="label"
    class="flex shrink-0"
  >
    <AgentAvatar :agent="agent" :unassigned="assigneeId === null" aria-hidden="true" />
  </span>
</template>
