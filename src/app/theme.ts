import { computed, ref } from 'vue'

export type ThemeChoice = 'light' | 'dark' | 'system'
export const THEME_STORAGE_KEY = 'deskline-theme'
const CHOICES: readonly ThemeChoice[] = ['light', 'dark', 'system']

function readStored(): ThemeChoice {
  try {
    const value = localStorage.getItem(THEME_STORAGE_KEY)
    return CHOICES.includes(value as ThemeChoice) ? (value as ThemeChoice) : 'system'
  } catch {
    return 'system'
  }
}

const choice = ref<ThemeChoice>('system')
const systemDark = ref(false)
const resolved = computed<'light' | 'dark'>(() =>
  choice.value === 'system' ? (systemDark.value ? 'dark' : 'light') : choice.value,
)

function apply() {
  document.documentElement.classList.toggle('dark', resolved.value === 'dark')
}

export function initTheme(): void {
  choice.value = readStored()
  const mql = window.matchMedia('(prefers-color-scheme: dark)')
  systemDark.value = mql.matches
  mql.addEventListener('change', (e) => {
    systemDark.value = e.matches
    apply()
  })
  apply()
}

export function useTheme() {
  return {
    choice,
    resolved,
    setTheme(next: ThemeChoice) {
      choice.value = next
      try {
        localStorage.setItem(THEME_STORAGE_KEY, next)
      } catch {
        // storage unavailable: the choice still applies for this session
      }
      apply()
    },
  }
}
