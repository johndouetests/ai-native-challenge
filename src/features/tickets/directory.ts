import { reactive } from 'vue'
import { request } from '@/lib/api'
import type { Agent } from '@/lib/types'

const state = reactive({
  me: null as Agent | null,
  agents: [] as Agent[],
})

let loading: Promise<void> | null = null

/** Current agent and the agent list, loaded once per app. */
export function loadDirectory(): Promise<void> {
  if (!loading) {
    loading = Promise.all([request<Agent>('/me'), request<{ items: Agent[] }>('/agents')])
      .then(([me, agents]) => {
        state.me = me
        state.agents = agents.items
      })
      .catch(() => {
        loading = null
        setTimeout(() => void loadDirectory(), 3000)
      })
  }
  return loading
}

export function useDirectory() {
  return state
}

export function agentById(id: string | null): Agent | undefined {
  return id ? state.agents.find((a) => a.id === id) : undefined
}
