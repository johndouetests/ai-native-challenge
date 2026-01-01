import { useSyncExternalStore } from 'react'

export type ThemeChoice = 'light' | 'dark' | 'system'
export const THEME_STORAGE_KEY = 'deskline-theme'
const CHOICES: readonly ThemeChoice[] = ['light', 'dark', 'system']

interface ThemeState {
  choice: ThemeChoice
  resolved: 'light' | 'dark'
}

let systemDark = false
let state: ThemeState = { choice: 'system', resolved: 'light' }
const listeners = new Set<() => void>()

function readStored(): ThemeChoice {
  try {
    const value = localStorage.getItem(THEME_STORAGE_KEY)
    return CHOICES.includes(value as ThemeChoice) ? (value as ThemeChoice) : 'system'
  } catch {
    return 'system'
  }
}

function update(choice: ThemeChoice) {
  const resolved = choice === 'system' ? (systemDark ? 'dark' : 'light') : choice
  state = { choice, resolved }
  document.documentElement.classList.toggle('dark', resolved === 'dark')
  for (const listener of [...listeners]) listener()
}

export function initTheme(): void {
  const mql = window.matchMedia('(prefers-color-scheme: dark)')
  systemDark = mql.matches
  mql.addEventListener('change', (e) => {
    systemDark = e.matches
    update(state.choice)
  })
  update(readStored())
}

export function setTheme(next: ThemeChoice): void {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, next)
  } catch {
    // storage unavailable: the choice still applies for this session
  }
  update(next)
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function useTheme(): ThemeState {
  return useSyncExternalStore(subscribe, () => state)
}
