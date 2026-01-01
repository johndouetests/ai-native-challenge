import { useSyncExternalStore } from 'react'
import { request } from '@/lib/api'
import type { Agent } from '@/lib/types'

export interface Directory {
  me: Agent | null
  agents: Agent[]
}

let state: Directory = { me: null, agents: [] }
const listeners = new Set<() => void>()
let loading: Promise<void> | null = null

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

function getSnapshot(): Directory {
  return state
}

/** Current agent and the agent list, loaded once per app. */
export function loadDirectory(): Promise<void> {
  if (!loading) {
    loading = Promise.all([request<Agent>('/me'), request<{ items: Agent[] }>('/agents')])
      .then(([me, agents]) => {
        state = { me, agents: agents.items }
        for (const listener of [...listeners]) listener()
      })
      .catch(() => {
        loading = null
        setTimeout(() => void loadDirectory(), 3000)
      })
  }
  return loading
}

export function useDirectory(): Directory {
  return useSyncExternalStore(subscribe, getSnapshot)
}

export function findAgent(directory: Directory, id: string | null): Agent | undefined {
  return id ? directory.agents.find((a) => a.id === id) : undefined
}
